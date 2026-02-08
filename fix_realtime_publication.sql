-- Ensure Realtime is enabled for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spots;

-- Verify RLS is actually allowing access (Redundant but safe)
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- Reload configuration
NOTIFY pgrst, 'reload schema';
