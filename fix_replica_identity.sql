-- Force Postgres to send FULL row data on updates
-- This prevents "partial" updates where only the changed columns be sent
ALTER TABLE public.zones REPLICA IDENTITY FULL;
ALTER TABLE public.spots REPLICA IDENTITY FULL;

-- Re-verify permissions just in case
GRANT ALL ON TABLE public.zones TO anon;
GRANT ALL ON TABLE public.zones TO authenticated;
GRANT ALL ON TABLE public.zones TO service_role;

GRANT ALL ON TABLE public.spots TO anon;
GRANT ALL ON TABLE public.spots TO authenticated;
GRANT ALL ON TABLE public.spots TO service_role;

-- Reload
NOTIFY pgrst, 'reload schema';
