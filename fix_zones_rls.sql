-- script: fix_zones_rls.sql
-- Fix "new row violates row-level security policy" for zones table

-- 1. Enable RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- 2. Allow Public Read (View Map)
DROP POLICY IF EXISTS "Public Read Zones" ON public.zones;
CREATE POLICY "Public Read Zones"
ON public.zones FOR SELECT
USING (true);

-- 3. Allow Authenticated Insert (Add Zone)
DROP POLICY IF EXISTS "Authenticated Insert Zones" ON public.zones;
CREATE POLICY "Authenticated Insert Zones"
ON public.zones FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Allow Authenticated Update (Edit Zone/Gate)
DROP POLICY IF EXISTS "Authenticated Update Zones" ON public.zones;
CREATE POLICY "Authenticated Update Zones"
ON public.zones FOR UPDATE
TO authenticated
USING (true);

-- 5. Allow Authenticated Delete (If needed later)
DROP POLICY IF EXISTS "Authenticated Delete Zones" ON public.zones;
CREATE POLICY "Authenticated Delete Zones"
ON public.zones FOR DELETE
TO authenticated
USING (true);
