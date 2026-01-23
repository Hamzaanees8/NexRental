import React, { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer } from '../services/api';
import { Customer } from '../types';
import { PlusIcon } from '../components/icons';

const CustomersView: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSave = async (formData: any) => {
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, formData);
        } else {
            await createCustomer(formData);
        }
        fetchCustomers();
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    }

    const openCreateModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Customers...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Customers</h1>
                    <p className="text-sm text-slate-500">{customers.length} Active Records</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
                >
                    <PlusIcon className="mr-2" /> Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search name or phone..."
                    className="w-full p-4 pl-12 rounded-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-4 top-4 text-slate-400">🔍</span>
            </div>

            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                {filteredCustomers.map(customer => (
                    <div key={customer.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition relative group">
                        <button
                            onClick={() => openEditModal(customer)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition"
                        >
                            ✎ Edit
                        </button>
                        <h3 className="font-bold text-lg text-slate-800">{customer.name}</h3>
                        <p className="text-slate-500 text-sm font-mono mb-2">{customer.phone}</p>

                        {(customer.address || customer.cnic) && (
                            <div className="pt-2 border-t border-slate-50 text-xs text-slate-400 space-y-1">
                                {customer.cnic && <p>CNIC: {customer.cnic}</p>}
                                {customer.address && <p>Addr: {customer.address}</p>}
                            </div>
                        )}
                    </div>
                ))}
                {filteredCustomers.length === 0 && (
                    <div className="text-center py-12 text-slate-400 col-span-full">
                        <p>No customers found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6">
                            <CustomerForm onSave={handleSave} initialData={editingCustomer || {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomerForm: React.FC<{ onSave: (data: any) => void, initialData: any }> = ({ onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        whatsapp: '',
        cnic: '',
        address: '',
        license_number: '',
        ...initialData
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp (Optional)</label>
                    <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full p-3 border rounded-xl" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">CNIC (Optional)</label>
                <input name="cnic" value={formData.cnic} onChange={handleChange} className="w-full p-3 border rounded-xl font-mono" placeholder="00000-0000000-0" />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Address (Optional)</label>
                <input name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border rounded-xl" />
            </div>

            <button
                onClick={() => onSave(formData)}
                disabled={!formData.name || !formData.phone}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 mt-4"
            >
                {initialData.id ? 'Update Customer' : 'Create Customer'}
            </button>
        </div>
    );
}

export default CustomersView;
