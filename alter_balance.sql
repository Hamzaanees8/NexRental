-- Step 1.1: Add opening_balance column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS opening_balance DECIMAL DEFAULT 677088;

-- Step 1.2: Create foreign_currency_reserves table
CREATE TABLE IF NOT EXISTS foreign_currency_reserves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    currency TEXT NOT NULL, -- GBP, EUR, USD
    amount DECIMAL NOT NULL DEFAULT 0,
    exchange_rate DECIMAL NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, currency)
);

-- Step 1.3: Enable Row Level Security (RLS)
ALTER TABLE foreign_currency_reserves ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for foreign_currency_reserves
-- We use the standard tenant-based policy pattern used in other tables
DROP POLICY IF EXISTS "Allow full access based on tenant_id" ON foreign_currency_reserves;
CREATE POLICY "Allow full access based on tenant_id" ON foreign_currency_reserves
FOR ALL USING (tenant_id = 'tgpmimpzlunsjtxdjikw'); -- Note: Using the provided tenant ID as per instructions and context

-- Step 1.4: Seed the foreign_currency_reserves table for the main tenant
INSERT INTO foreign_currency_reserves (tenant_id, currency, amount, exchange_rate)
VALUES
('tgpmimpzlunsjtxdjikw', 'GBP', 0, 1.0),
('tgpmimpzlunsjtxdjikw', 'EUR', 0, 1.0),
('tgpmimpzlunsjtxdjikw', 'USD', 0, 1.0)
ON CONFLICT (tenant_id, currency) DO NOTHING;
