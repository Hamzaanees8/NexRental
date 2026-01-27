import React, { useState, useEffect } from 'react';
import { Customer, Driver, Rental, RentalStatus, Vehicle, RentalType } from '../types';
import { getRentals, getCustomers, getDrivers, getVehicles, createRental, createCustomer, updateRental, deleteRental } from '../services/api';
import { formatCurrency } from '../constants';
import { PlusIcon } from '../components/icons';
import SearchableSelect from '../components/SearchableSelect';

const RentalsView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list');
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedRental, setSelectedRental] = useState<Rental | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Rental>>({
        rental_type: RentalType.WithDriver, // Default as requested
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        rent_amount: 0,
        security_deposit: 0,
        driver_allowance: 0,
        fuel_cost: 0,
        toll_cost: 0,
        other_expenses: 0,
        odometer_start: 0,
        odometer_end: 0,
        pickup_location: '',
        destination: '',
        self_drive_name: '',
        self_drive_license: '',
        inspection_notes: ''
    });

    // Quick Customer Modal
    const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
    const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [r, v, c, d] = await Promise.all([getRentals(), getVehicles(), getCustomers(), getDrivers()]);
            setRentals(r);
            setVehicles(v);
            setCustomers(c);
            setDrivers(d);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            if (!formData.vehicle_id || !formData.customer_id || !formData.start_time || !formData.end_time) {
                alert("Please fill all required fields");
                return;
            }
            if (formData.rental_type === RentalType.WithDriver && !formData.driver_id) {
                alert("Please select a driver for 'With Driver' booking");
                return;
            }

            if (selectedRental) {
                await updateRental(selectedRental.id, formData);
            } else {
                await createRental(formData as any);
            }

            setViewMode('list');
            setSelectedRental(null);
            loadData();
        } catch (e) {
            alert("Error saving rental");
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this rental?")) return;
        try {
            await deleteRental(id);
            loadData();
        } catch (e) {
            alert("Failed to delete rental");
        }
    }

    const handleQuickCustomerSave = async () => {
        if (!quickCustomer.name || !quickCustomer.phone) return;
        try {
            const newCust = await createCustomer({ ...quickCustomer, tenant_id: '' } as any); // API handles tenant_id
            await loadData(); // Reload to get new customer list
            setFormData(prev => ({ ...prev, customer_id: newCust.id })); // Auto select
            setIsQuickCustomerOpen(false);
            setQuickCustomer({ name: '', phone: '' });
        } catch (e) {
            alert("Failed to create customer");
        }
    }

    const openEdit = (rental: Rental) => {
        setSelectedRental(rental);
        setFormData({
            ...rental,
            start_time: new Date(rental.start_time).toISOString().slice(0, 16),
            end_time: new Date(rental.end_time).toISOString().slice(0, 16),
        });
        setViewMode('create');
    }

    const openCreate = () => {
        setSelectedRental(null);
        setFormData({
            rental_type: RentalType.WithDriver,
            start_time: new Date().toISOString().slice(0, 16),
            end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
            rent_amount: 0,
            security_deposit: 0,
            driver_allowance: 0,
            fuel_cost: 0,
            toll_cost: 0,
            other_expenses: 0,
            odometer_start: 0,
            odometer_end: 0,
            pickup_location: '',
            destination: '',
            self_drive_name: '',
            self_drive_license: '',
            inspection_notes: ''
        });
        setViewMode('create');
    }

    if (loading) return <div className="p-4 text-center">Loading Rentals...</div>;

    const availableDrivers = drivers; // In real app, filter by availability based on status or date overlap

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <header className="flex px-4 rounded-lg justify-between items-center sticky top-0 bg-slate-50 z-10 py-4 shadow-sm">
                <h1 className="text-2xl font-bold">Car Rentals</h1>
                {viewMode === 'list' && (
                    <button
                        onClick={openCreate}
                        className="bg-blue-600 cursor-pointer text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 active:transform active:scale-95 transition font-bold"
                    >
                        + New Rental
                    </button>
                )}
                {viewMode !== 'list' && (
                    <button onClick={() => setViewMode('list')} className="text-slate-500 font-medium hover:text-slate-700 cursor-pointer transition">Cancel</button>
                )}
            </header>

            {viewMode === 'list' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rentals.map(rental => {
                        const customer = customers.find(c => c.id === rental.customer_id);
                        const vehicle = vehicles.find(v => v.id === rental.vehicle_id);
                        const isWithDriver = rental.rental_type === RentalType.WithDriver;

                        return (
                            <div key={rental.id}
                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition relative group pt-8"
                            >
                                <div className="absolute top-2 right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(rental); }}
                                        className="p-1.5 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        title="Edit"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(rental.id); }}
                                        className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete"
                                    >
                                        🗑
                                    </button>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${rental.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {rental.status}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">{new Date(rental.start_time).toLocaleDateString()}</span>
                                </div>

                                <h3 className="font-bold text-lg text-slate-800">{customer?.name || 'Unknown'}</h3>

                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-mono bg-slate-100 px-1.5 rounded">{vehicle?.license_plate}</span>
                                    <span className="text-xs text-slate-500 uppercase">{vehicle?.type}</span>
                                </div>

                                <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400">Type</span>
                                        <span className="font-medium text-slate-700">{isWithDriver ? 'With Driver' : 'Self Drive'}</span>
                                        {!isWithDriver && rental.self_drive_license && (
                                            <span className="text-[10px] text-slate-400 font-mono">Lic: {rental.self_drive_license}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-xs text-slate-400">Rent</span>
                                        <span className="font-mono font-bold text-blue-600">{formatCurrency(rental.rent_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {rentals.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">No rentals found. Create one to get started.</p>}
                </div>
            )}

            {viewMode === 'create' && (
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl mx-auto border border-slate-100">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">{selectedRental ? 'Edit Booking' : 'New Booking'}</h2>

                    <div className="space-y-6">
                        {/* Driver Type Toggle */}
                        <div className="p-1 bg-slate-100 rounded-xl flex gap-1">
                            {(['With Driver', 'Self Drive'] as const).map(type => {
                                const val = type === 'With Driver' ? RentalType.WithDriver : RentalType.SelfDrive;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setFormData(prev => ({ ...prev, rental_type: val }))}
                                        className={`flex-1 py-3 cursor-pointer text-sm font-bold rounded-lg transition ${formData.rental_type === val ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {type}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Vehicle Selection with Search */}
                            <div className="relative">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Vehicle</label>
                                <SearchableSelect
                                    options={vehicles.filter(v => v.status === 'Active' || v.id === formData.vehicle_id).map(v => ({
                                        value: v.id,
                                        label: `(${v.type}) ${v.license_plate}`
                                    }))}
                                    value={formData.vehicle_id || ''}
                                    onChange={(val) => setFormData({ ...formData, vehicle_id: val })}
                                    placeholder="Search Vehicle..."
                                />
                            </div>

                            {/* Customer Selection with Quick Add & Search */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Customer</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={customers.map(c => ({
                                                value: c.id,
                                                label: c.name
                                            }))}
                                            value={formData.customer_id || ''}
                                            onChange={(val) => setFormData({ ...formData, customer_id: val })}
                                            placeholder="Search Customer..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsQuickCustomerOpen(true)}
                                        className="bg-blue-100 text-blue-600 w-14 rounded-xl flex items-center justify-center hover:bg-blue-200 transition"
                                    >
                                        <PlusIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {formData.rental_type === RentalType.WithDriver ? (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-sm font-bold text-blue-800 mb-2">Assign Driver</label>
                                <SearchableSelect
                                    options={availableDrivers.map(d => ({
                                        value: d.id,
                                        label: `${d.name} (${d.status})`
                                    }))}
                                    value={formData.driver_id || ''}
                                    onChange={(val) => setFormData({ ...formData, driver_id: val })}
                                    placeholder="Search Driver..."
                                    className="bg-white"
                                />
                            </div>
                        ) : (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-orange-800 mb-1">Self Driver Name (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Enter driver name..."
                                        className="w-full p-2 border rounded-xl bg-white shadow-sm"
                                        value={formData.self_drive_name || ''}
                                        onChange={e => setFormData({ ...formData, self_drive_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-orange-800 mb-1">Driver License No.</label>
                                    <input
                                        type="text"
                                        placeholder="License / CNIC No."
                                        className="w-full p-2 border rounded-xl bg-white shadow-sm font-mono uppercase"
                                        value={formData.self_drive_license || ''}
                                        onChange={e => setFormData({ ...formData, self_drive_license: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                        {/* Conditional Fields based on Rental Type */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Start Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Lahore, Office"
                                    className="w-full p-2 border rounded-xl bg-slate-50"
                                    value={formData.pickup_location || ''}
                                    onChange={e => setFormData({ ...formData, pickup_location: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Destination</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Multan, Islamabad"
                                    className="w-full p-2 border rounded-xl bg-slate-50"
                                    value={formData.destination || ''}
                                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Odometer Section */}
                        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Odometer Start</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full p-2 border rounded-lg bg-white font-mono"
                                    value={formData.odometer_start || ''}
                                    onChange={e => setFormData({ ...formData, odometer_start: Math.max(0, Number(e.target.value)) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Odometer End</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full p-2 border rounded-lg bg-white font-mono"
                                    value={formData.odometer_end || ''}
                                    onChange={e => setFormData({ ...formData, odometer_end: Math.max(0, Number(e.target.value)) })}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Start Time</label>
                                <input type="datetime-local" className="w-full p-2 border rounded-xl bg-slate-50"
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">End Time</label>
                                <input type="datetime-local" className="w-full p-2 border rounded-xl bg-slate-50"
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Financials */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Total Rent Amount</label>
                            <input type="number" min="0" className="w-full p-2 border rounded-xl font-mono text-xl" placeholder="0.00"
                                value={formData.rent_amount}
                                onChange={e => setFormData({ ...formData, rent_amount: Math.max(0, Number(e.target.value)) })}
                            />
                        </div>

                        {/* Status (Only for edit) */}
                        {selectedRental && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                                <select
                                    className="w-full p-2 border rounded-xl bg-slate-50"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as RentalStatus })}
                                >
                                    {Object.values(RentalStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        )}


                        <div className="pt-4 flex gap-4">
                            {selectedRental && (
                                <button onClick={() => setViewMode('list')} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold hover:bg-slate-200 cursor-pointer transition">
                                    Cancel
                                </button>
                            )}
                            <button onClick={handleCreateOrUpdate} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold shadow-xl hover:bg-blue-700 active:scale-95 transition text-lg cursor-pointer">
                                {selectedRental ? 'Update Booking' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Customer Modal */}
            {isQuickCustomerOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsQuickCustomerOpen(false)}>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Quick Add Customer</h3>
                        <div className="space-y-4">
                            <input
                                placeholder="Full Name"
                                className="w-full p-2.5 border rounded-xl"
                                value={quickCustomer.name}
                                onChange={e => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
                                autoFocus
                            />
                            <input
                                placeholder="Phone Number"
                                className="w-full p-2.5 border rounded-xl"
                                value={quickCustomer.phone}
                                onChange={e => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
                            />
                            <button onClick={handleQuickCustomerSave} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 mt-2 cursor-pointer transition">
                                Save & Select
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalsView;
