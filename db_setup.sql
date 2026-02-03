-- 1. Add columns to 'drivers' table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS img_cnic_front text,
ADD COLUMN IF NOT EXISTS img_cnic_back text,
ADD COLUMN IF NOT EXISTS img_license_front text,
ADD COLUMN IF NOT EXISTS img_license_back text;

-- 2. Add columns to 'customers' table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS img_cnic_front text,
ADD COLUMN IF NOT EXISTS img_cnic_back text,
ADD COLUMN IF NOT EXISTS img_license_front text,
ADD COLUMN IF NOT EXISTS img_license_back text;

-- 3. Create 'documents' storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set up Storage Policies (RLS)
-- Allow anyone (public) to view files in 'documents'
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to upload files to 'documents'
DROP POLICY IF EXISTS "Authenticated User Upload" ON storage.objects;
CREATE POLICY "Authenticated User Upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Optional: Allow authenticated users to update/delete their own files
-- Note: This is a basic policy. Adjust based on your specific security needs.
DROP POLICY IF EXISTS "Authenticated User Update" ON storage.objects;
CREATE POLICY "Authenticated User Update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');
