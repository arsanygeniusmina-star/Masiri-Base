-- 1) Servants and head servants also read the daily plan (readings sent to "all")
--    and earn a Streak, exactly like students.
-- 2) «الرئيسية» feed: every completed reading (its proof photo) is a post that
--    every signed-in member can see and like. Written answers stay private.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Who receives a reading
-- ---------------------------------------------------------------------------
create or replace function private.is_reading_recipient(p_assignment_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.reading_assignments as a
    join public.users as u on u.id = p_student_id
    where a.id = p_assignment_id
      and a.status = 'published'
      and (
        -- The daily plan ("all") goes to students AND servants.
        (a.target_type = 'all' and u.role in ('student'::public.user_role, 'teacher'::public.user_role, 'head'::public.user_role))
        or (
          u.role = 'student'::public.user_role
          and (
            (a.target_type = 'grade' and a.target_grade = u.grade_level)
            or (
              a.target_type = 'students'
              and exists (
                select 1 from public.reading_assignment_recipients as r
                where r.assignment_id = a.id and r.student_id = u.id
              )
            )
          )
        )
      )
  )
$function$;

-- Own completions / answers: students, servants and head servants.
drop policy if exists "Permitted users read reading completions" on public.reading_completions;
create policy "Permitted users read reading completions"
on public.reading_completions for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) in ('student', 'teacher', 'head'))
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);

drop policy if exists "Students complete own assigned readings" on public.reading_completions;
create policy "Students complete own assigned readings"
on public.reading_completions for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select private.current_app_role()) in ('student', 'teacher', 'head')
  and (select private.is_reading_recipient(assignment_id, (select auth.uid())))
);

drop policy if exists "Permitted users read reading answers" on public.reading_answers;
create policy "Permitted users read reading answers"
on public.reading_answers for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) in ('student', 'teacher', 'head'))
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);

drop policy if exists "Students answer own assigned readings" on public.reading_answers;
create policy "Students answer own assigned readings"
on public.reading_answers for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select private.current_app_role()) in ('student', 'teacher', 'head')
  and (select private.is_reading_recipient(assignment_id, (select auth.uid())))
);

drop policy if exists "Students edit own reading answers" on public.reading_answers;
create policy "Students edit own reading answers"
on public.reading_answers for update to authenticated
using (
  student_id = (select auth.uid())
  and (select private.current_app_role()) in ('student', 'teacher', 'head')
)
with check (
  student_id = (select auth.uid())
  and (select private.current_app_role()) in ('student', 'teacher', 'head')
  and (select private.is_reading_recipient(assignment_id, (select auth.uid())))
);

-- ---------------------------------------------------------------------------
-- 2. Photos: servants can upload; proof photos become visible to everyone
--    signed in (they are feed posts). Unused retakes stay private.
-- ---------------------------------------------------------------------------
create or replace function private.can_upload_reading_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.reading_photo_owner(p_name) = (select auth.uid())
    and (select private.current_app_role()) in ('student', 'teacher', 'head')
    and (select private.is_reading_recipient(private.reading_photo_assignment(p_name), (select auth.uid())))
$function$;

create or replace function private.can_view_reading_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when private.reading_photo_owner(p_name) is null then false
    when (select private.current_app_role()) not in ('student', 'teacher', 'head') then false
    when private.reading_photo_owner(p_name) = (select auth.uid()) then true
    when (select private.current_app_role()) = 'head' then true
    when (select private.current_app_role()) = 'teacher'
      and (select private.can_access_student(private.reading_photo_owner(p_name))) then true
    -- A photo used as proof of a completed reading is a public feed post.
    else exists (select 1 from public.reading_completions as c where c.photo_path = p_name)
  end
$function$;

create or replace function private.can_delete_reading_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.reading_photo_owner(p_name) = (select auth.uid())
    and (select private.current_app_role()) in ('student', 'teacher', 'head')
    and not exists (select 1 from public.reading_completions as c where c.photo_path = p_name)
$function$;

-- ---------------------------------------------------------------------------
-- 3. Likes
-- ---------------------------------------------------------------------------
create table if not exists public.reading_likes (
  completion_id uuid not null references public.reading_completions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (completion_id, user_id)
);
create index if not exists reading_likes_user_idx on public.reading_likes (user_id);

alter table public.reading_likes enable row level security;

drop policy if exists "Members read likes" on public.reading_likes;
create policy "Members read likes"
on public.reading_likes for select to authenticated
using ((select private.current_app_role()) in ('student', 'teacher', 'head'));

drop policy if exists "Members like posts" on public.reading_likes;
create policy "Members like posts"
on public.reading_likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.current_app_role()) in ('student', 'teacher', 'head')
);

drop policy if exists "Members remove own likes" on public.reading_likes;
create policy "Members remove own likes"
on public.reading_likes for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.reading_likes from anon, authenticated;
grant select, delete on table public.reading_likes to authenticated;
grant insert (completion_id, user_id) on table public.reading_likes to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Feed: posts ordered by likes (then newest). No answers, no emails.
-- ---------------------------------------------------------------------------
create or replace function public.get_reading_feed(p_limit integer default 30, p_offset integer default 0)
returns table (
  completion_id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  role text,
  photo_path text,
  reading_date date,
  reference text,
  completed_at timestamptz,
  like_count integer,
  liked_by_me boolean,
  current_streak integer
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
      coalesce(c.credited_date, c.local_date) as reading_date,
      c.completed_at,
      (select count(*) from public.reading_likes as l where l.completion_id = c.id)::integer as like_count
    from public.reading_completions as c
    where c.photo_path is not null
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
    coalesce(s.current_streak, 0)
  from page as p
  join public.users as u on u.id = p.student_id
  left join public.reading_completions as c on c.id = p.id
  left join public.reading_assignments as a on a.id = c.assignment_id
  left join public.bible_passages as bp on bp.id = a.passage_id
  left join streaks as s on s.student_id = p.student_id
  order by p.like_count desc, p.completed_at desc
$function$;

revoke all on function public.get_reading_feed(integer, integer) from public, anon;
grant execute on function public.get_reading_feed(integer, integer) to authenticated;
