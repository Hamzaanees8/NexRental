import React, { useEffect, useState } from 'react';
import { getDrivers, createDriver, updateDriver } from '../services/api';
import { Driver } from '../types';
import { PlusIcon } from '../components/icons';
import { formatCurrency } from '../constants';

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
        if (editingDriver) {
            await updateDriver(editingDriver.id, formData);
        } else {
            await createDriver(formData);
        }
        fetchDrivers();
        setIsModalOpen(false);
        setEditingDriver(null);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Drivers</h1>
                    <p className="text-sm text-slate-500">{drivers.length} Personnel</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
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
                    <div key={driver.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition relative group">
                        <button
                            onClick={() => openEditModal(driver)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition"
                        >
                            ✎ Edit
                        </button>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{driver.name}</h3>
                                <p className="text-slate-500 text-sm font-mono">{driver.phone}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_BADGES[driver.status]}`}>
                                {driver.status}
                            </span>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-50 flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-mono">{driver.license_no}</span>
                            {driver.base_salary && (
                                <span className="font-bold text-slate-700">{formatCurrency(driver.base_salary)} / mo</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold">{editingDriver ? 'Edit Driver' : 'Register Driver'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
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
        license_no: '',
        status: 'Available',
        base_salary: '',
        ...initialData
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border rounded-xl" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 border rounded-xl" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Base Salary</label>
                    <input type="number" name="base_salary" value={formData.base_salary} onChange={handleChange} className="w-full p-3 border rounded-xl" placeholder="0" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">License No</label>
                <input name="license_no" value={formData.license_no} onChange={handleChange} className="w-full p-3 border rounded-xl font-mono uppercase" required />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-3 border rounded-xl bg-white">
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>

            <button
                onClick={() => onSave({ ...formData, base_salary: Number(formData.base_salary) })}
                disabled={!formData.name || !formData.license_no}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 mt-4"
            >
                {initialData.id ? 'Update Driver' : 'Register Driver'}
            </button>
        </div>
    )
}

export default DriversView;
