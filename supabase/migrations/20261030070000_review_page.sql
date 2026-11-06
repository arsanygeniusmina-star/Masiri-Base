-- «متابعة» page for head servants. A flagged answer can now be:
--   publish        → the answer appears on top of the post
--   remove_streak  → that day stops counting for the Streak (the post stays)
--   both           → both of the above
--   dismiss        → ignore
-- Safe to re-run. Requires 20261030060000_answer_moderation.sql first.

-- 1) A completion can be excluded from the Streak without deleting the post.
alter table public.reading_completions add column if not exists streak_excluded boolean not null default false;

-- 2) Streaks ignore excluded completions (same logic as before otherwise).
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
        and r.run_end >= least(ref.today - 1, private.reading_week_start(ref.today) - 1)
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

-- 3) New status for "both".
alter table public.reading_answer_reviews drop constraint if exists reading_answer_reviews_status_check;
alter table public.reading_answer_reviews add constraint reading_answer_reviews_status_check
  check (status in ('pending', 'published', 'streak_removed', 'published_and_removed', 'dismissed'));

-- 4) Review action (now with "both"; removing the Streak day keeps the post).
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
  if not found then
    raise exception 'Review not found';
  end if;

  if p_action in ('publish', 'both') then
    select answer_text into v_text from public.reading_answers where id = p_answer_id;
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

revoke all on function public.review_flagged_answer(uuid, text) from public, anon;
grant execute on function public.review_flagged_answer(uuid, text) to authenticated;

-- 5) All flagged answers (pending first, then the last handled ones).
drop function if exists public.get_flagged_answers();
create function public.get_flagged_answers()
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
         a.question_text, ans.answer_text, r.reason, r.checked_at,
         exists (select 1 from public.reading_completions c where c.assignment_id = r.assignment_id and c.student_id = r.student_id),
         r.status, r.handled_at
  from public.reading_answer_reviews r
  join public.reading_answers ans on ans.id = r.answer_id
  join public.users u on u.id = r.student_id
  join public.reading_assignments a on a.id = r.assignment_id
  left join public.bible_passages bp on bp.id = a.passage_id
  where r.verdict = 'flagged'
    and (select private.current_app_role()) = 'head'
  order by (r.status = 'pending') desc, coalesce(r.handled_at, r.checked_at) desc
  limit 200
$function$;

revoke all on function public.get_flagged_answers() from public, anon;
grant execute on function public.get_flagged_answers() to authenticated;
