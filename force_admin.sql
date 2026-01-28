-- script: force_admin.sql
-- Force a user to be Admin, creating the profile if it's missing.
-- Replace 'YOUR_EMAIL_HERE' with your exact email address.

INSERT INTO public.users (id, email, student_id, role)
SELECT 
    id, 
    email, 
    'ADMIN-' || substr(uuid_generate_v4()::text, 1, 8), -- Generate a placeholder Student ID if missing
    'admin'
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- IMPORTANT: Ensure you confirm "1 row inserted" or "1 row updated".
-- If 0 rows, check the email spelling carefully.
