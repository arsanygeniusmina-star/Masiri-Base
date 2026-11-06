-- PRIVATE ACCOUNTS
-- A private account is visible ONLY to itself and to one guardian account:
--   • its posts in «الرئيسية», its ranking, its progress, its photos and answers
--   • its AI-flagged answers in «متابعة» (and their notifications)
-- Everyone else (students, servants, other head servants) can't see it in the app
-- or by querying the API — the database itself filters it out.
-- Its written answers are stored ENCRYPTED (pgcrypto + a key in Supabase Vault);
-- the table shows «🔒». Streak dates stay readable (the Streak is computed from them).
-- Safe to re-run. Requires 20261030070000_review_page.sql.

-- 1) Which accounts are private, and who may see them
create table if not exists private.private_accounts (
  user_email text primary key check (user_email = lower(trim(user_email))),
  guardian_email text not null check (guardian_email = lower(trim(guardian_email))),
  created_at timestamptz not null default now()
);
revoke all on table private.private_accounts from public, anon, authenticated;
alter table private.private_accounts enable row level security;

insert into private.private_accounts (user_email, guardian_email)
values ('pumppump223344@gmail.com', 'andrewelkessmousa@gmail.com')
on conflict (user_email) do update set guardian_email = excluded.guardian_email;

create or replace function private.is_private_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from private.private_accounts pa
    join public.users u on lower(u.email) = pa.user_email
    where u.id = p_user
  )
$function$;

-- True when the signed-in user may see p_user (always true for normal accounts).
create or replace function private.can_see_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_user is null
    or not private.is_private_user(p_user)
    or p_user = (select auth.uid())
    or exists (
      select 1 from private.private_accounts pa
      join public.users u on lower(u.email) = pa.user_email
      join public.users g on lower(g.email) = pa.guardian_email
      where u.id = p_user and g.id = (select auth.uid())
    )
$function$;

revoke all on function private.is_private_user(uuid) from public, anon;
revoke all on function private.can_see_user(uuid) from public, anon;
grant execute on function private.is_private_user(uuid) to authenticated;
grant execute on function private.can_see_user(uuid) to authenticated;

-- 2) Database-level hiding: RESTRICTIVE policies are added on top of every
--    existing rule, so nobody else can read these rows through the API.
drop policy if exists "Private accounts: profile" on public.users;
create policy "Private accounts: profile" on public.users as restrictive
for select to authenticated using ((select private.can_see_user(id)));

drop policy if exists "Private accounts: completions" on public.reading_completions;
create policy "Private accounts: completions" on public.reading_completions as restrictive
for select to authenticated using ((select private.can_see_user(student_id)));

drop policy if exists "Private accounts: answers" on public.reading_answers;
create policy "Private accounts: answers" on public.reading_answers as restrictive
for select to authenticated using ((select private.can_see_user(student_id)));

drop policy if exists "Private accounts: AI reviews" on public.reading_answer_reviews;
create policy "Private accounts: AI reviews" on public.reading_answer_reviews as restrictive
for select to authenticated using ((select private.can_see_user(student_id)));

drop policy if exists "Private accounts: photos" on storage.objects;
create policy "Private accounts: photos" on storage.objects as restrictive
for select to authenticated
using (bucket_id <> 'reading-photos' or (select private.can_see_user(private.reading_photo_owner(name))));

-- 3) Encrypted answers
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'private_answers_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'private_answers_key', 'Encrypts answers of private accounts');
  end if;
end $$;

alter table public.reading_answers add column if not exists answer_cipher bytea;
revoke select (answer_cipher) on table public.reading_answers from anon, authenticated;

create or replace function private.answer_key()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select decrypted_secret from vault.decrypted_secrets where name = 'private_answers_key' limit 1
$function$;
revoke all on function private.answer_key() from public, anon, authenticated;

-- Plain text of an answer (decrypts private ones). Used only inside trusted functions.
create or replace function private.answer_plain(p_answer_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when a.answer_cipher is not null then extensions.pgp_sym_decrypt(a.answer_cipher, private.answer_key())
    else a.answer_text
  end
  from public.reading_answers a where a.id = p_answer_id
$function$;
revoke all on function private.answer_plain(uuid) from public, anon, authenticated;

create or replace function private.encrypt_private_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if private.is_private_user(new.student_id) and new.answer_text is distinct from '🔒' then
    new.answer_cipher := extensions.pgp_sym_encrypt(new.answer_text, private.answer_key());
    new.answer_text := '🔒';
  end if;
  return new;
end;
$function$;
revoke all on function private.encrypt_private_answer() from public, anon, authenticated;

-- Named "zz_" so it runs after the other answer triggers.
drop trigger if exists zz_encrypt_private_answer on public.reading_answers;
create trigger zz_encrypt_private_answer
before insert or update of answer_text on public.reading_answers
for each row execute function private.encrypt_private_answer();

-- Encrypt anything this account already wrote.
update public.reading_answers a set answer_text = a.answer_text
where private.is_private_user(a.student_id) and a.answer_cipher is null;

-- The app reads its own (or, for the guardian, the private account's) answers here.
create or replace function public.get_answer_texts(p_answer_ids uuid[])
returns table (answer_id uuid, answer_text text)
language sql
stable
security definer
set search_path = ''
as $function$
  select a.id, private.answer_plain(a.id)
  from public.reading_answers a
  where a.id = any(p_answer_ids)
    and auth.uid() is not null
    and (a.student_id = auth.uid() or private.can_see_user(a.student_id) and private.is_private_user(a.student_id))
$function$;
revoke all on function public.get_answer_texts(uuid[]) from public, anon;
grant execute on function public.get_answer_texts(uuid[]) to authenticated;

-- The AI check (Edge Function, service role) reads the plain answer here.
create or replace function public.answer_text_for_service(p_answer_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select private.answer_plain(p_answer_id)
$function$;
revoke all on function public.answer_text_for_service(uuid) from public, anon, authenticated;
grant execute on function public.answer_text_for_service(uuid) to service_role;

-- Who gets the "flagged answer" notification: the guardian for private accounts, else all head servants.
create or replace function public.flag_alert_recipients(p_answer_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select g.id
  from public.reading_answers a
  join public.users u on u.id = a.student_id
  join private.private_accounts pa on pa.user_email = lower(u.email)
  join public.users g on lower(g.email) = pa.guardian_email
  where a.id = p_answer_id
  union all
  select h.id from public.users h
  where h.role = 'head'
    and not exists (
      select 1 from public.reading_answers a
      join public.users u on u.id = a.student_id
      join private.private_accounts pa on pa.user_email = lower(u.email)
      where a.id = p_answer_id
    )
$function$;
revoke all on function public.flag_alert_recipients(uuid) from public, anon, authenticated;
grant execute on function public.flag_alert_recipients(uuid) to service_role;

-- 4) Feed, ranking and «متابعة» skip private accounts for everyone else
create or replace function public.get_reading_feed(p_limit integer default 30, p_offset integer default 0)
returns table (
  completion_id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  role text,
  photo_path text,
  reading_date date,
  reference_ar text,
  completed_at timestamptz,
  like_count integer,
  liked_by_me boolean,
  current_streak integer,
  published_answer text
)
language sql
stable
security definer
set search_path = ''
as $function$
  with page as (
    select
      c.id,
      c.student_id,
      c.photo_path,
      c.assignment_id,
      c.published_answer,
      coalesce(c.credited_date, c.local_date) as reading_date,
      c.completed_at,
      (select count(*) from public.reading_likes as l where l.completion_id = c.id)::integer as like_count
    from public.reading_completions as c
    where c.photo_path is not null
      and c.feed_hidden_at is null
      and auth.uid() is not null
      and (select private.current_app_role()) in ('student', 'teacher', 'head')
      and private.can_see_user(c.student_id)
    order by like_count desc, c.completed_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  streaks as (
    select s.student_id, s.current_streak
    from public.get_reading_streaks((select array_agg(distinct p.student_id) from page as p)) as s
  )
  select
    p.id,
    p.student_id,
    coalesce(nullif(trim(u.name), ''), 'عضو'),
    u.avatar_url,
    u.role::text,
    p.photo_path,
    p.reading_date,
    bp.reference_ar,
    p.completed_at,
    p.like_count,
    exists (select 1 from public.reading_likes as l where l.completion_id = p.id and l.user_id = auth.uid()),
    coalesce(s.current_streak, 0),
    case
      when p.published_answer = '🔒' then (
        select private.answer_plain(ra.id) from public.reading_answers ra
        where ra.assignment_id = p.assignment_id and ra.student_id = p.student_id
      )
      else p.published_answer
    end
  from page as p
  join public.users as u on u.id = p.student_id
  left join public.reading_assignments as a on a.id = p.assignment_id
  left join public.bible_passages as bp on bp.id = a.passage_id
  left join streaks as s on s.student_id = p.student_id
  order by p.like_count desc, p.completed_at desc
$function$;

create or replace function public.get_points_leaderboard()
returns table (
  user_id uuid,
  name text,
  points integer,
  grade_level text,
  avatar_url text,
  rank integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    coalesce(nullif(trim(u.name), ''), 'طالب') as name,
    coalesce(u.points, 0)::integer as points,
    u.grade_level::text,
    u.avatar_url,
    (rank() over (order by coalesce(u.points, 0) desc))::integer as rank
  from public.users u
  where u.role = 'student'::public.user_role
    and auth.uid() is not null
    and (select private.current_app_role()) in ('student', 'teacher', 'head')
    and private.can_see_user(u.id)
  order by coalesce(u.points, 0) desc, u.name asc;
$$;

create or replace function public.get_flagged_answers()
returns table (
  answer_id uuid,
  student_id uuid,
  name text,
  reference text,
  question text,
  answer_text text,
  reason text,
  checked_at timestamptz,
  has_post boolean,
  status text,
  handled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select r.answer_id, r.student_id, coalesce(nullif(trim(u.name), ''), 'عضو'), bp.reference_ar,
         a.question_text, private.answer_plain(ans.id), r.reason, r.checked_at,
         exists (select 1 from public.reading_completions c where c.assignment_id = r.assignment_id and c.student_id = r.student_id),
         r.status, r.handled_at
  from public.reading_answer_reviews r
  join public.reading_answers ans on ans.id = r.answer_id
  join public.users u on u.id = r.student_id
  join public.reading_assignments a on a.id = r.assignment_id
  left join public.bible_passages bp on bp.id = a.passage_id
  where r.verdict = 'flagged'
    and (select private.current_app_role()) = 'head'
    and private.can_see_user(r.student_id)
  order by (r.status = 'pending') desc, coalesce(r.handled_at, r.checked_at) desc
  limit 200
$function$;

create or replace function public.review_flagged_answer(p_answer_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_review public.reading_answer_reviews;
  v_text text;
begin
  if (select private.current_app_role()) <> 'head' then
    raise exception 'Only head servants can review answers' using errcode = '42501';
  end if;
  if p_action not in ('publish', 'remove_streak', 'both', 'dismiss') then
    raise exception 'Unknown action';
  end if;
  select * into v_review from public.reading_answer_reviews where answer_id = p_answer_id for update;
  if not found or not private.can_see_user(v_review.student_id) then
    raise exception 'Review not found';
  end if;

  if p_action in ('publish', 'both') then
    -- Private accounts keep the text encrypted; the feed decrypts it for permitted viewers.
    v_text := case when private.is_private_user(v_review.student_id) then '🔒'
                   else (select answer_text from public.reading_answers where id = p_answer_id) end;
    update public.reading_completions
    set published_answer = v_text
    where assignment_id = v_review.assignment_id and student_id = v_review.student_id;
  end if;
  if p_action in ('remove_streak', 'both') then
    update public.reading_completions
    set streak_excluded = true
    where assignment_id = v_review.assignment_id and student_id = v_review.student_id;
  end if;

  update public.reading_answer_reviews
  set status = case p_action
        when 'publish' then 'published'
        when 'remove_streak' then 'streak_removed'
        when 'both' then 'published_and_removed'
        else 'dismissed' end,
      handled_by = auth.uid(),
      handled_at = now()
  where answer_id = p_answer_id;
end;
$function$;
