

import { 
    Vehicle, Trip, Transaction, MaintenanceRecord, FinancialSummary, 
    VehicleStatus, TripStatus, TransactionType, MaintenanceType, Voucher, PassengerLog, ContractType 
} from '../types';
import { TENANT_ID } from '../constants';

// --- MOCK DATABASE ---

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

let vehicles: Vehicle[] = [
    { vehicleId: 'v001', tenantId: TENANT_ID, type: 'Bus', licensePlate: 'BUS-1856', capacity: 50, status: VehicleStatus.Active, lastMaintenanceDate: twoDaysAgo.toISOString() },
    { vehicleId: 'v002', tenantId: TENANT_ID, type: 'Van', licensePlate: 'VAN-4422', capacity: 12, status: VehicleStatus.Active, lastMaintenanceDate: new Date('2024-05-10').toISOString() },
    { vehicleId: 'v003', tenantId: TENANT_ID, type: 'Bus', licensePlate: 'BUS-1753', capacity: 55, status: VehicleStatus.InMaintenance, lastMaintenanceDate: new Date('2024-04-20').toISOString() },
    { vehicleId: 'v004', tenantId: TENANT_ID, type: 'Minibus', licensePlate: 'MINI-7756', capacity: 20, status: VehicleStatus.Inactive, lastMaintenanceDate: new Date('2023-12-01').toISOString() },
];

let trips: Trip[] = [
    { 
        tripId: 't001', tenantId: TENANT_ID, vehicleId: 'v001', driverId: 'd01', 
        route: ['Lahore', 'Islamabad'], departureTime: '08:00', status: TripStatus.Completed, date: today.toISOString(), 
        voucher: { 
            passengerLogs: [{ from: 'Lahore', to: 'Islamabad', count: 45, fare: 1200 }],
            totalRevenue: 54000 
        } 
    },
    { tripId: 't002', tenantId: TENANT_ID, vehicleId: 'v002', driverId: 'd02', route: ['Islamabad', 'Lahore'], departureTime: '09:30', status: TripStatus.EnRoute, date: today.toISOString() },
    { tripId: 't003', tenantId: TENANT_ID, vehicleId: 'v001', driverId: 'd01', route: ['Lahore', 'Sargodha', 'Islamabad'], departureTime: '14:00', status: TripStatus.Scheduled, date: today.toISOString() },
    { 
        tripId: 't004', tenantId: TENANT_ID, vehicleId: 'v001', driverId: 'd03', 
        route: ['Multan', 'Lahore'], departureTime: '11:00', status: TripStatus.Completed, date: yesterday.toISOString(), 
        voucher: { 
            passengerLogs: [{ from: 'Multan', to: 'Lahore', count: 30, fare: 1000 }],
            totalRevenue: 30000 
        } 
    },
];

let maintenanceRecords: MaintenanceRecord[] = [
    { recordId: 'm001', tenantId: TENANT_ID, vehicleId: 'v003', type: MaintenanceType.EngineRepair, cost: 15000, date: new Date('2024-07-20').toISOString(), notes: 'Full engine overhaul.' },
    { recordId: 'm002', tenantId: TENANT_ID, vehicleId: 'v001', type: MaintenanceType.TireChange, cost: 2000, date: new Date('2024-07-15').toISOString(), notes: 'Replaced all 4 tires.' },
    { recordId: 'm003', tenantId: TENANT_ID, vehicleId: 'v001', type: MaintenanceType.Fuel, cost: 350, date: today.toISOString(), notes: 'Full tank.' },
    { recordId: 'm004', tenantId: TENANT_ID, vehicleId: 'v002', type: MaintenanceType.Fuel, cost: 120, date: yesterday.toISOString(), notes: 'Full tank.' },
];

let transactions: Transaction[] = [
    { transactionId: 'tr001', tenantId: TENANT_ID, type: TransactionType.Voucher, amount: 54000, description: 'Voucher for trip t001', date: today.toISOString(), relatedTripId: 't001', relatedVehicleId: 'v001'},
    { transactionId: 'tr002', tenantId: TENANT_ID, type: TransactionType.Voucher, amount: 30000, description: 'Voucher for trip t004', date: yesterday.toISOString(), relatedTripId: 't004', relatedVehicleId: 'v001'},
    { transactionId: 'tr003', tenantId: TENANT_ID, type: TransactionType.Expense, amount: 15000, description: 'Engine Repair for BUS-1753', date: new Date('2024-07-20').toISOString(), relatedVehicleId: 'v003'},
    { transactionId: 'tr004', tenantId: TENANT_ID, type: TransactionType.Expense, amount: 350, description: 'Fuel for BUS-1856', date: today.toISOString(), relatedVehicleId: 'v001'},
    { 
        transactionId: 'tr005', 
        tenantId: TENANT_ID, 
        type: TransactionType.PrivateHire, 
        amount: 12000, 
        description: '3-day corporate hire to Murree', 
        date: twoDaysAgo.toISOString(), // Start Date
        endDate: today.toISOString(), // End Date
        relatedVehicleId: 'v002',
        contractType: ContractType.PerDay,
    },
];

// --- MOCK API FUNCTIONS ---
const mockApiCall = <T,>(data: T, delay = 500): Promise<T> => 
    new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), delay));

// Fleet Management
export const getVehicles = () => mockApiCall(vehicles);
export const getVehicle = (id: string) => mockApiCall(vehicles.find(v => v.vehicleId === id));
export const createVehicle = (vehicleData: Omit<Vehicle, 'vehicleId' | 'tenantId'>) => {
    const newVehicle: Vehicle = {
        ...vehicleData,
        vehicleId: `v${Date.now()}`,
        tenantId: TENANT_ID,
    };
    vehicles.push(newVehicle);
    return mockApiCall(newVehicle);
};
export const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    vehicles = vehicles.map(v => v.vehicleId === id ? { ...v, ...updates } : v);
    return mockApiCall(vehicles.find(v => v.vehicleId === id));
};

// Trip Management
export const getTrips = () => mockApiCall(trips);
export const getTrip = (id: string) => mockApiCall(trips.find(t => t.tripId === id));
export const createTrip = (tripData: Omit<Trip, 'tripId' | 'tenantId' | 'status'>) => {
    const newTrip: Trip = {
        ...tripData,
        tripId: `t${Date.now()}`,
        tenantId: TENANT_ID,
        status: TripStatus.Scheduled,
    };
    trips.push(newTrip);
    return mockApiCall(newTrip);
};
export const updateTripStatus = (id: string, status: TripStatus) => {
    trips = trips.map(t => t.tripId === id ? { ...t, status } : t);
    return mockApiCall(trips.find(t => t.tripId === id));
};
export const generateVoucher = (id: string, passengerLogs: PassengerLog[]) => {
    const totalRevenue = passengerLogs.reduce((sum, log) => sum + (log.count * log.fare), 0);
    const newVoucher: Voucher = { passengerLogs, totalRevenue };
    
    trips = trips.map(t => t.tripId === id ? { ...t, voucher: newVoucher, status: TripStatus.Completed } : t);
    const updatedTrip = trips.find(t => t.tripId === id);
    
    if(updatedTrip && updatedTrip.voucher) {
        // Remove old transaction for this trip if it exists, to prevent duplicates
        transactions = transactions.filter(t => t.relatedTripId !== id);

        const newTransaction: Transaction = {
            transactionId: `tr${Date.now()}`,
            tenantId: TENANT_ID,
            type: TransactionType.Voucher,
            amount: updatedTrip.voucher.totalRevenue,
            description: `Voucher for trip ${updatedTrip.route.join(' → ')}`,
            date: updatedTrip.date,
            relatedTripId: id,
            relatedVehicleId: updatedTrip.vehicleId,
        };
        transactions.push(newTransaction);
    }
    return mockApiCall(updatedTrip);
};

// Financials
export const getFinanceSummary = (): Promise<FinancialSummary> => {
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

    return mockApiCall(summary);
};
export const getTransactions = () => mockApiCall(transactions);
export const createExpense = (expenseData: Omit<Transaction, 'transactionId' | 'tenantId' | 'type'>) => {
    const newExpense: Transaction = {
        ...expenseData,
        transactionId: `tr${Date.now()}`,
        tenantId: TENANT_ID,
        type: TransactionType.Expense,
    };
    transactions.push(newExpense);
    return mockApiCall(newExpense);
};
export const createPrivateHire = (hireData: Omit<Transaction, 'transactionId' | 'tenantId' | 'type'>) => {
    const newHire: Transaction = {
        ...hireData,
        transactionId: `tr${Date.now()}`,
        tenantId: TENANT_ID,
        type: TransactionType.PrivateHire,
    };
    transactions.push(newHire);
    return mockApiCall(newHire);
}

// Maintenance
export const getMaintenanceHistory = () => mockApiCall(maintenanceRecords);
export const createMaintenanceRecord = (recordData: Omit<MaintenanceRecord, 'recordId' | 'tenantId'>) => {
    const newRecord: MaintenanceRecord = {
        ...recordData,
        recordId: `m${Date.now()}`,
        tenantId: TENANT_ID,
    };
    maintenanceRecords.push(newRecord);
    
    // Create corresponding expense transaction
    const vehicle = vehicles.find(v => v.vehicleId === newRecord.vehicleId);
    const newTransaction: Transaction = {
        transactionId: `tr${Date.now()}`,
        tenantId: TENANT_ID,
        type: TransactionType.Expense,
        amount: newRecord.cost,
        description: `${newRecord.type} for ${vehicle?.licensePlate || newRecord.vehicleId}`,
        date: newRecord.date,
        relatedVehicleId: newRecord.vehicleId,
    };
    transactions.push(newTransaction);

    return mockApiCall(newRecord);
};