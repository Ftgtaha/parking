-- Enable RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- DROP ALL known policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Insert Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Update Zones" ON public.zones;
DROP POLICY IF EXISTS "Authenticated Delete Zones" ON public.zones;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.zones;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.zones;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.zones;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.zones;

-- Create PERMISSIVE policies for authenticated users
-- 1. READ: Everyone can read
CREATE POLICY "Allow Public Read" ON public.zones FOR SELECT USING (true);

-- 2. INSERT: Authenticated users can create zones
CREATE POLICY "Allow Authenticated Insert" ON public.zones FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. UPDATE: Authenticated users can update zones
CREATE POLICY "Allow Authenticated Update" ON public.zones FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. DELETE: Authenticated users can delete zones
CREATE POLICY "Allow Authenticated Delete" ON public.zones FOR DELETE USING (auth.role() = 'authenticated');

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
