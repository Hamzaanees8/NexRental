-- Enable RLS for all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create policies for the 'vehicles' table
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON vehicles;
CREATE POLICY "Allow full access based on tenant_id" ON vehicles
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Create policies for the 'trips' table
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON trips;
CREATE POLICY "Allow full access based on tenant_id" ON trips
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Create policies for the 'financial_transactions' table
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON financial_transactions;
CREATE POLICY "Allow full access based on tenant_id" ON financial_transactions
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Create policies for the 'maintenance_records' table
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON maintenance_records;
CREATE POLICY "Allow full access based on tenant_id" ON maintenance_records
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Create policies for the 'rentals' table
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON rentals;
CREATE POLICY "Allow full access based on tenant_id" ON rentals
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Create policies for 'customers'
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON customers;
CREATE POLICY "Allow full access based on tenant_id" ON customers
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Create policies for 'drivers'
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON drivers;
CREATE POLICY "Allow full access based on tenant_id" ON drivers
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Note: Replace 'YOUR_PROJECT_ID_HERE' with your actual Supabase project ID 
-- or use actual auth logic like: (tenant_id = auth.jwt() ->> 'tenant_id')