

import {
    Vehicle, Trip, Transaction, MaintenanceRecord, FinancialSummary,
    VehicleStatus, TripStatus, TransactionType, MaintenanceType, Voucher, PassengerLog, ContractType
} from '../types';
import { TENANT_ID } from '../constants';
import { supabase } from './supabaseClient';

// --- API FUNCTIONS ---

// Fleet Management
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase.from('vehicles').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as Vehicle[];
};

export const getVehicle = async (id: string): Promise<Vehicle | undefined> => {
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data as Vehicle;
};

export const createVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'tenant_id'>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').insert([{ ...vehicleData, tenant_id: TENANT_ID }]).select();
    if (error) throw new Error(error.message);
    return data[0] as Vehicle;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').update(updates).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Vehicle;
};

// Trip Management
export const getTrips = async (): Promise<Trip[]> => {
    const { data, error } = await supabase.from('trips').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as Trip[];
};

export const getTrip = async (id: string): Promise<Trip | undefined> => {
    const { data, error } = await supabase.from('trips').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data as Trip;
};

export const createTrip = async (tripData: Omit<Trip, 'id' | 'tenant_id' | 'status'>): Promise<Trip> => {
    const { data, error } = await supabase.from('trips').insert([{ ...tripData, tenant_id: TENANT_ID, status: TripStatus.Scheduled }]).select();
    if (error) throw new Error(error.message);
    return data[0] as Trip;
};

export const updateTripStatus = async (id: string, status: TripStatus): Promise<Trip> => {
    const { data, error } = await supabase.from('trips').update({ status }).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Trip;
};

export const generateVoucher = async (id: string, passengerLogs: PassengerLog[]): Promise<Trip> => {
    const totalRevenue = passengerLogs.reduce((sum, log) => sum + (log.count * log.fare), 0);
    const newVoucher: Voucher = { passengerLogs, totalRevenue };

    const { data: updatedTrip, error: updateTripError } = await supabase
        .from('trips')
        .update({ voucher: newVoucher, status: TripStatus.Completed })
        .eq('id', id)
        .select()
        .single();

    if (updateTripError) throw new Error(updateTripError.message);

    if (updatedTrip && updatedTrip.voucher) {
        await supabase.from('financial_transactions').delete().eq('trip_id', id);

        const newTransaction: Omit<Transaction, 'id'> = {
            tenant_id: TENANT_ID,
            type: TransactionType.Voucher,
            amount: totalRevenue,
            description: `Voucher for trip ${updatedTrip.route.join(' → ')}`,
            date: updatedTrip.date,
            trip_id: id,
            vehicle_id: updatedTrip.vehicle_id,
        };
        const { error: transactionError } = await supabase.from('financial_transactions').insert([newTransaction]);
        if (transactionError) throw new Error(transactionError.message);
    }
    return updatedTrip as Trip;
};

// Financials
export const getFinanceSummary = async (): Promise<FinancialSummary> => {
    const { data: transactions, error } = await supabase.from('financial_transactions').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);

    const summary: FinancialSummary = {
        totalRevenue: 0,
        totalCosts: 0,
        netProfit: 0,
        dailyData: []
    };
    const dailyMap: { [key: string]: { revenue: number, costs: number } } = {};

    transactions.forEach(t => {
        const dateStr = new Date(t.date).toISOString().split('T')[0];
        if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { revenue: 0, costs: 0 };
        }
        if (t.type === TransactionType.Expense) {
            summary.totalCosts += t.amount;
            dailyMap[dateStr].costs += t.amount;
        } else {
            summary.totalRevenue += t.amount;
            dailyMap[dateStr].revenue += t.amount;
        }
    });

    summary.netProfit = summary.totalRevenue - summary.totalCosts;
    summary.dailyData = Object.keys(dailyMap).sort().map(date => ({
        date,
        revenue: dailyMap[date].revenue,
        costs: dailyMap[date].costs,
        profit: dailyMap[date].revenue - dailyMap[date].costs
    }));

    return summary;
};

export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase.from('financial_transactions').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as Transaction[];
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
    const { data, error } = await supabase.from('financial_transactions').update(transaction).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Transaction;
};

export const createExpense = async (expenseData: Omit<Transaction, 'id' | 'tenant_id' | 'type'>): Promise<Transaction> => {
    const newExpense = {
        ...expenseData,
        tenant_id: TENANT_ID,
        type: TransactionType.Expense,
    };
    const { data, error } = await supabase.from('financial_transactions').insert([newExpense]).select();
    if (error) throw new Error(error.message);
    return data[0] as Transaction;
};

export const createPrivateHire = async (hireData: Omit<Transaction, 'id' | 'tenant_id' | 'type'>): Promise<Transaction> => {
    const newHire = {
        ...hireData,
        tenant_id: TENANT_ID,
        type: TransactionType.PrivateHire,
    };
    const { data, error } = await supabase.from('financial_transactions').insert([newHire]).select();
    if (error) throw new Error(error.message);
    return data[0] as Transaction;
}

// Maintenance
export const getMaintenanceHistory = async (): Promise<MaintenanceRecord[]> => {
    const { data, error } = await supabase.from('maintenance_records').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as MaintenanceRecord[];
};

export const createMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id' | 'tenant_id'>): Promise<MaintenanceRecord> => {
    const newRecord = {
        ...recordData,
        tenant_id: TENANT_ID,
    };
    const { data, error } = await supabase.from('maintenance_records').insert([newRecord]).select();
    if (error) throw new Error(error.message);

    // Create corresponding expense transaction
    const vehicle = await getVehicle(newRecord.vehicle_id);
    const newTransaction = {
        tenant_id: TENANT_ID,
        type: TransactionType.Expense,
        amount: newRecord.cost,
        description: `${newRecord.type} for ${vehicle?.license_plate || newRecord.vehicle_id}`,
        date: newRecord.date,
        vehicle_id: newRecord.vehicle_id,
    };
    await createExpense(newTransaction);

    return data[0] as MaintenanceRecord;
};

// --- NEW MODULES: Customers, Drivers, Rentals ---

// Customers
import { Customer, Driver, Rental, RentalStatus, TransactionType as TxType } from '../types';

export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as Customer[];
};

export const createCustomer = async (customer: Omit<Customer, 'id' | 'tenant_id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert([{ ...customer, tenant_id: TENANT_ID }]).select();
    if (error) throw new Error(error.message);
    return data[0] as Customer;
};

export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Customer;
};

// Drivers
export const getDrivers = async (): Promise<Driver[]> => {
    const { data, error } = await supabase.from('drivers').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as Driver[];
};

export const createDriver = async (driver: Omit<Driver, 'id' | 'tenant_id'>): Promise<Driver> => {
    const { data, error } = await supabase.from('drivers').insert([{ ...driver, tenant_id: TENANT_ID }]).select();
    if (error) throw new Error(error.message);
    return data[0] as Driver;
};

export const updateDriver = async (id: string, driver: Partial<Driver>): Promise<Driver> => {
    const { data, error } = await supabase.from('drivers').update(driver).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Driver;
};

// Rentals
export const getRentals = async (): Promise<Rental[]> => {
    const { data, error } = await supabase.from('rentals').select('*').eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
    return data as Rental[];
};

export const createRental = async (rental: Omit<Rental, 'id' | 'tenant_id' | 'status'>): Promise<Rental> => {
    const { data, error } = await supabase.from('rentals').insert([{
        ...rental,
        tenant_id: TENANT_ID,
        status: RentalStatus.Reserved
    }]).select();
    if (error) throw new Error(error.message);
    return data[0] as Rental;
};

export const updateRental = async (id: string, rental: Partial<Rental>): Promise<Rental> => {
    const { data, error } = await supabase.from('rentals').update(rental).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Rental;
};

export const updateRentalStatus = async (id: string, status: RentalStatus): Promise<Rental> => {
    const { data, error } = await supabase.from('rentals').update({ status }).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0] as Rental;
};

// Complex Logic: Complete Rental
export const completeRental = async (id: string, completionData: {
    odometer_end: number;
    fuel_cost: number;
    toll_cost: number;
    driver_allowance: number;
    other_expenses: number;
}): Promise<Rental> => {
    // 1. Fetch current rental
    const { data: rental, error: fetchError } = await supabase.from('rentals').select('*').eq('id', id).single();
    if (fetchError || !rental) throw new Error("Rental not found");

    const total_cost = completionData.fuel_cost + completionData.toll_cost + completionData.driver_allowance + completionData.other_expenses;
    const net_profit = rental.rent_amount - total_cost;

    // 2. Update Rental Record
    const { data: updatedRental, error: updateError } = await supabase
        .from('rentals')
        .update({
            ...completionData,
            total_cost,
            net_profit,
            status: RentalStatus.Completed,
            end_time: new Date().toISOString() // Or user provided
        })
        .eq('id', id)
        .select()
        .single();
    if (updateError) throw new Error(updateError.message);

    // 3. Update Vehicle (Odometer + M-Tag Deduction)
    const { data: vehicle } = await supabase.from('vehicles').select('m_tag_balance').eq('id', rental.vehicle_id).single();
    const currentMTag = vehicle?.m_tag_balance || 0;

    await supabase.from('vehicles').update({
        current_odometer: completionData.odometer_end,
        m_tag_balance: currentMTag - completionData.toll_cost
    }).eq('id', rental.vehicle_id);

    // 4. Create Financial Transaction (Income)
    await supabase.from('financial_transactions').insert([{
        tenant_id: TENANT_ID,
        rental_id: id,
        type: TxType.RentalIncome,
        amount: rental.rent_amount,
        description: `Rental Income: ${rental.id}`,
        date: new Date().toISOString(),
        vehicle_id: rental.vehicle_id
    }]);

    // 5. Log Expenses
    if (total_cost > 0) {
        await supabase.from('financial_transactions').insert([{
            tenant_id: TENANT_ID,
            rental_id: id,
            type: TxType.TripExpense,
            amount: total_cost,
            description: `Rental Expenses (Fuel: ${completionData.fuel_cost}, Toll: ${completionData.toll_cost}, Driver: ${completionData.driver_allowance})`,
            date: new Date().toISOString(),
            vehicle_id: rental.vehicle_id
        }]);
    }

    return updatedRental as Rental;
};

// M-Tag Wallet
export const topUpMTag = async (vehicleId: string, amount: number): Promise<Vehicle> => {
    // 1. Get current vehicle
    const { data: vehicle, error: fetchError } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
    if (fetchError || !vehicle) throw new Error("Vehicle not found");

    // 2. Update Balance
    const newBalance = (vehicle.m_tag_balance || 0) + amount;
    const { data: updatedVehicle, error: updateError } = await supabase
        .from('vehicles')
        .update({ m_tag_balance: newBalance })
        .eq('id', vehicleId)
        .select()
        .single();

    if (updateError) throw new Error(updateError.message);

    // 3. Log Transaction (Expense)
    await supabase.from('financial_transactions').insert([{
        tenant_id: TENANT_ID,
        vehicle_id: vehicleId,
        type: TxType.MTagTopUp,
        amount: amount,
        description: `M-Tag Top Up for ${vehicle.license_plate}`,
        date: new Date().toISOString()
    }]);

    return updatedVehicle as Vehicle;
};