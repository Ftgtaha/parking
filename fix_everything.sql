-- 1. Enable Realtime for Zones and Spots
-- We drop from publication first to ensure clean state, then add back
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.zones;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.spots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spots;

-- 2. Ensure RLS is Enabled
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- 3. Reset Permissions to PUBLIC (Allow everyone to Edit/Delete for Demo)
DROP POLICY IF EXISTS "Public Full Access Zones" ON public.zones;
DROP POLICY IF EXISTS "Public Full Access Spots" ON public.spots;

-- Create policies that allow ALL actions for everyone
CREATE POLICY "Public Full Access Zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access Spots" ON public.spots FOR ALL USING (true) WITH CHECK (true);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
