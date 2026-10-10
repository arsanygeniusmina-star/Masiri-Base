-- Attendance records and auditable point awards.
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('present','absent','excused')),
  marked_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);
create index if not exists attendance_records_date_idx on public.attendance_records(attendance_date);
create index if not exists attendance_records_student_date_idx on public.attendance_records(student_id, attendance_date desc);
alter table public.attendance_records enable row level security;
drop policy if exists "Permitted users view attendance" on public.attendance_records;
create policy "Permitted users view attendance" on public.attendance_records for select to authenticated
using (student_id = (select auth.uid()) or (select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));
drop policy if exists "Servants manage attendance for permitted students" on public.attendance_records;
create policy "Servants manage attendance for permitted students" on public.attendance_records for all to authenticated
using ((select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))))
with check ((select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

create table if not exists public.student_points_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  awarded_by uuid references public.users(id) on delete set null,
  points integer not null check (points between 1 and 100),
  reason text not null check (length(trim(reason)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists student_points_history_student_created_idx on public.student_points_history(student_id, created_at desc);
alter table public.student_points_history enable row level security;
drop policy if exists "Permitted users view points history" on public.student_points_history;
create policy "Permitted users view points history" on public.student_points_history for select to authenticated
using (student_id = (select auth.uid()) or (select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

drop function if exists public.award_student_points(uuid, integer);
create or replace function public.award_student_points(p_student_id uuid, p_points integer, p_reason text default 'مكافأة روحية')
returns integer language plpgsql security definer set search_path = '' as $function$
declare
  actor_role text;
  target_grade text;
  actor_grade text;
  updated_points integer;
  clean_reason text;
begin
  actor_role := (select private.current_app_role());
  actor_grade := (select private.current_grade_level());
  if actor_role not in ('head', 'teacher') then raise exception 'Not authorized to award points'; end if;
  if p_points is null or p_points < 1 or p_points > 100 then raise exception 'Points must be between 1 and 100'; end if;
  clean_reason := left(trim(coalesce(p_reason, '')), 300);
  if clean_reason = '' then raise exception 'A reason is required for awarding points'; end if;
  select grade_level::text into target_grade from public.users where id = p_student_id and role = 'student';
  if not found then raise exception 'Student not found'; end if;
  if actor_role = 'teacher' and (actor_grade is null or target_grade is distinct from actor_grade) then
    raise exception 'Not authorized for this student grade';
  end if;
  update public.users set points = coalesce(points, 0) + p_points where id = p_student_id returning points into updated_points;
  insert into public.student_points_history(student_id, awarded_by, points, reason)
  values (p_student_id, auth.uid(), p_points, clean_reason);
  return updated_points;
end;
$function$;
revoke all on function public.award_student_points(uuid, integer, text) from public;
revoke all on function public.award_student_points(uuid, integer, text) from anon;
grant execute on function public.award_student_points(uuid, integer, text) to authenticated, service_role;
