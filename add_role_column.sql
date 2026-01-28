-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'student' CHECK (role IN ('student', 'admin'));

-- Comment on column
COMMENT ON COLUMN public.users.role IS 'User role: student or admin';
