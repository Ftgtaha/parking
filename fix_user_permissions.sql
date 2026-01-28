-- script: fix_user_permissions.sql
-- Enable RLS logic for the Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile (to see their role)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Allow admins to read all profiles (optional, good for management)
-- This uses a subquery to check if the requester is an admin
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.users;
CREATE POLICY "Admins can read all profiles" 
ON public.users FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
