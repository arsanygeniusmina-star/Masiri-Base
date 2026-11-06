-- AI check of «شوفت ربنا فين» answers (NVIDIA, via the Edge Function "check-answer").
-- Flagged answers wait for a head servant, who can:
--   • publish the answer on top of the person's post in «الرئيسية»
--   • not count that day for the Streak (removes the completion)
--   • ignore it
-- Safe to re-run. Requires 20261030050000_require_photo_file.sql first.

create table if not exists public.reading_answer_reviews (
  answer_id uuid primary key references public.reading_answers(id) on delete cascade,
  assignment_id uuid not null references public.reading_assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  verdict text not null check (verdict in ('ok', 'flagged', 'error')),
  reason text check (reason is null or length(reason) <= 500),
  model text,
  checked_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'published', 'streak_removed', 'dismissed')),
  handled_by uuid references public.users(id) on delete set null,
  handled_at timestamptz
);
create index if not exists reading_answer_reviews_pending_idx
  on public.reading_answer_reviews (checked_at desc) where verdict = 'flagged' and status = 'pending';

alter table public.reading_answer_reviews enable row level security;

-- Only head servants can read reviews; only the Edge Function (service role) writes them.
drop policy if exists "Head reads answer reviews" on public.reading_answer_reviews;
create policy "Head reads answer reviews"
on public.reading_answer_reviews for select to authenticated
using ((select private.current_app_role()) = 'head');

revoke all on table public.reading_answer_reviews from anon, authenticated;
grant select on table public.reading_answer_reviews to authenticated;

-- Answer published on top of a post (set only through review_publish_answer).
alter table public.reading_completions add column if not exists published_answer text;

-- ---------------------------------------------------------------------------
-- Head servant list of flagged answers
-- ---------------------------------------------------------------------------
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
  has_post boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select r.answer_id, r.student_id, coalesce(nullif(trim(u.name), ''), 'عضو'), bp.reference_ar,
         a.question_text, ans.answer_text, r.reason, r.checked_at,
         exists (select 1 from public.reading_completions c where c.assignment_id = r.assignment_id and c.student_id = r.student_id)
  from public.reading_answer_reviews r
  join public.reading_answers ans on ans.id = r.answer_id
  join public.users u on u.id = r.student_id
  join public.reading_assignments a on a.id = r.assignment_id
  left join public.bible_passages bp on bp.id = a.passage_id
  where r.verdict = 'flagged' and r.status = 'pending'
    and (select private.current_app_role()) = 'head'
  order by r.checked_at desc
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
  if p_action not in ('publish', 'remove_streak', 'dismiss') then
    raise exception 'Unknown action';
  end if;
  select * into v_review from public.reading_answer_reviews where answer_id = p_answer_id for update;
  if not found then
    raise exception 'Review not found';
  end if;

  if p_action = 'publish' then
    select answer_text into v_text from public.reading_answers where id = p_answer_id;
    update public.reading_completions
    set published_answer = v_text
    where assignment_id = v_review.assignment_id and student_id = v_review.student_id;
  elsif p_action = 'remove_streak' then
    -- The day no longer counts; the post (and its likes) disappear with it.
    delete from public.reading_completions
    where assignment_id = v_review.assignment_id and student_id = v_review.student_id;
  end if;

  update public.reading_answer_reviews
  set status = case p_action when 'publish' then 'published' when 'remove_streak' then 'streak_removed' else 'dismissed' end,
      handled_by = auth.uid(),
      handled_at = now()
  where answer_id = p_answer_id;
end;
$function$;

revoke all on function public.get_flagged_answers() from public, anon;
revoke all on function public.review_flagged_answer(uuid, text) from public, anon;
grant execute on function public.get_flagged_answers() to authenticated;
grant execute on function public.review_flagged_answer(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Feed now also returns the published answer (return type changes → drop first)
-- ---------------------------------------------------------------------------
drop function if exists public.get_reading_feed(integer, integer);
create function public.get_reading_feed(p_limit integer default 30, p_offset integer default 0)
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
    p.published_answer
  from page as p
  join public.users as u on u.id = p.student_id
  left join public.reading_assignments as a on a.id = p.assignment_id
  left join public.bible_passages as bp on bp.id = a.passage_id
  left join streaks as s on s.student_id = p.student_id
  order by p.like_count desc, p.completed_at desc
$function$;

revoke all on function public.get_reading_feed(integer, integer) from public, anon;
grant execute on function public.get_reading_feed(integer, integer) to authenticated;
