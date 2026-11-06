-- «الرئيسية»: choose the order of posts — 'recent' (newest first, the default) or 'likes'.
-- Same columns and the same private-account filter as before; only the order is new.

drop function if exists public.get_reading_feed(integer, integer);

create or replace function public.get_reading_feed(p_limit integer default 30, p_offset integer default 0, p_sort text default 'recent')
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
    order by
      case when p_sort = 'likes' then (select count(*) from public.reading_likes as l where l.completion_id = c.id) end desc nulls last,
      c.completed_at desc
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
  order by
    case when p_sort = 'likes' then p.like_count end desc nulls last,
    p.completed_at desc
$function$;

revoke all on function public.get_reading_feed(integer, integer, text) from public, anon;
grant execute on function public.get_reading_feed(integer, integer, text) to authenticated;
