-- Add purchase_price column to vehicles table
ALTER TABLE vehicles ADD COLUMN purchase_price DECIMAL DEFAULT 0;

-- Seed purchase values for main cars
UPDATE vehicles SET purchase_price = 3475000 WHERE license_plate = 'LEC-17-1853';
UPDATE vehicles SET purchase_price = 3650000 WHERE license_plate = 'LEA-16-6863';
