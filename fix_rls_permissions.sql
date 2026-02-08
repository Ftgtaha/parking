-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Insert Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Update Zones" ON public.zones;
DROP POLICY IF EXISTS "Public Read Spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated Update Spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated Insert Spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated Delete Spots" ON public.spots;

-- Enable RLS (just in case)
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- 1. Policies for ZONES table
CREATE POLICY "Enable read access for all users" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.zones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.zones FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.zones FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Policies for SPOTS table
CREATE POLICY "Enable read access for all users" ON public.spots FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.spots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.spots FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.spots FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
