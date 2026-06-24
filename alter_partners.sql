-- 1.1 Create partners table
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Create partner_transactions table
CREATE TABLE IF NOT EXISTS partner_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- Contribution / Drawing / Committee Adjustment
    amount DECIMAL NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Seed initial partners
INSERT INTO partners (tenant_id, name) VALUES
('tgpmimpzlunsjtxdjikw', 'Irfan'),
('tgpmimpzlunsjtxdjikw', 'Mudassar'),
('tgpmimpzlunsjtxdjikw', 'Saleh');

-- 1.4 Enable Row Level Security (RLS)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for partners
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON partners;
CREATE POLICY "Allow full access based on tenant_id" ON partners
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');

-- Add RLS policies for partner_transactions
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON partner_transactions;
CREATE POLICY "Allow full access based on tenant_id" ON partner_transactions
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw');
