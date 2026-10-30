-- «الترتيب»: every signed-in member can see all students ranked by points.
-- Students can normally read only their own profile (RLS), so this
-- SECURITY DEFINER function exposes ONLY name, points, grade and avatar —
-- never email, phone, church details or anything else.

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
  order by coalesce(u.points, 0) desc, u.name asc;
$$;

revoke all on function public.get_points_leaderboard() from public, anon;
grant execute on function public.get_points_leaderboard() to authenticated;
