-- Run AFTER 20261106020000_warini_page.sql.
--  1) «ورينى»: each reading day also says if you already liked it (double-tap to like).
--  2) A notification to everyone when someone finishes a reading (tap → «ورينى» on that person).
--     Private accounts: only their guardian is notified.
--  3) Highlighted verses in «إصحاح النهارده» (each person sees only their own).

-- 1) Reading days of one person, now with liked_by_me.
drop function if exists public.get_person_readings(uuid);

create or replace function public.get_person_readings(p_user_id uuid)
returns table (
  completion_id uuid,
  reading_date date,
  reference_ar text,
  photo_path text,
  completed_at timestamptz,
  like_count integer,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    c.id,
    coalesce(c.credited_date, c.local_date),
    bp.reference_ar,
    case when c.feed_hidden_at is null then c.photo_path end,
    c.completed_at,
    (select count(*) from public.reading_likes as l where l.completion_id = c.id)::integer,
    exists (select 1 from public.reading_likes as l where l.completion_id = c.id and l.user_id = auth.uid())
  from public.reading_completions as c
  left join public.reading_assignments as a on a.id = c.assignment_id
  left join public.bible_passages as bp on bp.id = a.passage_id
  where c.student_id = p_user_id
    and not c.streak_excluded
    and auth.uid() is not null
    and (select private.current_app_role()) in ('student', 'teacher', 'head')
    and private.can_see_user(p_user_id)
  order by coalesce(c.credited_date, c.local_date) desc, c.completed_at desc
  limit 400
$function$;

revoke all on function public.get_person_readings(uuid) from public, anon;
grant execute on function public.get_person_readings(uuid) to authenticated;

-- 2a) Who is told about a new reading: everyone except the reader;
--     for a private account only its guardian.
create or replace function public.post_alert_recipients(p_completion_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select u.id
  from public.reading_completions as c
  join public.users as u on u.id <> c.student_id
  where c.id = p_completion_id
    and u.role::text in ('student', 'teacher', 'head')
    and (
      not private.is_private_user(c.student_id)
      or exists (
        select 1
        from private.private_accounts as pa
        join public.users as s on lower(s.email) = pa.user_email
        where s.id = c.student_id
          and lower(u.email) = pa.guardian_email
      )
    )
$function$;

revoke all on function public.post_alert_recipients(uuid) from public, anon, authenticated;
grant execute on function public.post_alert_recipients(uuid) to service_role;

-- 2b) After a reading is saved, ask «send-push» to tell everyone.
--     Never blocks or breaks saving the reading.
create or replace function private.notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  begin
    perform net.http_post(
      url := 'https://pduypklunvcsvabireuy.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce((select value from public.app_secrets where name = 'functions_jwt'), ''),
        'x-push-secret', (select value from public.app_secrets where name = 'push_cron_secret')
      ),
      body := jsonb_build_object('type', 'posted', 'completion_id', new.id),
      timeout_milliseconds := 30000
    );
  exception when others then
    null;
  end;
  return new;
end;
$function$;

revoke all on function private.notify_new_post() from public, anon, authenticated;

drop trigger if exists zz_notify_new_post on public.reading_completions;
create trigger zz_notify_new_post
after insert on public.reading_completions
for each row execute function private.notify_new_post();

-- 3) Highlighted verses — private to each person.
create table if not exists public.reading_highlights (
  student_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  assignment_id uuid not null references public.reading_assignments(id) on delete cascade,
  verse_number integer not null check (verse_number > 0),
  created_at timestamptz not null default now(),
  primary key (student_id, assignment_id, verse_number)
);

alter table public.reading_highlights enable row level security;
revoke all on table public.reading_highlights from anon;
grant select, insert, delete on table public.reading_highlights to authenticated;

drop policy if exists "Highlights: read own" on public.reading_highlights;
create policy "Highlights: read own" on public.reading_highlights
  for select to authenticated using (student_id = (select auth.uid()));

drop policy if exists "Highlights: add own" on public.reading_highlights;
create policy "Highlights: add own" on public.reading_highlights
  for insert to authenticated with check (student_id = (select auth.uid()));

drop policy if exists "Highlights: remove own" on public.reading_highlights;
create policy "Highlights: remove own" on public.reading_highlights
  for delete to authenticated using (student_id = (select auth.uid()));
