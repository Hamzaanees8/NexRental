-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    cnic TEXT,
    license_number TEXT,
    address TEXT
);

-- 2. Create Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    license_no TEXT,
    status TEXT DEFAULT 'Available',
    base_salary DECIMAL
);

-- 3. Update Vehicles Table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS m_tag_balance DECIMAL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_odometer INTEGER DEFAULT 0;
-- Fix: Ensure license_plate exists if it was named differently, but schema.sql says it is license_plate.

-- 4. Update Maintenance Records Table (Fix mismatches)
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS type TEXT; 
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS notes TEXT;
-- We can ignore 'details' or migrate it if needed, but for now we add 'notes'.

-- 5. Re-create Rentals Table
DROP TABLE IF EXISTS rentals CASCADE;

CREATE TABLE rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    customer_id UUID REFERENCES customers(id),
    driver_id UUID REFERENCES drivers(id),
    
    rental_type TEXT NOT NULL, -- Matches usage
    status TEXT NOT NULL,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    odometer_start INTEGER,
    odometer_end INTEGER,
    
    rent_amount DECIMAL DEFAULT 0,
    security_deposit DECIMAL DEFAULT 0,
    
    inspection_notes TEXT,
    pickup_location TEXT,
    destination TEXT,
    self_drive_name TEXT,
    self_drive_license TEXT,
    self_drive_cnic TEXT,
    self_drive_phone TEXT,
    guarantor_name TEXT,
    guarantor_info TEXT,
    amount_type TEXT DEFAULT 'Fixed Price',
    ride_expenses JSONB DEFAULT '[]',
    
    -- Expenses
    fuel_cost DECIMAL DEFAULT 0,
    toll_cost DECIMAL DEFAULT 0,
    driver_allowance DECIMAL DEFAULT 0,
    other_expenses DECIMAL DEFAULT 0,
    
    total_cost DECIMAL DEFAULT 0,
    net_profit DECIMAL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Update Financial Transactions
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS rental_id UUID REFERENCES rentals(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS contract_type TEXT; -- For Private Hire
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS end_date DATE;

-- 7. Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL UNIQUE,
    locations JSONB DEFAULT '[]',
    per_km_cost DECIMAL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
