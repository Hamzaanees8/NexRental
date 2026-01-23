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

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ... fetch logic

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const [recordsData, vehiclesData] = await Promise.all([getMaintenanceHistory(), getVehicles()]);
      setRecords(recordsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

  const handleSaveRecord = async (formData: Omit<MaintenanceRecord, 'id' | 'tenant_id'>) => {
    await createMaintenanceRecord(formData);
    fetchMaintenanceData();
    setIsModalOpen(false);
  };

  const filteredRecords = records.filter(r => {
    const v = vehicles.find(veh => veh.id === r.vehicle_id);
    const search = searchTerm.toLowerCase();
    // Match against vehicle label, type or notes
    const vehicleMatch = v?.license_plate.toLowerCase().includes(search);
    const typeMatch = r.type.toLowerCase().includes(search);
    const notesMatch = r.notes?.toLowerCase()?.includes(search);
    return vehicleMatch || typeMatch || notesMatch;
  });

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Maintenance...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Maintenance</h1>
          <p className="text-sm text-slate-500">Track vehicle expenses and repairs</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
        >
          <PlusIcon className="mr-2" /> Add Record
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search expense, vehicle, notes..."
          className="w-full p-4 pl-12 rounded-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-4 text-slate-400">🔍</span>
      </div>

      {/* Cards List */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredRecords.map(r => {
          const vehicle = vehicles.find(v => v.id === r.vehicle_id);
          return (
            <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800">{vehicle?.license_plate || 'General'}</span>
                  <span className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase">{r.type}</span>
                </div>
                {r.notes && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg italic select-text">{r.notes}</p>}
              </div>
              <div className="mt-4 text-right border-t pt-2">
                <span className="font-mono text-xl font-bold text-red-600">{formatCurrency(r.cost)}</span>
              </div>
            </div>
          );
        })}
        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-slate-400 col-span-full">
            <p>No records found matching "{searchTerm}"</p>
          </div>
        )}
      </div>


      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Service Record</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <MaintenanceForm
                vehicles={vehicles}
                onSave={handleSaveRecord}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Refactored Form
const MaintenanceForm: React.FC<{
  vehicles: Vehicle[],
  onSave: (data: any) => void
}> = ({ vehicles, onSave }) => {
  const [formData, setFormData] = useState({
    vehicle_id: vehicles.length > 0 ? vehicles[0].id : '',
    type: MaintenanceType.Fuel,
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'cost' ? parseFloat(value) : value }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Vehicle</label>
        <select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition">
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} ({v.type})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition">
            {EXPENSE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Cost</label>
          <input type="number" name="cost" step="0.01" value={formData.cost} onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition font-mono" required placeholder="0.00" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition" required />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Description</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition" />
      </div>

      <div className="pt-4">
        <button onClick={() => onSave(formData)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition">
          Log Record
        </button>
      </div>
    </div>
  );
}

export default MaintenanceView;