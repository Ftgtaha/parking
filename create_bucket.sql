-- Create the storage bucket 'parking-assets' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('parking-assets', 'parking-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access (so images can be seen on map)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'parking-assets' );

-- Allow Authenticated Users (Admins) to Upload
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'parking-assets' );
