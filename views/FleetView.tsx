import React, { useEffect, useState } from 'react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, topUpMTag } from '../services/api';
import { Vehicle, VehicleStatus } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons';
import { STATUS_COLORS, VEHICLE_TYPES, formatCurrency } from '../constants';

const FleetView: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Vehicle Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Top Up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | ''>('');
  const [topUpVehicle, setTopUpVehicle] = useState<Vehicle | null>(null);

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

  const handleSaveVehicle = async (formData: Omit<Vehicle, 'id' | 'tenant_id'>) => {
    if (selectedVehicle) {
      await updateVehicle(selectedVehicle.id, formData);
    } else {
      await createVehicle(formData);
    }
    fetchVehicles();
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vehicle? All related maintenance and records will be affected.")) return;
    try {
      await deleteVehicle(id);
      fetchVehicles();
    } catch (error) {
      alert("Failed to delete vehicle. Make sure it has no active rentals or trips.");
    }
  };

  const openTopUp = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    setTopUpVehicle(vehicle);
    setTopUpAmount('');
    setIsTopUpOpen(true);
  }

  const handleTopUp = async () => {
    if (!topUpVehicle || !topUpAmount) return;
    try {
      await topUpMTag(topUpVehicle.id, Number(topUpAmount));
      setIsTopUpOpen(false);
      setTopUpVehicle(null);
      fetchVehicles(); // Refresh data
    } catch (e) {
      alert("Top up failed");
    }
  }

  const filteredVehicles = vehicles.filter(v =>
    v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Fleet...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm rounded-lg px-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Fleet</h1>
          <p className="text-sm text-slate-500">{vehicles.length} Vehicles Managed</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-blue-600 cursor-pointer text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
        >
          <PlusIcon className="mr-2" /> Add Vehicle
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by plate, type..."
          className="w-full p-4 pl-12 rounded-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-4 text-slate-400">🔍</span>
      </div>

      {/* Card Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredVehicles.map(vehicle => (
          <div key={vehicle.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition relative group pt-8">
            <div className="absolute top-2 right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition px-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenModal(vehicle); }}
                className="p-1.5 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit"
              >
                ✎
              </button>
              {/* <button
                onClick={(e) => { e.stopPropagation(); handleDelete(vehicle.id); }}
                className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete"
              >
                🗑
              </button> */}
            </div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-mono font-bold text-lg text-indigo-700">{vehicle.license_plate}</h3>
                <p className="text-xs font-bold uppercase text-slate-400 mt-1">
                  {vehicle.make_model} {vehicle.year && `(${vehicle.year})`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-400">{vehicle.type}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[vehicle.status]}`}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex gap-1.5">
                  {vehicle.insurance_expiry && (
                    <span
                      title={`Insurance Exp: ${new Date(vehicle.insurance_expiry).toLocaleDateString()}`}
                      className={`w-2 h-2 rounded-full ${(new Date(vehicle.insurance_expiry).getTime() - new Date().getTime()) / 86400000 < 15 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
                    ></span>
                  )}
                  {vehicle.token_tax_expiry && (
                    <span
                      title={`Token Tax Exp: ${new Date(vehicle.token_tax_expiry).toLocaleDateString()}`}
                      className={`w-2 h-2 rounded-full ${(new Date(vehicle.token_tax_expiry).getTime() - new Date().getTime()) / 86400000 < 15 ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'}`}
                    ></span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
              <div>
                <p className="text-xs text-slate-400">M-Tag Balance</p>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-lg ${(vehicle.m_tag_balance || 0) < 500 ? 'text-red-500' : 'text-slate-700'}`}>
                    {formatCurrency(vehicle.m_tag_balance || 0)}
                  </span>
                  <button onClick={(e) => openTopUp(e, vehicle)} className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium cursor-pointer transition">
                    + Add
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Maintained</p>
                  <p className="text-sm font-medium text-slate-600">{new Date(vehicle.last_maintenance_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredVehicles.length === 0 && (
          <div className="text-center py-12 text-slate-400 col-span-full">
            <p>No vehicles found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal - Mobile Friendly Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleCloseModal}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold">{selectedVehicle ? 'Edit Vehicle' : 'New Vehicle'}</h2>
              <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
            </div>
            <div className="p-6">
              <VehicleForm
                vehicle={selectedVehicle}
                onSave={handleSaveVehicle}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {
        isTopUpOpen && topUpVehicle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsTopUpOpen(false)}>
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-2 text-slate-800">Top Up M-Tag</h3>
              <div className="p-2.5 bg-blue-50 rounded-lg mb-6">
                <p className="text-xs text-blue-600 uppercase font-bold mb-1">Vehicle</p>
                <p className="font-mono font-bold text-blue-900 text-lg">{topUpVehicle.license_plate}</p>
                <p className="text-blue-700 text-sm">Current: {formatCurrency(topUpVehicle.m_tag_balance || 0)}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Amount to Add</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border-2 border-slate-200 rounded-xl font-mono text-2xl focus:border-blue-500 focus:ring-0 transition"
                  placeholder="1000"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(Math.max(0, Number(e.target.value)))}
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5">
                <button onClick={() => setIsTopUpOpen(false)} className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition cursor-pointer">Cancel</button>
                <button onClick={handleTopUp} disabled={!topUpAmount} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95 cursor-pointer">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

// Refactored Form Component
const VehicleForm: React.FC<{
  vehicle: Vehicle | null,
  onSave: (data: any) => void,
  onCancel: () => void
}> = ({ vehicle, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    license_plate: '',
    type: VEHICLE_TYPES[0],
    capacity: 0,
    status: VehicleStatus.Active,
    last_maintenance_date: new Date().toISOString().split('T')[0],
    make_model: '',
    year: new Date().getFullYear(),
    insurance_expiry: '',
    token_tax_expiry: ''
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        license_plate: vehicle.license_plate,
        type: vehicle.type,
        capacity: vehicle.capacity || 0,
        status: vehicle.status,
        last_maintenance_date: new Date(vehicle.last_maintenance_date).toISOString().split('T')[0],
        make_model: vehicle.make_model || '',
        year: vehicle.year || new Date().getFullYear(),
        insurance_expiry: vehicle.insurance_expiry || '',
        token_tax_expiry: vehicle.token_tax_expiry || ''
      });
    }
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'capacity' || name === 'year') ? Math.max(0, parseInt(value) || 0) : value }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">License Plate</label>
        <input type="text" name="license_plate" value={formData.license_plate} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Make & Model</label>
          <input name="make_model" value={formData.make_model} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" placeholder="e.g. Toyota Corolla" required />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Year</label>
          <input type="number" name="year" value={formData.year} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition">
            {VEHICLE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Capacity</label>
          <input type="number" name="capacity" min="0" value={formData.capacity} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Insurance Expiry</label>
          <input type="date" name="insurance_expiry" value={formData.insurance_expiry} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Token Tax Expiry</label>
          <input type="date" name="token_tax_expiry" value={formData.token_tax_expiry} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
        <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition">
          {Object.values(VehicleStatus).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      {vehicle && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Last Maintenance</label>
          <input type="date" name="last_maintenance_date" value={formData.last_maintenance_date} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" required />
        </div>
      )}
      <div className="pt-4">
        <button onClick={() => onSave(formData)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition cursor-pointer">
          {vehicle ? 'Save Changes' : 'Create Vehicle'}
        </button>
      </div>
    </div>
  );
}

export default FleetView;