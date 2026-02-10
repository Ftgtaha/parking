-- Enable RLS on spots table (if not already)
ALTER TABLE "public"."spots" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."spots";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."spots";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."spots";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."spots";
DROP POLICY IF EXISTS "Allow all for authenticated" ON "public"."spots";

-- Create comprehensive policies

-- 1. READ: Everyone can read spots (public)
CREATE POLICY "Enable read access for all users"
ON "public"."spots"
FOR SELECT
USING (true);

-- 2. INSERT/UPDATE/DELETE: Only authenticated users (admins ideally, but for now any auth user to unblock)
CREATE POLICY "Enable all modifications for authenticated users"
ON "public"."spots"
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Verify
select * from pg_policies where tablename = 'spots';
