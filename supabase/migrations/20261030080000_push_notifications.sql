-- Real push notifications (they arrive even when the app is closed).
--  • public.push_subscriptions : one row per phone/browser that allowed notifications
--  • public.app_secrets        : server-only values (VAPID keys created by the
--                                Edge Function "send-push", and a random secret
--                                the daily timer uses to call it). No one can
--                                read this table from the app.
-- Safe to re-run. The daily timer is in 20261030090000_push_schedule.sql.

create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on table public.app_secrets from anon, authenticated;
-- (no policies: only the service role / database owner can read it)

-- Random secret for the daily timer → send-push.
insert into public.app_secrets (name, value)
values ('push_cron_secret', md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text))
on conflict (name) do nothing;

create table if not exists public.push_subscriptions (
  endpoint text primary key check (length(endpoint) between 10 and 1000),
  user_id uuid not null references public.users(id) on delete cascade,
  p256dh text not null check (length(p256dh) between 10 and 200),
  auth text not null check (length(auth) between 4 and 100),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users read own push subscriptions" on public.push_subscriptions;
create policy "Users read own push subscriptions"
on public.push_subscriptions for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users delete own push subscriptions" on public.push_subscriptions;
create policy "Users delete own push subscriptions"
on public.push_subscriptions for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, delete on table public.push_subscriptions to authenticated;

-- Save (or move to the signed-in user) this device's subscription.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or (select private.current_app_role()) not in ('student', 'teacher', 'head') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_endpoint !~ '^https://' then
    raise exception 'Bad endpoint';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = now();
end;
$function$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
