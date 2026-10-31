-- Completely erase the student account arsany.genius.mina@gmail.com
-- Removes from auth.users and public.users (cascades to completions, answers, likes, etc.)

-- Step 1: Find the user id first (run this separately to confirm)
-- select id, email, role from public.users where lower(email) = lower('arsany.genius.mina@gmail.com');

-- Step 2: Delete from auth.users (this also removes the account from Supabase Auth)
delete from auth.users
where exists (
  select 1 from public.users u
  where u.id = auth.users.id
    and lower(u.email) = lower('arsany.genius.mina@gmail.com')
);

-- Step 3: Delete from public.users (cascades to reading_completions, reading_answers, etc.)
delete from public.users
where lower(email) = lower('arsany.genius.mina@gmail.com');

-- Verification: should return 0 rows
-- select id, email, role from public.users where lower(email) = lower('arsany.genius.mina@gmail.com');
