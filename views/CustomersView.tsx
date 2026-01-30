import React, { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/api';
import { Customer, CustomerSource } from '../types';
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

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this customer?")) return;
        try {
            await deleteCustomer(id);
            fetchCustomers();
        } catch (error) {
            alert("Failed to delete customer");
        }
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
            <div className="flex flex-col px-4 rounded-lg sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Customers</h1>
                    <p className="text-sm text-slate-500">{customers.length} Active Records</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full sm:w-auto bg-blue-600 cursor-pointer text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
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
                    <div key={customer.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition relative group pt-8">
                        <div className="absolute top-2 right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition">
                            <button
                                onClick={() => openEditModal(customer)}
                                className="p-1.5 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit"
                            >
                                ✎
                            </button>
                            {/* <button
                                onClick={() => handleDelete(customer.id)}
                                className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
                            >
                                🗑
                            </button> */}
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{customer.name}</h3>
                        <div className="flex flex-wrap gap-2 text-slate-500 text-sm font-mono mb-2">
                            <span>{customer.phone}</span>
                            {customer.whatsapp && <span className="text-green-600">| WA: {customer.whatsapp}</span>}
                            {customer.source && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${customer.source === CustomerSource.Affiliated ? 'bg-purple-100 text-purple-700' :
                                    customer.source === CustomerSource.Reference ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {customer.source}
                                </span>
                            )}
                        </div>
                        {customer.source === CustomerSource.Reference && (
                            <div className="mb-2 p-2 bg-orange-50 rounded-lg text-xs border border-orange-100">
                                <p className="font-bold text-orange-800">Ref: {customer.reference_name}</p>
                                <p className="text-orange-600 font-mono">{customer.reference_phone}</p>
                            </div>
                        )}

                        {(customer.address || customer.cnic || customer.license_number || customer.internal_remarks) && (
                            <div className="pt-2 border-t border-slate-50 text-xs text-slate-400 space-y-1">
                                {customer.cnic && <p>CNIC: {customer.cnic}</p>}
                                {customer.license_number && <p>License: {customer.license_number}</p>}
                                {customer.address && <p>Addr: {customer.address}</p>}
                                {customer.internal_remarks && <p className="text-blue-600 italic">Notes: {customer.internal_remarks}</p>}
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
                    <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
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
        internal_remarks: '',
        source: CustomerSource.Direct,
        reference_name: '',
        reference_phone: '',
        ...initialData
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            // Auto-fill WhatsApp when Phone is typed
            if (name === 'phone') updated.whatsapp = value;
            return updated;
        });
    };

    return (
        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Customer Source</label>
                <div className="flex flex-wrap gap-4">
                    {Object.values(CustomerSource).map(source => (
                        <label key={source} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="source"
                                value={source}
                                checked={formData.source === source}
                                onChange={() => setFormData({ ...formData, source })}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className={`text-sm ${formData.source === source ? 'font-bold text-blue-700' : 'text-slate-600'}`}>{source}</span>
                        </label>
                    ))}
                </div>
            </div>

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
                    <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp (Optional)</label>
                    <input type="number" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full p-2.5 border rounded-xl" />
                </div>
            </div>

            {formData.source === CustomerSource.Reference && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <div>
                        <label className="block text-sm font-bold text-orange-800 mb-1">Reference Name</label>
                        <input name="reference_name" value={formData.reference_name} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-orange-800 mb-1">Reference Phone</label>
                        <input type="number" name="reference_phone" value={formData.reference_phone} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white shadow-sm" required />
                    </div>
                </div>
            )}

            {formData.source !== CustomerSource.Affiliated && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Driving License (Optional)</label>
                            <input name="license_number" value={formData.license_number} onChange={handleChange} className="w-full p-2.5 border rounded-xl" placeholder="Provincial/Federal ID" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CNIC (Optional)</label>
                            <input name="cnic" value={formData.cnic} onChange={handleChange} className="w-full p-2.5 border rounded-xl font-mono" placeholder="00000-0000000-0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Address (Optional)</label>
                        <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2.5 border rounded-xl" />
                    </div>
                </>
            )}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Internal Remarks</label>
                <textarea
                    name="internal_remarks"
                    value={formData.internal_remarks}
                    onChange={e => setFormData({ ...formData, internal_remarks: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50"
                    placeholder="E.g. Frequent customer, history of late returns..."
                    rows={3}
                />
            </div>

            <button
                onClick={() => onSave(formData)}
                disabled={!formData.name || !formData.phone}
                className="w-full bg-blue-600 cursor-pointer text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 mt-4"
            >
                {initialData.id ? 'Update Customer' : 'Create Customer'}
            </button>
        </div>
    );
}

export default CustomersView;
