import React, { useEffect, useState } from 'react';
import { getMaintenanceHistory, createMaintenanceRecord, getVehicles } from '../services/api';
import { MaintenanceRecord, Vehicle, MaintenanceType } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons';
import { EXPENSE_TYPES, formatCurrency } from '../constants';

const MaintenanceView: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const [recordsData, vehiclesData] = await Promise.all([getMaintenanceHistory(), getVehicles()]);
      setRecords(recordsData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Failed to fetch maintenance data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, []);
  
  const handleSaveRecord = async (formData: Omit<MaintenanceRecord, 'recordId' | 'tenantId'>) => {
    await createMaintenanceRecord(formData);
    fetchMaintenanceData();
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Maintenance & Expenses</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusIcon />
          <span className="ml-2">Add Record</span>
        </Button>
      </div>
      {loading ? (
        <p>Loading records...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Vehicle</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.recordId}>
                    <td className="p-4 text-slate-700">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="p-4 font-mono font-medium text-slate-800">{vehicles.find(v => v.vehicleId === r.vehicleId)?.licensePlate || 'General'}</td>
                    <td className="p-4 font-medium text-slate-800">{r.type}</td>
                    <td className="p-4 text-slate-600">{r.notes}</td>
                    <td className="p-4 text-right font-mono text-red-600">{formatCurrency(r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <MaintenanceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRecord}
        vehicles={vehicles}
      />
    </div>
  );
};


interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<MaintenanceRecord, 'recordId' | 'tenantId'>) => void;
  vehicles: Vehicle[];
}

const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({ isOpen, onClose, onSave, vehicles }) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: MaintenanceType.Fuel,
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
        setFormData({
            vehicleId: vehicles.length > 0 ? vehicles[0].vehicleId : '',
            type: MaintenanceType.Fuel,
            cost: 0,
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    }
  }, [isOpen, vehicles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'cost' ? parseFloat(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Maintenance/Expense Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle</label>
          <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required>
            {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.licensePlate} ({v.type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Record Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            {EXPENSE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Cost</label>
          <input type="number" name="cost" step="0.01" value={formData.cost} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Record</Button>
        </div>
      </form>
    </Modal>
  );
};

export default MaintenanceView;