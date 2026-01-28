-- Enable RLS on spots table to ensure we have control
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone to READ spots (Required for the map to display them)
DROP POLICY IF EXISTS "Public Read Access" ON public.spots;
CREATE POLICY "Public Read Access"
ON public.spots FOR SELECT
USING (true);

-- 2. Allow everyone to INSERT spots (Required for Admin Mode to work without login)
DROP POLICY IF EXISTS "Public Insert Access" ON public.spots;
CREATE POLICY "Public Insert Access"
ON public.spots FOR INSERT
WITH CHECK (true);

-- 3. Allow everyone to UPDATE spots (Required to change status)
DROP POLICY IF EXISTS "Public Update Access" ON public.spots;
CREATE POLICY "Public Update Access"
ON public.spots FOR UPDATE
USING (true);

-- 4. Allow everyone to DELETE spots (Required for Admin Mode delete)
DROP POLICY IF EXISTS "Public Delete Access" ON public.spots;
CREATE POLICY "Public Delete Access"
ON public.spots FOR DELETE
USING (true);
