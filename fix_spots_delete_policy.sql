-- Ensure RLS is enabled
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if any to avoid conflicts
DROP POLICY IF EXISTS "Public Delete Access" ON spots;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON spots;
DROP POLICY IF EXISTS "Admins can delete spots" ON spots;

-- Create a permissive delete policy for authenticated users (admins)
CREATE POLICY "Admins can delete spots"
ON spots
FOR DELETE
TO authenticated
USING (true);

-- Optional: If you want to allow anonymous deletes (not recommended but used in dev)
-- CREATE POLICY "Public can delete spots"
-- ON spots
-- FOR DELETE
-- TO anon
-- USING (true);
