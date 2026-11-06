-- Restore grace day: missed readings of a Friday → Thursday week can also be
-- restored during the whole Friday right after it (until 11:59 pm Cairo time).
-- Saturday onwards, only the new week can be restored (as before).

-- 1) First day that can still be restored on p_day.
--    Friday → the week that just ended; any other day → the current week.
create or replace function private.restore_window_start(p_day date)
returns date
language sql
immutable
set search_path = ''
as $function$
  select private.reading_week_start(p_day - 1)
$function$;

revoke all on function private.restore_window_start(date) from public, anon;
grant execute on function private.restore_window_start(date) to authenticated;

-- 2) Completing / restoring a reading (same as before, new window).
create or replace function private.prepare_reading_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scheduled_date date;
  v_question text;
  v_utc_today date := (now() at time zone 'UTC')::date;
begin
  select a.scheduled_date, a.question_text
    into v_scheduled_date, v_question
    from public.reading_assignments as a
   where a.id = new.assignment_id;

  if not found then
    raise exception 'Reading assignment not found' using errcode = '23503';
  end if;

  if new.local_date is null or new.local_date < v_utc_today - 1 or new.local_date > v_utc_today + 1 then
    raise exception 'Invalid local completion date' using errcode = '23514';
  end if;

  if new.local_date < v_scheduled_date then
    raise exception 'This reading is not open yet' using errcode = '23514';
  end if;

  -- Restore: inside the same Friday → Thursday week, or on the Friday right after it.
  if v_scheduled_date < private.restore_window_start(new.local_date) then
    raise exception 'Restore window closed for this reading' using errcode = '23514';
  end if;

  if v_question is not null and not exists (
    select 1
    from public.reading_answers as ans
    where ans.assignment_id = new.assignment_id
      and ans.student_id = new.student_id
  ) then
    raise exception 'Answer required before completing this reading' using errcode = '23514';
  end if;

  if new.photo_path is null
    or private.reading_photo_owner(new.photo_path) is distinct from new.student_id
    or private.reading_photo_assignment(new.photo_path) is distinct from new.assignment_id
    or not exists (
      select 1
      from storage.objects as o
      where o.bucket_id = 'reading-photos'
        and o.name = new.photo_path
    ) then
    raise exception 'Photo proof required before completing this reading' using errcode = '23514';
  end if;

  new.completed_at := now();
  new.credited_date := v_scheduled_date;
  return new;
end;
$function$;

revoke all on function private.prepare_reading_completion() from public, anon, authenticated;

-- 3) Streak: a run stays alive while every missed day since it can still be restored.
create or replace function public.get_reading_streaks(p_student_ids uuid[], p_today date default null)
returns table (
  student_id uuid,
  current_streak integer,
  longest_streak integer,
  last_completed_date date,
  total_reading_days integer,
  completed_today boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with ref as (
    select coalesce(p_today, (now() at time zone 'Africa/Cairo')::date) as today
  ),
  ids as (
    select distinct sid
    from unnest(coalesce(p_student_ids, array[]::uuid[])) with ordinality as t(sid, ord)
    where ord <= 500
  ),
  days as (
    select distinct c.student_id, coalesce(c.credited_date, c.local_date) as local_date
    from public.reading_completions as c
    join ids on ids.sid = c.student_id
    where not c.streak_excluded
  ),
  grouped as (
    select d.student_id,
           d.local_date,
           d.local_date - (row_number() over (partition by d.student_id order by d.local_date))::integer as grp
    from days as d
  ),
  runs as (
    select g.student_id, max(g.local_date) as run_end, count(*)::integer as run_length
    from grouped as g
    group by g.student_id, g.grp
  )
  select
    ids.sid as student_id,
    coalesce((
      select r.run_length
      from runs as r, ref
      where r.student_id = ids.sid
        and r.run_end >= least(ref.today - 1, private.restore_window_start(ref.today) - 1)
      order by r.run_end desc
      limit 1
    ), 0) as current_streak,
    coalesce((select max(r.run_length) from runs as r where r.student_id = ids.sid), 0) as longest_streak,
    (select max(r.run_end) from runs as r where r.student_id = ids.sid) as last_completed_date,
    coalesce((select sum(r.run_length) from runs as r where r.student_id = ids.sid), 0)::integer as total_reading_days,
    exists (
      select 1 from days as d, ref
      where d.student_id = ids.sid and d.local_date = ref.today
    ) as completed_today
  from ids
$function$;

revoke all on function public.get_reading_streaks(uuid[], date) from public, anon;
grant execute on function public.get_reading_streaks(uuid[], date) to authenticated;
