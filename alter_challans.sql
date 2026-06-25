-- Create the challans table
CREATE TABLE IF NOT EXISTS challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    challan_number TEXT,
    amount DECIMAL DEFAULT 0,
    date DATE NOT NULL,
    violation_type TEXT,
    notes TEXT,
    is_driver_liable BOOLEAN DEFAULT false,
    is_business_absorbed BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'Unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;

-- Create policies for the 'challans' table
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON challans;
CREATE POLICY "Allow full access based on tenant_id" ON challans
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');
