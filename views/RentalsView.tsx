import React, { useState, useEffect } from 'react';
import { Customer, Driver, Rental, RentalStatus, Vehicle, RentalType, ContractType, CustomerSource } from '../types';
import { getRentals, getCustomers, getDrivers, getVehicles, createRental, createCustomer, updateRental, deleteRental, getSettings, updateSettings } from '../services/api';
import { formatCurrency, RIDE_EXPENSE_TYPES } from '../constants';
import toast from 'react-hot-toast';
import { PlusIcon } from '../components/icons';
import SearchableSelect from '../components/SearchableSelect';
import MultiSearchableSelect from '../components/MultiSearchableSelect';
import GoogleAutocompleteInput from '../components/GoogleAutocompleteInput';

const formatDateForInput = (dateValue: string | Date | undefined) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
};

const RentalsView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list');
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedRental, setSelectedRental] = useState<Rental | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Rental>>({
        rental_type: RentalType.WithDriver,
        start_time: formatDateForInput(new Date()),
        end_time: formatDateForInput(new Date(Date.now() + 86400000)),
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
        self_drive_cnic: '',
        self_drive_phone: '',
        guarantor_name: '',
        guarantor_info: '',
        guarantor_cnic: '',
        guarantor_phone: '',
        amount_type: ContractType.FixedPrice,
        ride_expenses: [],
        inspection_notes: '',
        commission_amount: 0,
        affiliated_id: '',
        allowed_cities: []
    });

    // Quick Customer Modal
    const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
    const [quickCustomer, setQuickCustomer] = useState({
        name: '',
        phone: '',
        source: CustomerSource.Direct,
        reference_name: '',
        reference_phone: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [r, v, c, d, s] = await Promise.all([getRentals(), getVehicles(), getCustomers(), getDrivers(), getSettings()]);
            setRentals(r);
            setVehicles(v);
            setCustomers(c);
            setDrivers(d);
            setLocations(s?.locations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            if (!formData.vehicle_id || (!formData.customer_id && !formData.affiliated_id) || !formData.start_time || !formData.end_time) {
                toast.error("Please fill all required fields (Vehicle, Customer/Partner, and Timing)");
                return;
            }
            if (new Date(formData.end_time || '') <= new Date(formData.start_time || '')) {
                toast.error("End time must be after start time");
                return;
            }

            if (formData.odometer_end && (formData.odometer_end < (formData.odometer_start || 0))) {
                toast.error("Odometer end reading cannot be less than start reading");
                return;
            }

            if ((formData.rent_amount || 0) < 0) {
                toast.error("Rent amount cannot be negative");
                return;
            }

            if ((formData.commission_amount || 0) < 0) {
                toast.error("Commission amount cannot be negative");
                return;
            }

            if (formData.rental_type === RentalType.WithDriver && !formData.driver_id) {
                toast.error("Please select a driver for 'With Driver' booking");
                return;
            }

            const dataToSave = {
                ...formData,
                start_time: new Date(formData.start_time || '').toISOString(),
                end_time: new Date(formData.end_time || '').toISOString(),
            };

            if (selectedRental) {
                await updateRental(selectedRental.id, dataToSave);
                toast.success("Booking updated successfully");
            } else {
                await createRental(dataToSave as any);
                toast.success("Booking confirmed successfully");
            }

            setViewMode('list');
            setSelectedRental(null);
            loadData();
        } catch (e) {
            toast.error("Error saving rental");
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this rental?")) return;
        try {
            await deleteRental(id);
            toast.success("Rental deleted successfully");
            loadData();
        } catch (e) {
            toast.error("Failed to delete rental");
        }
    }

    const handleQuickCustomerSave = async () => {
        if (!quickCustomer.name || !quickCustomer.phone) return;
        try {
            const newCust = await createCustomer({ ...quickCustomer, tenant_id: '' } as any);
            toast.success("Customer added successfully");
            await loadData();
            setFormData(prev => ({ ...prev, customer_id: newCust.id }));
            setIsQuickCustomerOpen(false);
            setQuickCustomer({
                name: '',
                phone: '',
                source: CustomerSource.Direct,
                reference_name: '',
                reference_phone: ''
            });
        } catch (e) {
            toast.error("Failed to create customer");
        }
    }

    const openEdit = (rental: Rental) => {
        setSelectedRental(rental);
        setFormData({
            ...rental,
            start_time: formatDateForInput(rental.start_time),
            end_time: formatDateForInput(rental.end_time),
            ride_expenses: rental.ride_expenses || [],
            allowed_cities: rental.allowed_cities || []
        });
        setViewMode('create');
    }

    const openCreate = () => {
        setSelectedRental(null);
        setFormData({
            rental_type: RentalType.WithDriver,
            start_time: formatDateForInput(new Date()),
            end_time: formatDateForInput(new Date(Date.now() + 86400000)),
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
            self_drive_cnic: '',
            self_drive_phone: '',
            guarantor_name: '',
            guarantor_info: '',
            guarantor_cnic: '',
            guarantor_phone: '',
            amount_type: ContractType.FixedPrice,
            ride_expenses: [],
            inspection_notes: '',
            commission_amount: 0,
            affiliated_id: '',
            allowed_cities: []
        });
        setViewMode('create');
    }

    const handleAddExpense = () => {
        setFormData(prev => ({
            ...prev,
            ride_expenses: [...(prev.ride_expenses || []), { type: RIDE_EXPENSE_TYPES[0], amount: 0 }]
        }));
    };

    const handleRemoveExpense = (index: number) => {
        setFormData(prev => ({
            ...prev,
            ride_expenses: (prev.ride_expenses || []).filter((_, i) => i !== index)
        }));
    };

    const handleExpenseChange = (index: number, field: 'type' | 'amount', value: any) => {
        setFormData(prev => {
            const updated = [...(prev.ride_expenses || [])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, ride_expenses: updated };
        });
    };

    const handleAddNewLocation = async (newLoc: string) => {
        if (!newLoc) return;
        try {
            const currentSettings = await getSettings();
            const updatedLocations = [...(currentSettings?.locations || []), newLoc];
            await updateSettings({ locations: updatedLocations });
            setLocations(updatedLocations);
        } catch (error) {
            console.error("Failed to add new location:", error);
        }
    };

    if (loading) return <div className="p-4 text-center">Loading Rentals...</div>;

    const availableDrivers = drivers.filter(d => d.status === 'Available' || d.id === formData.driver_id);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20 px-4">
            <header className="flex justify-between items-center sticky top-0 bg-slate-50 z-10 py-4 shadow-sm px-4 rounded-xl">
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
                        const affiliate = customers.find(c => c.id === rental.affiliated_id);
                        const displayName = customer?.name || affiliate?.name || 'Unknown';
                        const vehicle = vehicles.find(v => v.id === rental.vehicle_id);
                        const isWithDriver = rental.rental_type === RentalType.WithDriver;

                        return (
                            <div key={rental.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition relative group pt-8">
                                <div className="absolute top-2 right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(rental); }}
                                        className="p-1.5 cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        title="Edit"
                                    >✎</button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(rental.id); }}
                                        className="p-1.5 cursor-pointer text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete"
                                    >🗑</button>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${rental.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {rental.status}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">{new Date(rental.start_time).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{displayName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-mono bg-slate-100 px-1.5 rounded">{vehicle?.license_plate}</span>
                                    <span className="text-xs text-slate-500 uppercase">{vehicle?.type}</span>
                                </div>
                                <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400">Type</span>
                                        <span className="font-medium text-slate-700">{isWithDriver ? 'With Driver' : 'Self Drive'}</span>
                                        {!isWithDriver && rental.guarantor_name && (
                                            <span className="text-[10px] text-orange-600 font-bold italic mt-0.5">Gur: {rental.guarantor_name}</span>
                                        )}
                                    </div>

                                    <div className="flex flex-col text-right">
                                        {(rental.odometer_end && rental.odometer_start) ? (
                                            <div className="mb-2">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Mileage</p>
                                                <p className="text-xs font-mono font-bold text-indigo-600">{(rental.odometer_end - rental.odometer_start).toLocaleString()} km</p>
                                            </div>
                                        ) : null}
                                        <span className="text-xs text-slate-400">Rent</span>
                                        <span className="font-mono font-bold text-blue-600">
                                            {formatCurrency(rental.rent_amount)}
                                        </span>
                                        {rental.commission_amount ? (
                                            <span className="text-[10px] text-red-500 font-bold block">
                                                Com: {formatCurrency(rental.commission_amount)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {viewMode === 'create' && (
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl mx-auto border border-slate-100">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">{selectedRental ? 'Edit Booking' : 'New Booking'}</h2>
                    <div className="space-y-6">
                        <div className="p-1 bg-slate-100 rounded-xl flex gap-1">
                            {([RentalType.WithDriver, RentalType.SelfDrive]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFormData(prev => ({ ...prev, rental_type: type }))}
                                    className={`flex-1 py-3 cursor-pointer text-sm font-bold rounded-lg transition ${formData.rental_type === type ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Vehicle</label>
                                <SearchableSelect
                                    options={vehicles.filter(v => v.status === 'Active' || v.id === formData.vehicle_id).map(v => ({
                                        value: v.id,
                                        label: `(${v.type}) ${v.license_plate}`
                                    }))}
                                    value={formData.vehicle_id || ''}
                                    onChange={(val) => {
                                        const vehicle = vehicles.find(v => v.id === val);
                                        setFormData({
                                            ...formData,
                                            vehicle_id: val,
                                            odometer_start: vehicle?.current_odometer || formData.odometer_start
                                        });
                                    }}
                                    placeholder="Search Vehicle..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Customer</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={customers.filter(c => c.source !== CustomerSource.Affiliated).map(c => ({ value: c.id, label: c.name }))}
                                            value={formData.customer_id || ''}
                                            onChange={(val) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    customer_id: val
                                                }));
                                            }}
                                            placeholder="Search Customer..."
                                        />
                                    </div>
                                    <button onClick={() => setIsQuickCustomerOpen(true)} className="bg-blue-100 text-blue-600 w-14 rounded-xl flex items-center justify-center hover:bg-blue-200 transition">
                                        <PlusIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Affiliate Partner (Booking Source)</label>
                            <SearchableSelect
                                options={customers.filter(c => c.source === CustomerSource.Affiliated).map(c => ({ value: c.id, label: c.name }))}
                                value={formData.affiliated_id || ''}
                                onChange={(val) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        affiliated_id: val
                                    }));
                                }}
                                placeholder="Pick an Affiliate Partner"
                                className="border-purple-200"
                            />
                        </div>

                        {formData.rental_type === RentalType.WithDriver ? (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-sm font-bold text-blue-800 mb-2">Assign Driver</label>
                                <SearchableSelect
                                    options={availableDrivers.map(d => ({ value: d.id, label: `${d.name} (${d.status})` }))}
                                    value={formData.driver_id || ''}
                                    onChange={(val) => setFormData({ ...formData, driver_id: val })}
                                    placeholder="Search Driver..."
                                    className="bg-white"
                                />
                            </div>
                        ) : (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Driver Name" className="w-full p-2 border rounded-xl bg-white" value={formData.self_drive_name || ''} onChange={e => setFormData({ ...formData, self_drive_name: e.target.value })} />
                                    <input type="number" placeholder="Driver Phone" className="w-full p-2 border rounded-xl bg-white" value={formData.self_drive_phone || ''} onChange={e => setFormData({ ...formData, self_drive_phone: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="License No" className="w-full p-2 border rounded-xl bg-white" value={formData.self_drive_license || ''} onChange={e => setFormData({ ...formData, self_drive_license: e.target.value })} />
                                    <input placeholder="CNIC No" className="w-full p-2 border rounded-xl bg-white" value={formData.self_drive_cnic || ''} onChange={e => setFormData({ ...formData, self_drive_cnic: e.target.value })} />
                                </div>
                                <div className="pt-2 border-t border-orange-200">
                                    <p className="text-[10px] font-bold text-orange-600 uppercase mb-2 tracking-wider">Guarantor Details</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <input placeholder="Guarantor Name" className="w-full p-2 border rounded-xl bg-white text-sm" value={formData.guarantor_name || ''} onChange={e => setFormData({ ...formData, guarantor_name: e.target.value })} />
                                        <input placeholder="Guarantor CNIC" className="w-full p-2 border rounded-xl bg-white text-sm" value={formData.guarantor_cnic || ''} onChange={e => setFormData({ ...formData, guarantor_cnic: e.target.value })} />
                                        <input type="number" placeholder="Guarantor Phone" className="w-full p-2 border rounded-xl bg-white text-sm" value={formData.guarantor_phone || ''} onChange={e => setFormData({ ...formData, guarantor_phone: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <GoogleAutocompleteInput
                                placeholder="Start Location"
                                value={formData.pickup_location || ''}
                                onChange={(val) => setFormData({ ...formData, pickup_location: val })}
                            />
                            <input placeholder="Destination" className="w-full p-2 border rounded-xl bg-slate-50" value={formData.destination || ''} onChange={e => setFormData({ ...formData, destination: e.target.value })} />
                        </div>

                        {/* Odometer Section */}
                        <div className="grid grid-cols-3 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
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
                            <div>
                                <label className="block text-xs font-bold text-indigo-500 uppercase mb-2">Total Mileage</label>
                                <input
                                    type="number"
                                    disabled
                                    className="w-full p-2 border rounded-lg bg-indigo-50 font-mono font-bold text-indigo-700"
                                    value={Math.max(0, (formData.odometer_end || 0) - (formData.odometer_start || 0))}
                                />
                            </div>
                        </div>

                        {/* Ride Expenses Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-bold text-slate-700">Ride Expenses</label>
                                <button
                                    type="button"
                                    onClick={handleAddExpense}
                                    className="text-xs bg-indigo-50 cursor-pointer text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-bold transition flex items-center gap-1"
                                >
                                    <PlusIcon /> Add Expense
                                </button>
                            </div>

                            <div className="space-y-4">
                                {(formData.ride_expenses || []).map((expense, index) => {
                                    const isStandardType = RIDE_EXPENSE_TYPES.includes(expense.type) && expense.type !== 'Other';
                                    return (
                                        <div key={index} className="flex gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Expense Type</label>
                                                <div className="flex flex-col gap-2">
                                                    <select
                                                        className="w-full p-2 border rounded-lg bg-white text-sm"
                                                        value={isStandardType ? expense.type : 'Other'}
                                                        onChange={e => handleExpenseChange(index, 'type', e.target.value)}
                                                    >
                                                        {RIDE_EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>

                                                    {(!isStandardType || expense.type === 'Other') && (
                                                        <input
                                                            type="text"
                                                            placeholder="Describe custom expense..."
                                                            className="w-full p-2 border rounded-lg bg-white text-sm"
                                                            value={expense.type === 'Other' ? '' : expense.type}
                                                            onChange={e => handleExpenseChange(index, 'type', e.target.value)}
                                                            autoFocus={expense.type === 'Other'}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-32 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Amount</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full p-2 border rounded-lg bg-white text-sm font-mono"
                                                    value={expense.amount || ''}
                                                    onChange={e => handleExpenseChange(index, 'amount', Math.max(0, parseInt(e.target.value) || 0))}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExpense(index)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition mb-0.5"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                                <input type="datetime-local" className="w-full p-2 border rounded-xl bg-slate-50" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                                <input type="datetime-local" className="w-full p-2 border rounded-xl bg-slate-50" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <select className="w-1/3 p-2 border rounded-xl bg-slate-50" value={formData.amount_type} onChange={e => setFormData({ ...formData, amount_type: e.target.value as ContractType })}>
                                    <option value={ContractType.FixedPrice}>Fixed Price</option>
                                    <option value={ContractType.PerDay}>Per Day</option>
                                </select>
                                <input type="number" placeholder="Rent Amount" className="w-2/3 p-2 border rounded-xl font-mono text-xl" value={formData.rent_amount} onChange={e => setFormData({ ...formData, rent_amount: Number(e.target.value) })} />
                            </div>

                            {(() => {
                                const selectedCustomer = customers.find(c => c.id === formData.customer_id);
                                const selectedAffiliate = customers.find(c => c.id === formData.affiliated_id);

                                if (selectedAffiliate || selectedCustomer?.source === CustomerSource.Affiliated) {
                                    return (
                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                            <label className="block text-sm font-bold text-purple-800 mb-1">Commission Amount</label>
                                            <input type="number" className="w-full p-2 border rounded-xl bg-white font-mono text-purple-700" value={formData.commission_amount || ''} onChange={e => setFormData({ ...formData, commission_amount: Number(e.target.value) })} />
                                            <p className="text-[10px] text-purple-400 mt-1 font-bold uppercase italic">Affiliate Booking</p>
                                        </div>
                                    );
                                }
                                // if (selectedCustomer?.source === CustomerSource.Reference) {
                                //     return (
                                //         <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                //             <label className="block text-sm font-bold text-orange-800 mb-2">Referrer Details</label>
                                //             <div className="grid grid-cols-2 gap-4">
                                //                 <div className="bg-white p-2 rounded-lg border border-orange-200">
                                //                     <p className="text-[10px] text-orange-400 font-bold uppercase">Name</p>
                                //                     <p className="font-medium text-slate-800">{selectedCustomer.reference_name || 'N/A'}</p>
                                //                 </div>
                                //                 <div className="bg-white p-2 rounded-lg border border-orange-200">
                                //                     <p className="text-[10px] text-orange-400 font-bold uppercase">Phone</p>
                                //                     <p className="font-mono font-medium text-slate-800">{selectedCustomer.reference_phone || 'N/A'}</p>
                                //                 </div>
                                //             </div>
                                //         </div>
                                //     );
                                // }
                                return null;
                            })()}
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <MultiSearchableSelect
                                options={locations}
                                selected={formData.allowed_cities || []}
                                onChange={(selected) => setFormData({ ...formData, allowed_cities: selected })}
                                onAddNew={handleAddNewLocation}
                                label="Allowed Cities"
                                placeholder="Select cities..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Internal Notes / Inspection Remarks</label>
                            <textarea
                                className="w-full p-2 border rounded-xl bg-slate-50 text-sm"
                                rows={3}
                                placeholder="Any dents, scratches, or special instructions..."
                                value={formData.inspection_notes || ''}
                                onChange={e => setFormData({ ...formData, inspection_notes: e.target.value })}
                            />
                        </div>

                        <select className="w-full p-2 border rounded-xl bg-slate-50" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as RentalStatus })}>
                            {Object.values(RentalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <div className="pt-4 flex gap-4">
                            <button onClick={handleCreateOrUpdate} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-xl hover:bg-blue-700 transition">
                                {selectedRental ? 'Update Booking' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isQuickCustomerOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsQuickCustomerOpen(false)}>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Quick Add Customer</h3>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                {Object.values(CustomerSource).map(s => (
                                    <label key={s} className="flex-1 text-center p-2 rounded-lg border cursor-pointer text-xs font-bold transition-colors" style={{ backgroundColor: quickCustomer.source === s ? '#EEF2FF' : 'transparent', color: quickCustomer.source === s ? '#4F46E5' : '#64748B', borderColor: quickCustomer.source === s ? '#4F46E5' : '#E2E8F0' }}>
                                        <input type="radio" className="hidden" name="source" value={s} checked={quickCustomer.source === s} onChange={() => setQuickCustomer({ ...quickCustomer, source: s })} />
                                        {s}
                                    </label>
                                ))}
                            </div>
                            <input placeholder="Full Name" className="w-full p-2.5 border rounded-xl" value={quickCustomer.name} onChange={e => setQuickCustomer({ ...quickCustomer, name: e.target.value })} />
                            <input type="number" placeholder="Phone Number" className="w-full p-2.5 border rounded-xl" value={quickCustomer.phone} onChange={e => setQuickCustomer({ ...quickCustomer, phone: e.target.value })} />

                            {quickCustomer.source === CustomerSource.Reference && (
                                <div className="space-y-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                    <input placeholder="Referrer Name" className="w-full p-2 border rounded-lg text-sm" value={quickCustomer.reference_name} onChange={e => setQuickCustomer({ ...quickCustomer, reference_name: e.target.value })} />
                                    <input type="number" placeholder="Referrer Phone" className="w-full p-2 border rounded-lg text-sm" value={quickCustomer.reference_phone} onChange={e => setQuickCustomer({ ...quickCustomer, reference_phone: e.target.value })} />
                                </div>
                            )}

                            <button onClick={handleQuickCustomerSave} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Save & Select</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalsView;
