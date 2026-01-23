import { VehicleStatus, TripStatus, TransactionType, MaintenanceType } from './types';

export const TENANT_ID = 'tgpmimpzlunsjtxdjikw';

export const VEHICLE_TYPES = ['Bus', 'Van', 'Minibus', 'Coach', 'Car', 'SUV'];
export const TRIP_TERMINALS = ['Lahore', 'Sargodha', 'Islamabad', 'Multan', 'Karachi'];
export const EXPENSE_TYPES = Object.values(MaintenanceType);

export const STATUS_COLORS: { [key in VehicleStatus | TripStatus]: string } = {
    [VehicleStatus.Active]: 'bg-green-100 text-green-800',
    [VehicleStatus.InMaintenance]: 'bg-yellow-100 text-yellow-800',
    [VehicleStatus.Inactive]: 'bg-slate-100 text-slate-800',
    [TripStatus.Scheduled]: 'bg-blue-100 text-blue-800',
    [TripStatus.EnRoute]: 'bg-indigo-100 text-indigo-800',
    [TripStatus.Completed]: 'bg-green-100 text-green-800',
    [TripStatus.Cancelled]: 'bg-red-100 text-red-800',
};

export const TRANSACTION_TYPE_COLORS: { [key in TransactionType]: string } = {
    [TransactionType.Voucher]: 'text-green-600',
    [TransactionType.PrivateHire]: 'text-blue-600',
    [TransactionType.Expense]: 'text-red-600',
    [TransactionType.MTagTopUp]: 'text-orange-600',
    [TransactionType.RentalIncome]: 'text-emerald-600',
    [TransactionType.TripExpense]: 'text-rose-600',
};

export const FARE_MATRIX: Record<string, Record<string, number>> = {
    'Lahore': { 'Sargodha': 800, 'Islamabad': 1200, 'Multan': 1000 },
    'Sargodha': { 'Islamabad': 500, 'Multan': 1300 },
    'Islamabad': { 'Multan': 1500, 'Lahore': 1200 },
    'Multan': { 'Karachi': 2500 },
};

export const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);

export const CHART_COLORS = {
    TRIP_STATUS: {
        [TripStatus.Completed]: '#22c55e',
        [TripStatus.EnRoute]: '#6366f1',
        [TripStatus.Scheduled]: '#3b82f6',
        [TripStatus.Cancelled]: '#ef4444',
    },
    EXPENSES: ['#f97316', '#eab308', '#84cc16', '#14b8a6', '#0ea5e9', '#a855f7', '#ec4899'],
};