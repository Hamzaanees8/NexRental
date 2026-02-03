
export enum CustomerSource {
  Direct = 'Direct',
  Reference = 'Reference',
  Affiliated = 'Affiliated',
}

export enum VehicleStatus {
  Active = 'Active',
  InMaintenance = 'In Maintenance',
  Inactive = 'Inactive',
}

export interface Vehicle {
  id: string;
  tenant_id: string; // Changed from tenantId
  type: string;
  license_plate: string; // Changed from licensePlate
  capacity?: number; // Optional as it might not be in DB or is extra
  status: VehicleStatus;
  last_maintenance_date: string; // ISO date string
  m_tag_balance?: number; // Pre-paid toll wallet balance
  current_odometer?: number; // Latest mileage reading
  
  // New Fields
  make_model?: string;
  year?: number;
  insurance_expiry?: string; // ISO date string
  token_tax_expiry?: string;  // ISO date string
  m_tag_id?: string;
}

export interface Customer {
  id: string;
  tenant_id: string; // Changed from tenantId
  name: string;
  phone: string;
  whatsapp?: string;
  cnic?: string;
  license_number?: string;
  address?: string;
  internal_remarks?: string;
  source?: CustomerSource;
  reference_name?: string;
  reference_phone?: string;
  country?: string;
  img_cnic_front?: string;
  img_cnic_back?: string;
  img_license_front?: string;
  img_license_back?: string;
}

export interface Driver {
  id: string;
  tenant_id: string; // Changed from tenantId
  name: string;
  phone: string;
  license_no: string;
  cnic?: string;
  cnic_expiry?: string;
  license_expiry?: string; // ISO date string
  status: 'Available' | 'On Trip' | 'Inactive';
  base_salary?: number;
  internal_remarks?: string;
  img_cnic_front?: string;
  img_cnic_back?: string;
  img_license_front?: string;
  img_license_back?: string;
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
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driverId: string;
  route: string[];
  departureTime: string; // HH:MM
  status: TripStatus;
  voucher?: Voucher;
  date: string; // ISO date string
}

export enum RentalType {
  SelfDrive = 'Self Drive',
  WithDriver = 'With Driver'
}

export enum RentalStatus {
  Reserved = 'Reserved',
  Active = 'Active',
  Completed = 'Completed',
  Settled = 'Settled',
  Cancelled = 'Cancelled'
}

export interface RideExpense {
  type: string;
  amount: number;
}

export interface Rental {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  customer_id: string;
  affiliated_id?: string;
  driver_id?: string; // Nullable if Self Drive
  rental_type: RentalType; // Changed from type to match DB
  status: RentalStatus;

  start_time: string; // ISO Datetime
  end_time: string;   // ISO Datetime

  odometer_start?: number;
  odometer_end?: number;

  rent_amount: number;
  security_deposit?: number; // Refundable

  inspection_notes?: string;
  pickup_location?: string;
  destination?: string;
  self_drive_name?: string;
  self_drive_license?: string;
  self_drive_cnic?: string;
  self_drive_phone?: string;

  // Document Images for Self Drive
  self_drive_img_license_front?: string;
  self_drive_img_license_back?: string;
  self_drive_img_cnic_front?: string;
  self_drive_img_cnic_back?: string;

  guarantor_name?: string;
  guarantor_info?: string;
  guarantor_cnic?: string;
  guarantor_phone?: string;
  guarantor_img_cnic_front?: string;
  guarantor_img_cnic_back?: string;
  amount_type?: ContractType;

  // Expenses incurred during this specific rental
  fuel_cost?: number;
  toll_cost?: number;
  driver_allowance?: number;
  other_expenses?: number;
  ride_expenses?: RideExpense[];

  total_cost?: number; // Sum of expenses
  net_profit?: number; // rent_amount - total_cost
  commission_amount?: number;
  allowed_cities?: string[];
}

export enum TransactionType {
  Voucher = 'Voucher',
  PrivateHire = 'Private Hire',
  Expense = 'Expense',
  MTagTopUp = 'M-Tag TopUp',
  MTagUsage = 'M-Tag Usage',
  RentalIncome = 'Rental Income',
  TripExpense = 'Trip Expense' // Fuel, Tolls etc specific to a rental
}

export enum ContractType {
  PerDay = 'Per Day',
  FixedPrice = 'Fixed Price',
}

export interface Transaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;       // Main transaction date (NOT NULL in DB)
  start_date?: string; // Range start
  end_date?: string;   // Range end
  trip_id?: string;
  vehicle_id?: string;
  rental_id?: string;
  maintenance_id?: string;

  // Private Hire specific fields
  contract_type?: ContractType; 
}

export enum MaintenanceType {
  RoutineCheck = 'Routine Check',
  TireChange = 'Tire Change',
  EngineRepair = 'Engine Repair',
  Fuel = 'Fuel',
  // Toll = 'Toll',
  Other = 'Other'
}

export interface MaintenanceRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  type: MaintenanceType;
  cost: number;
  odometer?: number;
  date: string; // ISO date string
  notes: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  dailyData: { date: string; revenue: number; costs: number; profit: number }[];
}

export interface AppSettings {
  id: string;
  tenant_id: string;
  locations: string[];
  per_km_cost: number;
}
