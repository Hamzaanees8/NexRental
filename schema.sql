-- Create the vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    capacity INTEGER,
    last_maintenance_date DATE,
    license_plate TEXT,
    tenant_id TEXT,
    driver BOOLEAN,
    rental_rate DECIMAL
);

-- Create the trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route JSONB,
    status TEXT NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    tenant_id TEXT
);

-- Create the maintenance_records table
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    date DATE NOT NULL,
    details TEXT,
    cost DECIMAL,
    tenant_id TEXT
);

-- Create the rentals table
CREATE TABLE rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    customer_name TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    rental_type TEXT,
    rental_scope TEXT,
    pickup_location TEXT,
    destination TEXT,
    self_drive_name TEXT,
    self_drive_license TEXT,
    total_rent DECIMAL,
    transaction_id UUID, -- This will be a foreign key to financial_transactions, but we'll add the constraint later to avoid circular dependency
    tenant_id TEXT
);

-- Create the financial_transactions table
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    trip_id UUID REFERENCES trips(id),
    rental_id UUID REFERENCES rentals(id),
    maintenance_id UUID REFERENCES maintenance_records(id),
    tenant_id TEXT,
    start_date DATE,
    end_date DATE,
    contract_type TEXT,
    vehicle_id UUID REFERENCES vehicles(id)
);

-- Add the foreign key constraint from rentals to financial_transactions
ALTER TABLE rentals
ADD CONSTRAINT fk_financial_transactions
FOREIGN KEY (transaction_id)
REFERENCES financial_transactions(id);