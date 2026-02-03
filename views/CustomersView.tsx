import React, { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, uploadFile } from '../services/api';
import { Customer, CustomerSource } from '../types';
import { PlusIcon } from '../components/icons';
import GoogleAutocompleteInput from '../components/GoogleAutocompleteInput';
import ConfirmationModal from '../components/ConfirmationModal';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { COUNTRIES } from '../countries';
import toast from 'react-hot-toast';

const CustomersView: React.FC<{ mode?: 'standard' | 'affiliated' }> = ({ mode = 'standard' }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

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

        if (formData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic) && !/^\d{13}$/.test(formData.cnic)) {
            toast.error("CNIC should be in 00000-0000000-0 format or 13 digits");
            return;
        }

        // Sanitize data: convert empty strings to null for optional fields
        const sanitizedData = {
            ...formData,
            cnic: formData.cnic || null,
            license_number: formData.license_number || null,
            address: formData.address || null,
            whatsapp: formData.whatsapp || null,
            reference_name: formData.reference_name || null,
            reference_phone: formData.reference_phone || null,
        };

        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, sanitizedData);
            toast.success("Customer updated successfully");
        } else {
            await createCustomer(sanitizedData);
            toast.success("Customer created successfully");
        }
        fetchCustomers();
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmation({ isOpen: true, id });
    };

    const onConfirmDelete = async () => {
        if (!deleteConfirmation.id) return;
        try {
            await deleteCustomer(deleteConfirmation.id);
            toast.success("Customer deleted successfully");
            fetchCustomers();
        } catch (error) {
            toast.error("Failed to delete customer");
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

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm);

        if (mode === 'affiliated') {
            return matchesSearch && c.source === CustomerSource.Affiliated;
        }
        return matchesSearch && c.source !== CustomerSource.Affiliated;
    });

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Customers...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col px-4 rounded-lg sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{mode === 'affiliated' ? 'Affiliated' : 'Direct'} Customers</h1>
                    <p className="text-sm text-slate-500">{filteredCustomers.length} Active Records</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-full sm:w-auto bg-blue-600 cursor-pointer text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center font-bold"
                >
                    <PlusIcon className="mr-2" /> Add {mode === 'affiliated' ? 'Affiliated' : 'Customer'}
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
                            <button
                                onClick={() => handleDeleteClick(customer.id)}
                                className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
                            >
                                🗑
                            </button>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{customer.name}</h3>
                        <div className="flex flex-wrap gap-2 text-slate-500 text-sm font-mono mb-2">
                            <span>{customer.phone}</span>
                            {customer.whatsapp && <span className="text-green-600">| WA: {customer.whatsapp}</span>}
                            {customer.country && <span className="text-slate-400">| {customer.country}</span>}
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
                            <CustomerForm onSave={handleSave} initialData={editingCustomer || {}} mode={mode} />
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
                onConfirm={onConfirmDelete}
                title="Delete Customer"
                message="Are you sure you want to delete this customer?"
                confirmLabel="Delete Customer"
            />
        </div>
    );
};

const CustomerForm: React.FC<{ onSave: (data: any) => void, initialData: any, mode?: 'standard' | 'affiliated' }> = ({ onSave, initialData, mode = 'standard' }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        whatsapp: '',
        cnic: '',
        address: '',
        license_number: '',
        internal_remarks: '',
        source: mode === 'affiliated' ? CustomerSource.Affiliated : CustomerSource.Direct,
        reference_name: '',
        reference_phone: '',
        country: 'Pakistan',
        ...initialData
    });

    const [files, setFiles] = useState<{
        cnic_front?: File,
        cnic_back?: File,
        license_front?: File,
        license_back?: File
    }>({});
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            // Auto-fill WhatsApp when Phone is typed
            if (name === 'phone') updated.whatsapp = value;
            return updated;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof files) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [field]: e.target.files![0] }));
        }
    };

    const handleViewImage = (url: string | undefined, title: string) => {
        if (url) {
            setPreviewImage(url);
            setPreviewTitle(title);
        }
    };

    const handleRemoveImage = (field: 'img_cnic_front' | 'img_cnic_back' | 'img_license_front' | 'img_license_back') => {
        setFormData({ ...formData, [field]: null });
    };

    const handleRemoveFile = (field: keyof typeof files) => {
        setFiles(prev => {
            const updated = { ...prev };
            delete updated[field];
            return updated;
        });
    };

    const handleFormSave = async () => {
        setUploading(true);
        try {
            let updatedData = { ...formData };

            const upload = async (file: File, prefix: string) => {
                const path = `customers/${Date.now()}_${prefix}_${file.name}`;
                return await uploadFile('documents', path, file);
            }

            if (files.cnic_front) updatedData.img_cnic_front = await upload(files.cnic_front, 'cnic_front');
            if (files.cnic_back) updatedData.img_cnic_back = await upload(files.cnic_back, 'cnic_back');
            if (files.license_front) updatedData.img_license_front = await upload(files.license_front, 'license_front');
            if (files.license_back) updatedData.img_license_back = await upload(files.license_back, 'license_back');

            onSave(updatedData);
        } catch (e) {
            toast.error("Error uploading documents");
            console.error(e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {mode === 'standard' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Customer Source</label>
                    <div className="flex flex-wrap gap-4">
                        {Object.values(CustomerSource).filter(s => s !== CustomerSource.Affiliated).map(source => (
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
            )}

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

            {/* Documents Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-700 text-sm uppercase">Documents</h4>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">CNIC Front</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cnic_front')} className="w-full text-xs" />
                        {formData.img_cnic_front && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-green-600">✓ Uploaded</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(formData.img_cnic_front, 'CNIC Front')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage('img_cnic_front')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                        {files.cnic_front && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-blue-600"> {files.cnic_front.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(URL.createObjectURL(files.cnic_front!), 'CNIC Front Preview')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile('cnic_front')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">CNIC Back</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cnic_back')} className="w-full text-xs" />
                        {formData.img_cnic_back && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-green-600">✓ Uploaded</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(formData.img_cnic_back, 'CNIC Back')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage('img_cnic_back')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                        {files.cnic_back && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-blue-600"> {files.cnic_back.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(URL.createObjectURL(files.cnic_back!), 'CNIC Back Preview')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile('cnic_back')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">License Front</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'license_front')} className="w-full text-xs" />
                        {formData.img_license_front && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-green-600">✓ Uploaded</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(formData.img_license_front, 'License Front')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage('img_license_front')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                        {files.license_front && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-blue-600"> {files.license_front.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(URL.createObjectURL(files.license_front!), 'License Front Preview')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile('license_front')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">License Back</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'license_back')} className="w-full text-xs" />
                        {formData.img_license_back && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-green-600">✓ Uploaded</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(formData.img_license_back, 'License Back')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage('img_license_back')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                        {files.license_back && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-blue-600"> {files.license_back.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleViewImage(URL.createObjectURL(files.license_back!), 'License Back Preview')}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile('license_back')}
                                    className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Country</label>
                <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full p-2.5 border rounded-xl bg-white"
                >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Address (Optional)</label>
                <GoogleAutocompleteInput
                    value={formData.address}
                    onChange={(val) => setFormData({ ...formData, address: val })}
                    placeholder="Search for address..."
                    className="bg-white border-slate-200"
                />
            </div>
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
                onClick={handleFormSave}
                disabled={!formData.name || !formData.phone || uploading}
                className="w-full bg-blue-600 cursor-pointer text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 mt-4 flex justify-center items-center"
            >
                {uploading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                    </>
                ) : (
                    initialData.id ? 'Update Customer' : 'Create Customer'
                )}
            </button>

            <ImagePreviewModal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                imageUrl={previewImage}
                title={previewTitle}
            />
        </div>
    );
}

export default CustomersView;
