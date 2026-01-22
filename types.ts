

export enum VehicleStatus {
  Active = 'Active',
  InMaintenance = 'In Maintenance',
  Inactive = 'Inactive',
}

export interface Vehicle {
  vehicleId: string;
  tenantId: string;
  type: string;
  licensePlate: string;
  capacity: number;
  status: VehicleStatus;
  lastMaintenanceDate: string; // ISO date string
}

export enum TripStatus {
  Scheduled = 'Scheduled',
  EnRoute = 'En Route',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface PassengerLog {
  from: string;
  to: string;
  count: number;
  fare: number;
}

export interface Voucher {
  passengerLogs: PassengerLog[];
  totalRevenue: number;
}

export interface Trip {
  tripId: string;
  tenantId: string;
  vehicleId: string;
  driverId: string;
  route: string[];
  departureTime: string; // HH:MM
  status: TripStatus;
  voucher?: Voucher;
  date: string; // ISO date string
}

export enum TransactionType {
  Voucher = 'Voucher',
  PrivateHire = 'Private Hire',
  Expense = 'Expense',
}

export enum ContractType {
    PerDay = 'Per Day',
    FixedPrice = 'Fixed Price',
}

export interface Transaction {
  transactionId: string;
  tenantId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // For single-day transactions or start date of a hire
  relatedTripId?: string;
  relatedVehicleId?: string;

  // Private Hire specific fields
  contractType?: ContractType;
  endDate?: string; 
}

export enum MaintenanceType {
  RoutineCheck = 'Routine Check',
  TireChange = 'Tire Change',
  EngineRepair = 'Engine Repair',
  Fuel = 'Fuel',
  Toll = 'Toll',
  Other = 'Other'
}

export interface MaintenanceRecord {
  recordId: string;
  tenantId: string;
  vehicleId: string;
  type: MaintenanceType;
  cost: number;
  date: string; // ISO date string
  notes: string;
}

export interface FinancialSummary {
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
    dailyData: { date: string; revenue: number; costs: number; profit: number }[];
}