import React, { useEffect, useState } from 'react';
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../services/api';
import { Driver } from '../types';
import { PlusIcon } from '../components/icons';
import { formatCurrency } from '../constants';
import toast from 'react-hot-toast';

const DriversView: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const data = await getDrivers();
            setDrivers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleSave = async (formData: any) => {
        // Validation
        if (!formData.name || formData.name.trim().length < 3) {
            toast.error("Name must be at least 3 characters long");
            return;
        }

        const phoneRegex = /^\d{7,15}$/;
        if (!phoneRegex.test(formData.phone)) {
            toast.error("Please enter a valid phone number (7-15 digits)");
            return;
        }

        if (!formData.license_no) {
            toast.error("License number is required");
            return;
        }

        if (formData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic) && !/^\d{13}$/.test(formData.cnic)) {
            toast.error("CNIC should be in 00000-0000000-0 format or 13 digits");
            return;
        }

        if (editingDriver) {
            await updateDriver(editingDriver.id, formData);
            toast.success("Driver details updated");
        } else {
            await createDriver(formData);
            toast.success("Driver registered successfully");
        }
        fetchDrivers();
        setIsModalOpen(false);
        setEditingDriver(null);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this driver?")) return;
        try {
            await deleteDriver(id);
            toast.success("Driver record removed");
            fetchDrivers();
        } catch (error) {
            toast.error("Failed to delete driver");
        }
    };

    const openEditModal = (driver: Driver) => {
        setEditingDriver(driver);
        setIsModalOpen(true);
    }

    const openCreateModal = () => {
        setEditingDriver(null);
        setIsModalOpen(true);
    }

    const filteredDrivers = drivers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.license_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Drivers...</div>;

    const STATUS_BADGES = {
        'Available': 'bg-green-100 text-green-700',
        'On Trip': 'bg-blue-100 text-blue-700',
        'Inactive': 'bg-slate-100 text-slate-500'
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col px-4 rounded-lg sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Drivers</h1>
                    <p className="text-sm text-slate-500">{drivers.length} Personnel</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full sm:w-auto bg-blue-600 cursor-pointer text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
                >
                    <PlusIcon className="mr-2" /> Add Driver
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search name or license..."
                    className="w-full p-4 pl-12 rounded-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-4 top-4 text-slate-400">🔍</span>
            </div>

            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                {filteredDrivers.map(driver => (
                    <div key={driver.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition relative group pt-8">
                        <div className="absolute top-2 right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition">
                            <button
                                onClick={() => openEditModal(driver)}
                                className="p-1.5 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit"
                            >
                                ✎
                            </button>
                            <button
                                onClick={() => handleDelete(driver.id)}
                                className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
                            >
                                🗑
                            </button>
                        </div>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{driver.name}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-500 text-sm font-mono">{driver.phone}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGES[driver.status as keyof typeof STATUS_BADGES]}`}>
                                        {driver.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-50 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-mono">{driver.license_no}</span>
                                {driver.base_salary && (
                                    <span className="font-bold text-slate-700">{formatCurrency(driver.base_salary)} / month</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">CNIC: {driver.cnic || 'N/A'}</span>
                                {driver.license_expiry && (
                                    <span className={`font-medium ${new Date(driver.license_expiry) < new Date() ? 'text-red-600' : (new Date(driver.license_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) < 30 ? 'text-orange-600' : 'text-slate-400'}`}>
                                        License Expiry: {new Date(driver.license_expiry).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold">{editingDriver ? 'Edit Driver' : 'Register Driver'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
                        </div>
                        <div className="p-6">
                            <DriverForm onSave={handleSave} initialData={editingDriver || {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const DriverForm: React.FC<{ onSave: (data: any) => void, initialData: any }> = ({ onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cnic: '',
        cnic_expiry: '',
        license_expiry: '',
        license_no: '',
        status: 'Available',
        base_salary: '',
        internal_remarks: '',
        ...initialData
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: name === 'base_salary' ? Math.max(0, parseFloat(value) || 0) : value });
    };

    return (
        <div className="space-y-4 overflow-y-auto max-h-[400px]">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 border rounded-xl" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                    <input type="number" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Base Salary</label>
                    <input type="number" min="0" name="base_salary" value={formData.base_salary} onChange={handleChange} className="w-full p-2.5 border rounded-xl" placeholder="0" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CNIC</label>
                    <input name="cnic" value={formData.cnic} onChange={handleChange} className="w-full p-2.5 border rounded-xl font-mono" placeholder="00000-0000000-0" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CNIC Expiry</label>
                    <input type="date" name="cnic_expiry" value={formData.cnic_expiry} onChange={handleChange} className="w-full p-2.5 border rounded-xl" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">License No</label>
                    <input name="license_no" value={formData.license_no} onChange={handleChange} className="w-full p-2.5 border rounded-xl font-mono" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">License Expiry</label>
                    <input type="date" name="license_expiry" value={formData.license_expiry} onChange={handleChange} className="w-full p-2.5 border rounded-xl" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="w-full">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white">
                        <option value="Available">Available</option>
                        <option value="On Trip">On Trip</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Internal Remarks</label>
                <textarea
                    name="internal_remarks"
                    value={formData.internal_remarks}
                    onChange={e => setFormData({ ...formData, internal_remarks: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50"
                    placeholder="E.g. Senior driver, prefers long routes..."
                    rows={3}
                />
            </div>

            <button
                onClick={() => onSave({ ...formData, base_salary: Number(formData.base_salary) })}
                disabled={!formData.name || !formData.license_no}
                className="w-full bg-blue-600 cursor-pointer text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 mt-4"
            >
                {initialData.id ? 'Update Driver' : 'Register Driver'}
            </button>
        </div>
    )
}

export default DriversView;
