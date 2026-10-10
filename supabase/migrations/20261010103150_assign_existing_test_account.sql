-- Ensure an already registered, confirmed TEST email receives the role as well.
update public.users as u
set role = 'test'::public.user_role,
    grade_level = null
from auth.users as a
join private.test_accounts as t on lower(t.email) = lower(a.email)
where u.id = a.id
  and a.email_confirmed_at is not null
  and not exists (
    select 1 from private.head_accounts as h
    where lower(h.email) = lower(a.email)
  );
