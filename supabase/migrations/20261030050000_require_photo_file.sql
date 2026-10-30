-- A reading only counts when its proof photo file really exists in Storage.
create or replace function private.require_reading_photo_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.photo_path is null or not exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'reading-photos' and o.name = new.photo_path
  ) then
    raise exception 'Photo upload missing — take the photo again';
  end if;
  return new;
end;
$function$;

drop trigger if exists require_reading_photo_file on public.reading_completions;
create trigger require_reading_photo_file
before insert or update of photo_path on public.reading_completions
for each row execute function private.require_reading_photo_file();

-- Servants and head servants can remove any post from «الرئيسية».
-- The reading still counts for the person's Streak; only the post disappears.
alter table public.reading_completions add column if not exists feed_hidden_at timestamptz;
alter table public.reading_completions add column if not exists feed_hidden_by uuid references public.users(id) on delete set null;

create or replace function public.hide_feed_post(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select private.current_app_role()) not in ('teacher', 'head') then
    raise exception 'Only servants can delete posts' using errcode = '42501';
  end if;
  update public.reading_completions
  set feed_hidden_at = now(), feed_hidden_by = auth.uid()
  where id = p_completion_id;
end;
$function$;

revoke all on function public.hide_feed_post(uuid) from public, anon;
grant execute on function public.hide_feed_post(uuid) to authenticated;

-- Feed without removed posts
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
