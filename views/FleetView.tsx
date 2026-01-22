import React, { useEffect, useState } from 'react';
import { getVehicles, createVehicle, updateVehicle } from '../services/api';
import { Vehicle, VehicleStatus } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons';
import { STATUS_COLORS, VEHICLE_TYPES } from '../constants';

const FleetView: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenModal = (vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedVehicle(null);
    setIsModalOpen(false);
  };
  
  const handleSaveVehicle = async (formData: Omit<Vehicle, 'vehicleId' | 'tenantId'>) => {
    if (selectedVehicle) {
      await updateVehicle(selectedVehicle.vehicleId, formData);
    } else {
      await createVehicle(formData);
    }
    fetchVehicles();
    handleCloseModal();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Fleet Management</h1>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon />
          <span className="ml-2">Add Vehicle</span>
        </Button>
      </div>
      {loading ? (
        <p>Loading vehicles...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">License Plate</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Capacity</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Last Maintenance</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.vehicleId}>
                    <td className="p-4 font-mono font-medium text-indigo-600">{vehicle.licensePlate}</td>
                    <td className="p-4 text-slate-700">{vehicle.type}</td>
                    <td className="p-4 text-slate-700">{vehicle.capacity}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[vehicle.status]}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">{new Date(vehicle.lastMaintenanceDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenModal(vehicle)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <VehicleFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveVehicle}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Vehicle, 'vehicleId' | 'tenantId'>) => void;
  vehicle: Vehicle | null;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ isOpen, onClose, onSave, vehicle }) => {
  const [formData, setFormData] = useState({
    licensePlate: '',
    type: VEHICLE_TYPES[0],
    capacity: 0,
    status: VehicleStatus.Active,
    lastMaintenanceDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
        capacity: vehicle.capacity,
        status: vehicle.status,
        lastMaintenanceDate: new Date(vehicle.lastMaintenanceDate).toISOString().split('T')[0],
      });
    } else {
      setFormData({
        licensePlate: '',
        type: VEHICLE_TYPES[0],
        capacity: 0,
        status: VehicleStatus.Active,
        lastMaintenanceDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [vehicle, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'capacity' ? parseInt(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">License Plate</label>
          <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-slate-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-slate-900">
            {VEHICLE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Capacity</label>
          <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-slate-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-slate-900">
            {Object.values(VehicleStatus).map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Last Maintenance Date</label>
          <input type="date" name="lastMaintenanceDate" value={formData.lastMaintenanceDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-slate-900" required />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Vehicle</Button>
        </div>
      </form>
    </Modal>
  );
};

export default FleetView;