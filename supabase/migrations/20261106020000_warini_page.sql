-- «ورينى»: everyone (signed-in members) can see all registered people ranked by
-- their current Streak, search by name, and open one person to see their reading days.
-- Private accounts stay hidden from everyone except themselves and their guardian.

-- 1) People ranked by current Streak.
create or replace function public.get_people_streaks()
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  role text,
  current_streak integer,
  longest_streak integer,
  total_reading_days integer,
  completed_today boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  with people as (
    select u.id, u.name, u.avatar_url, u.role::text as role
    from public.users as u
    where auth.uid() is not null
      and (select private.current_app_role()) in ('student', 'teacher', 'head')
      and u.role::text in ('student', 'teacher', 'head')
      and private.can_see_user(u.id)
  ),
  streaks as (
    select s.*
    from public.get_reading_streaks((select array_agg(p.id) from people as p)) as s
  )
  select
    p.id,
    coalesce(nullif(trim(p.name), ''), 'عضو'),
    p.avatar_url,
    p.role,
    coalesce(s.current_streak, 0),
    coalesce(s.longest_streak, 0),
    coalesce(s.total_reading_days, 0),
    coalesce(s.completed_today, false)
  from people as p
  left join streaks as s on s.student_id = p.id
  order by coalesce(s.current_streak, 0) desc, coalesce(s.total_reading_days, 0) desc, p.name
$function$;

revoke all on function public.get_people_streaks() from public, anon;
grant execute on function public.get_people_streaks() to authenticated;

-- 2) One person's reading days (newest first). The photo is only given when the
--    post is still shown on «الرئيسية».
create or replace function public.get_person_readings(p_user_id uuid)
returns table (
  completion_id uuid,
  reading_date date,
  reference_ar text,
  photo_path text,
  completed_at timestamptz,
  like_count integer
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
    (select count(*) from public.reading_likes as l where l.completion_id = c.id)::integer
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
