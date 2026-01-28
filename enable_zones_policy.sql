-- Enable RLS on zones table
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone to READ zones (Required for loading the map)
DROP POLICY IF EXISTS "Public Read Zones" ON public.zones;
CREATE POLICY "Public Read Zones"
ON public.zones FOR SELECT
USING (true);

-- 2. Allow everyone to UPDATE zones (Required for 'Set Gate' functionality)
DROP POLICY IF EXISTS "Public Update Zones" ON public.zones;
CREATE POLICY "Public Update Zones"
ON public.zones FOR UPDATE
USING (true);
