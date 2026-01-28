-- script: make_admin.sql
-- Replace 'YOUR_EMAIL_HERE' with the email of the account you want to make Admin.

UPDATE public.users
SET role = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- Example:
-- UPDATE public.users SET role = 'admin' WHERE email = 'myemail@example.com';
