import React, { useEffect, useState } from 'react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, updateMTagBalance, getTransactions, deleteMTagTransaction, editMTagTransaction, getMaintenanceHistory, recordMTagTopUp } from '../services/api';
import { Vehicle, VehicleStatus, TransactionType, MaintenanceRecord } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon } from '../components/icons';
import { STATUS_COLORS, VEHICLE_TYPES, formatCurrency } from '../constants';
import { calculateMaintenanceAlerts, MaintenanceAlert } from '../services/maintenanceAlerts';
import { checkDocumentStatus } from '../services/expiryAlerts';
import toast from 'react-hot-toast';

const FleetView: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
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
  const [mtagAction, setMtagAction] = useState<'add' | 'spend'>('add');
  const [mtagDate, setMtagDate] = useState(new Date().toISOString().split('T')[0]);
  const [mtagHistory, setMtagHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');

  // Delete Confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'vehicle' | 'mtag' | null;
    id: string | null;
    message?: string;
  }>({ isOpen: false, type: null, id: null });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const [vData, tData, mData] = await Promise.all([
        getVehicles(),
        getTransactions(),
        getMaintenanceHistory()
      ]);
      setVehicles(vData);
      setTransactions(tData);
      setMaintenanceRecords(mData);
      setMaintenanceAlerts(calculateMaintenanceAlerts(vData, mData));
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
    // Validation
    const plateRegex = /^[A-Z0-9- ]+$/i;
    if (!formData.license_plate || !plateRegex.test(formData.license_plate)) {
      toast.error("Please enter a valid license plate (Alphanumeric and dashes only)");
      return;
    }

    if (!formData.make_model || formData.make_model.trim().length < 3) {
      toast.error("Make and Model must be at least 3 characters long");
      return;
    }

    const currentYear = new Date().getFullYear();
    if (formData.year && (formData.year < 1950 || formData.year > currentYear + 1)) {
      toast.error(`Please enter a valid year (1950 - ${currentYear + 1})`);
      return;
    }

    if (formData.capacity <= 0) {
      toast.error("Capacity must be greater than 0");
      return;
    }

    if (selectedVehicle) {
      await updateVehicle(selectedVehicle.id, formData);
      toast.success("Vehicle updated");
    } else {
      await createVehicle(formData);
      toast.success("Vehicle added to fleet");
    }
    fetchVehicles();
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'vehicle',
      id,
      message: "Are you sure you want to delete this vehicle? All related maintenance and records will be affected."
    });
  };

  const onConfirmDelete = async () => {
    if (!deleteConfirmation.id) return;

    try {
      if (deleteConfirmation.type === 'vehicle') {
        await deleteVehicle(deleteConfirmation.id);
        toast.success("Vehicle removed from fleet");
        fetchVehicles();
      } else if (deleteConfirmation.type === 'mtag') {
        await deleteMTagTransaction(deleteConfirmation.id);
        toast.success("Transaction removed");
        await fetchVehicles();
        if (topUpVehicle) {
          setMtagHistory(prev => prev.filter(h => h.id !== deleteConfirmation.id));
        }
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const openTopUp = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    setTopUpVehicle(vehicle);
    setTopUpAmount('');
    setMtagAction('add');
    setMtagDate(new Date().toISOString().split('T')[0]);

    // Filter history for this vehicle
    const history = transactions
      .filter(t => t.vehicle_id === vehicle.id &&
        (t.type === TransactionType.MTagTopUp || t.type === TransactionType.MTagUsage))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    setMtagHistory(history);

    setIsTopUpOpen(true);
  }

  const handleTopUp = async () => {
    if (!topUpVehicle) return;
    if (!topUpAmount || Number(topUpAmount) <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }
    try {
      if (mtagAction === 'add') {
        await recordMTagTopUp(topUpVehicle.id, Number(topUpAmount), mtagDate);
      } else {
        await updateMTagBalance(topUpVehicle.id, Number(topUpAmount), TransactionType.MTagUsage, mtagDate);
      }
      toast.success(`M-Tag balance ${mtagAction === 'add' ? 'topped up' : 'adjusted'}`);
      setIsTopUpOpen(false);
      setTopUpVehicle(null);
      fetchVehicles(); // Refresh data
    } catch (e) {
      toast.error("Update failed");
    }
  }

  const handleDeleteMTagTx = (txId: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'mtag',
      id: txId,
      message: "Remove this transaction? This will also revert the vehicle's balance."
    });
  }

  const handleEditMTagTx = async (txId: string) => {
    try {
      await editMTagTransaction(txId, editAmount, editDate);
      setEditingTransactionId(null);
      await fetchVehicles();

      // Update local history display
      if (topUpVehicle) {
        setMtagHistory(prev => prev.map(h =>
          h.id === txId ? { ...h, amount: editAmount, date: editDate } : h
        ));
      }
    } catch (e) {
      toast.error("Edit failed");
    }
  }

  const filteredVehicles = vehicles.filter(v =>
    v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAlertsForVehicle = (vehicleId: string) => maintenanceAlerts.filter(a => a.vehicleId === vehicleId);

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
        {filteredVehicles.map(vehicle => {
          const vehicleAlerts = getAlertsForVehicle(vehicle.id);
          const hasOverdue = vehicleAlerts.some(a => a.status === 'overdue');
          const hasDueSoon = vehicleAlerts.some(a => a.status === 'due_soon');

          const insuranceStatus = checkDocumentStatus(vehicle.insurance_expiry);
          const tokenTaxStatus = checkDocumentStatus(vehicle.token_tax_expiry);
          const hasDocumentWarning = insuranceStatus !== 'valid' || tokenTaxStatus !== 'valid';

          return (
            <div key={vehicle.id} className={`bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md transition relative group pt-8 ${hasOverdue || insuranceStatus === 'expired' || tokenTaxStatus === 'expired' ? 'border-red-200 bg-red-50/30' : hasDueSoon || insuranceStatus === 'expiring_soon' || tokenTaxStatus === 'expiring_soon' ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100'}`}>
            <div className="absolute top-2 right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition px-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenModal(vehicle); }}
                className="p-1.5 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(vehicle.id); }}
                className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete"
              >
                🗑
              </button>
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
                {(vehicleAlerts.length > 0 || hasDocumentWarning || (vehicle.m_tag_balance || 0) < 1000) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(vehicle.m_tag_balance || 0) < 0 ? (
                      <span
                        title="M-Tag Balance Negative"
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 bg-red-600 text-white animate-pulse"
                      >
                        🔴 M-Tag Balance Negative
                      </span>
                    ) : (vehicle.m_tag_balance || 0) < 1000 && (
                      <span
                        title="M-Tag Low Balance"
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 bg-orange-500 text-white"
                      >
                        ⚠️ M-Tag Low Balance
                      </span>
                    )}
                    {vehicleAlerts.map((alert, idx) => (
                      <span
                        key={`maint-${idx}`}
                        title={`${alert.type}: ${alert.status === 'overdue' ? 'Overdue' : 'Due Soon'}`}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${alert.status === 'overdue' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}
                      >
                        ⚠️ {alert.type}
                      </span>
                    ))}
                    {insuranceStatus !== 'valid' && (
                      <span
                        title={`Insurance ${insuranceStatus === 'expired' ? 'Expired' : 'Expiring Soon'}`}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${insuranceStatus === 'expired' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}
                      >
                        ⚠️ Insurance {insuranceStatus === 'expired' ? 'Expired' : 'Expiring Soon'}
                      </span>
                    )}
                    {tokenTaxStatus !== 'valid' && (
                      <span
                        title={`Token Tax ${tokenTaxStatus === 'expired' ? 'Expired' : 'Expiring Soon'}`}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${tokenTaxStatus === 'expired' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}
                      >
                        ⚠️ Token Tax {tokenTaxStatus === 'expired' ? 'Expired' : 'Expiring Soon'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <div className="flex gap-1.5">
                  {vehicle.insurance_expiry && (
                    <span
                      title={`Insurance Exp: ${new Date(vehicle.insurance_expiry).toLocaleDateString()}`}
                      className={`w-2 h-2 rounded-full ${insuranceStatus === 'expired' ? 'bg-red-500 animate-pulse' : insuranceStatus === 'expiring_soon' ? 'bg-orange-500' : 'bg-green-500'}`}
                    ></span>
                  )}
                  {vehicle.token_tax_expiry && (
                    <span
                      title={`Token Tax Exp: ${new Date(vehicle.token_tax_expiry).toLocaleDateString()}`}
                      className={`w-2 h-2 rounded-full ${tokenTaxStatus === 'expired' ? 'bg-red-500 animate-pulse' : tokenTaxStatus === 'expiring_soon' ? 'bg-orange-500' : 'bg-blue-500'}`}
                    ></span>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-end mt-4 pt-4 border-t ${hasOverdue ? 'border-red-100' : hasDueSoon ? 'border-orange-100' : 'border-slate-50'}`}>
              <div>
                <p className="text-xs text-slate-400">M-Tag Balance</p>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-lg ${(vehicle.m_tag_balance || 0) < 1000 ? 'text-red-500' : 'text-slate-700'}`}>
                    {formatCurrency(vehicle.m_tag_balance || 0)}
                  </span>
                  <button onClick={(e) => openTopUp(e, vehicle)} className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium cursor-pointer transition">
                    + Add
                  </button>
                </div>
                {vehicle.m_tag_id && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">ID: {vehicle.m_tag_id}</p>
                )}
              </div>

              <div className="flex flex-col items-end">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Maintained</p>
                  <p className="text-sm font-medium text-slate-600">{new Date(vehicle.last_maintenance_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
          );
        })}
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
              <h3 className="text-xl font-bold mb-2 text-slate-800">Manage M-Tag</h3>
              <div className="p-2.5 bg-blue-50 rounded-lg mb-4">
                <p className="text-xs text-blue-600 uppercase font-bold mb-1">Vehicle</p>
                <div className="flex justify-between items-center">
                  <p className="font-mono font-bold text-blue-900 text-lg">{topUpVehicle.license_plate}</p>
                  <p className="text-blue-700 text-sm font-bold">{formatCurrency(topUpVehicle.m_tag_balance || 0)}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setMtagAction('add')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mtagAction === 'add' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
                >
                  + Add Funds
                </button>
                <button
                  onClick={() => setMtagAction('spend')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mtagAction === 'spend' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
                >
                  - Record Spend
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 border-2 border-slate-100 rounded-lg font-mono text-xl focus:border-blue-500 outline-none"
                    placeholder="1000"
                    value={topUpAmount}
                    onChange={e => setTopUpAmount(Math.max(0, Number(e.target.value)))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border-2 border-slate-100 rounded-lg text-sm focus:border-blue-500 outline-none"
                    value={mtagDate}
                    onChange={e => setMtagDate(e.target.value)}
                  />
                </div>
              </div>

              {/* History Section */}
              {mtagHistory.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Recent History</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {mtagHistory.map(h => (
                      <div key={h.id} className="group/item flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm transition hover:bg-white hover:border-slate-200">
                        {editingTransactionId === h.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                className="w-full text-xs p-1 border rounded"
                                value={editAmount}
                                onChange={e => setEditAmount(Number(e.target.value))}
                              />
                              <input
                                type="date"
                                className="w-full text-xs p-1 border rounded"
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => handleEditMTagTx(h.id)} className="flex-1 bg-green-600 text-white text-[10px] py-1 rounded font-bold">Save</button>
                              <button onClick={() => setEditingTransactionId(null)} className="flex-1 bg-slate-200 text-slate-600 text-[10px] py-1 rounded">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">{new Date(h.date).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{h.type === TransactionType.MTagTopUp ? 'RELOAD' : 'USAGE'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-mono font-bold ${h.type === TransactionType.MTagTopUp ? 'text-green-600' : 'text-orange-600'}`}>
                                {h.type === TransactionType.MTagTopUp ? '+' : '-'}{formatCurrency(h.amount)}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition px-1 border-l pl-2">
                                <button
                                  onClick={() => {
                                    setEditingTransactionId(h.id);
                                    setEditAmount(h.amount);
                                    setEditDate(new Date(h.date).toISOString().split('T')[0]);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => handleDeleteMTagTx(h.id)}
                                  className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5">
                <button onClick={() => setIsTopUpOpen(false)} className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition cursor-pointer">Cancel</button>
                <button
                  onClick={handleTopUp}
                  disabled={!topUpAmount}
                  className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 transition active:scale-95 cursor-pointer ${mtagAction === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        )
      }
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, type: null, id: null })}
        onConfirm={onConfirmDelete}
        title={deleteConfirmation.type === 'vehicle' ? "Delete Vehicle" : "Remove Transaction"}
        message={deleteConfirmation.message || "Are you sure?"}
        confirmLabel="Confirm Delete"
      />
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
    token_tax_expiry: '',
    m_tag_id: ''
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
        token_tax_expiry: vehicle.token_tax_expiry || '',
        m_tag_id: vehicle.m_tag_id || ''
      });
    }
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'capacity' || name === 'year') ? Math.max(0, parseInt(value) || 0) : value }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const cleanedData = {
          ...formData,
          insurance_expiry: formData.insurance_expiry || null,
          token_tax_expiry: formData.token_tax_expiry || null,
        };
        onSave(cleanedData);
      }}
      className="space-y-4 max-h-[70vh] overflow-y-auto"
    >
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
        <label className="block text-sm font-bold text-slate-700 mb-1">M-Tag ID</label>
        <input type="text" name="m_tag_id" value={formData.m_tag_id} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white transition" placeholder="Enter M-Tag ID" />
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
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition cursor-pointer">
          {vehicle ? 'Save Changes' : 'Create Vehicle'}
        </button>
      </div>
    </form>
  );
};

export default FleetView;