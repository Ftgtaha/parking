-- Enable RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- DROP ALL known policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Insert Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Update Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Delete Zones" ON public.zones;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.zones;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.zones;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.zones;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.zones;
DROP POLICY IF EXISTS "Allow Public Read" ON public.zones;
DROP POLICY IF EXISTS "Allow Authenticated Insert" ON public.zones;
DROP POLICY IF EXISTS "Allow Authenticated Update" ON public.zones;
DROP POLICY IF EXISTS "Allow Authenticated Delete" ON public.zones;

DROP POLICY IF EXISTS "Public Read Spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated Update Spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated Insert Spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated Delete Spots" ON public.spots;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.spots;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.spots;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.spots;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.spots;

-- Create PUBLIC permissions (Allow Anon/Public to Read/Write)
-- WARNING: This allows ANYONE with the API key to modify data. Safe for local demo, not for production.

-- ZONES
CREATE POLICY "Public Full Access Zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);

-- SPOTS
CREATE POLICY "Public Full Access Spots" ON public.spots FOR ALL USING (true) WITH CHECK (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
