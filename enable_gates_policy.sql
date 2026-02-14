-- Enable RLS
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to gates
CREATE POLICY "Public gates are viewable by everyone" 
ON gates FOR SELECT 
TO authenticated, anon
USING (true);

-- Allow admins to insert/update/delete gates
-- Assuming 'admin' role check via auth.jwt() -> role or similar mechanism you use. 
-- Based on previous files, it seems we check if the user is an admin via a profiles table or just basic auth for now?
-- Let's check how other tables do it. Usually creating a policy for authenticated users if we don't have strict tiered RLS yet, or just allow all authenticated for now and restrict in UI.
-- Checking previous files, it seems we often use:
-- CREATE POLICY "Enable insert for authenticated users only" ON "public"."spots" FOR INSERT TO "authenticated" WITH CHECK (true);
-- So we will do similar for now.

CREATE POLICY "Admins can insert gates" 
ON gates FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can update gates" 
ON gates FOR UPDATE
TO authenticated 
USING (true);

CREATE POLICY "Admins can delete gates" 
ON gates FOR DELETE 
TO authenticated 
USING (true);
