-- 1. Enable RLS on users table (good practice)
alter table public.users enable row level security;

-- 2. Allow anyone (anon) to INSERT into public.users (Required for signup if not using Triggers)
--    We need this because during signup, the user is not fully authenticated yet in the 'public' session
create policy "Enable insert for authentication only" 
on public.users for insert 
with check (true);

-- 3. Allow users to read their own data (for login lookup)
create policy "Enable read access for all users"
on public.users for select
using (true);  -- Simplified for this MVP: allow reading to find emails by Student ID

-- 4. Clean up any "Zombie" users (users in Auth but missing in Public, or vice versa) if needed.
-- (Optional, run manually if you have broken records)
