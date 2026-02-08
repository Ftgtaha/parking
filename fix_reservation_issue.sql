-- 1. Ensure the 'reserved_by' column exists
ALTER TABLE public.spots 
ADD COLUMN IF NOT EXISTS reserved_by uuid;

-- 2. Grant permissions to authenticated users explicitly
GRANT ALL ON TABLE public.spots TO authenticated;
GRANT ALL ON TABLE public.spots TO service_role;

-- 3. Reload the Schema Cache (Critical for 'Could not find column in schema cache' error)
NOTIFY pgrst, 'reload schema';
