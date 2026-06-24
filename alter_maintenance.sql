-- Add odometer and next_due_odometer columns to maintenance_records
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS odometer INTEGER;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS next_due_odometer INTEGER;
