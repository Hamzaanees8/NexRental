import React, { useEffect, useState } from 'react';
import { getChallans, createChallan, updateChallan, deleteChallan, getVehicles, getDrivers } from '../services/api';
import { Challan, ChallanStatus, Vehicle, Driver } from '../types';
import { PlusIcon } from '../components/icons';
import { formatCurrency } from '../constants';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

const ChallansView: React.FC = () => {
    const [challans, setChallans] = useState<Challan[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChallan, setEditingChallan] = useState<Challan | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cData, vData, dData] = await Promise.all([
                getChallans(),
                getVehicles(),
                getDrivers()
            ]);
            setChallans(cData);
            setVehicles(vData);
            setDrivers(dData);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (formData: any) => {
        try {
            if (editingChallan) {
                await updateChallan(editingChallan.id, formData);
                toast.success("Challan updated");
            } else {
                await createChallan(formData);
                toast.success("Challan recorded");
            }
            fetchData();
            setIsModalOpen(false);
            setEditingChallan(null);
        } catch (error) {
            toast.error("Failed to save challan");
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmation({ isOpen: true, id });
    };

    const onConfirmDelete = async () => {
        if (!deleteConfirmation.id) return;
        try {
            await deleteChallan(deleteConfirmation.id);
            toast.success("Challan deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete challan");
        }
    };

    const filteredChallans = challans.filter(c =>
        c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.violation_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.license_plate || 'Unknown';
    const getDriverName = (id: string) => drivers.find(d => d.id === id)?.name || 'Unknown';

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Challans...</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm rounded-lg px-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Traffic Challans</h1>
                    <p className="text-sm text-slate-500">{challans.length} Total Violations</p>
                </div>
                <button
                    onClick={() => { setEditingChallan(null); setIsModalOpen(true); }}
                    className="w-full sm:w-auto bg-blue-600 cursor-pointer text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
                >
                    <PlusIcon className="mr-2" /> Record Challan
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by Challan # or Violation..."
                    className="w-full p-4 pl-12 rounded-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-4 top-4 text-slate-400">🔍</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Challan #</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Vehicle</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Driver</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Liability</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredChallans.map(challan => (
                                <tr key={challan.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-sm font-medium">{new Date(challan.date).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-slate-700">{challan.challan_number}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">{challan.violation_type}</div>
                                    </td>
                                    <td className="p-4 text-sm font-mono text-indigo-600 font-bold">{getVehiclePlate(challan.vehicle_id)}</td>
                                    <td className="p-4 text-sm font-medium">{getDriverName(challan.driver_id)}</td>
                                    <td className="p-4 text-sm font-bold">{formatCurrency(challan.amount)}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {challan.is_driver_liable && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-700">Driver</span>
                                            )}
                                            {challan.is_business_absorbed && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">Business</span>
                                            )}
                                            {!challan.is_driver_liable && !challan.is_business_absorbed && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">Other/Customer</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${challan.status === ChallanStatus.Paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {challan.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => { setEditingChallan(challan); setIsModalOpen(true); }}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition mr-2 cursor-pointer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(challan.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredChallans.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        No challans found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold">{editingChallan ? 'Edit Challan' : 'Record Challan'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
                        </div>
                        <div className="p-6">
                            <ChallanForm
                                onSave={handleSave}
                                initialData={editingChallan || {}}
                                vehicles={vehicles}
                                drivers={drivers}
                            />
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
                onConfirm={onConfirmDelete}
                title="Delete Challan"
                message="Are you sure you want to delete this challan record?"
                confirmLabel="Delete"
            />
        </div>
    );
};

const ChallanForm: React.FC<{ onSave: (data: any) => void, initialData: any, vehicles: Vehicle[], drivers: Driver[] }> = ({ onSave, initialData, vehicles, drivers }) => {
    const [formData, setFormData] = useState({
        vehicle_id: initialData.vehicle_id || (vehicles.length > 0 ? vehicles[0].id : ''),
        driver_id: initialData.driver_id || (drivers.length > 0 ? drivers[0].id : ''),
        challan_number: initialData.challan_number || '',
        amount: initialData.amount || 0,
        date: initialData.date || new Date().toISOString().split('T')[0],
        violation_type: initialData.violation_type || '',
        notes: initialData.notes || '',
        is_driver_liable: initialData.is_driver_liable ?? false,
        is_business_absorbed: initialData.is_business_absorbed ?? true,
        status: initialData.status || ChallanStatus.Unpaid,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
        } else {
            setFormData({ ...formData, [name]: name === 'amount' ? parseFloat(value) || 0 : value });
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Vehicle</label>
                    <select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white">
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Driver</label>
                    <select name="driver_id" value={formData.driver_id} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white">
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Challan Number</label>
                    <input name="challan_number" value={formData.challan_number} onChange={handleChange} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Violation Type</label>
                    <input name="violation_type" value={formData.violation_type} onChange={handleChange} className="w-full p-2.5 border rounded-xl" placeholder="e.g. Over speeding" required />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Amount (PKR)</label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2.5 border rounded-xl" required />
                </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border">
                <p className="text-xs font-bold text-slate-500 uppercase">Financial Options</p>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="is_driver_liable"
                            checked={formData.is_driver_liable}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Liable to Driver</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="is_business_absorbed"
                            checked={formData.is_business_absorbed}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Absorbed by Business</span>
                    </label>
                </div>
                <p className="text-[10px] text-slate-400 italic">If both are unchecked, fine is assumed paid by customer (self-drive).</p>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 font-bold">Payment Status:</span>
                <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="text-sm p-2 border rounded-xl bg-white font-bold"
                >
                    <option value={ChallanStatus.Unpaid}>Unpaid</option>
                    <option value={ChallanStatus.Paid}>Paid</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full p-2.5 border rounded-xl"
                    rows={2}
                    placeholder="Optional details..."
                />
            </div>

            <button
                onClick={() => onSave(formData)}
                disabled={!formData.challan_number || !formData.amount}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 mt-2 transition active:scale-95 cursor-pointer"
            >
                {initialData.id ? 'Update Challan' : 'Record Challan'}
            </button>
        </div>
    );
};

export default ChallansView;
