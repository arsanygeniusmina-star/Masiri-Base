create table if not exists public.student_points_award_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  awarded_by uuid not null default auth.uid() references public.users(id) on delete set null,
  points integer not null check (points between 1 and 100),
  reason text not null check (length(trim(reason)) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.student_points_award_requests enable row level security;
revoke all on public.student_points_award_requests from public, anon, authenticated;
grant insert on public.student_points_award_requests to authenticated;
drop policy if exists "Servants may submit authorized point awards" on public.student_points_award_requests;
create policy "Servants may submit authorized point awards" on public.student_points_award_requests for insert to authenticated
with check (awarded_by = (select auth.uid()) and (
  (select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id)))
) and exists (select 1 from public.users u where u.id = student_id and u.role = 'student'));

create or replace function private.apply_student_points_award()
returns trigger language plpgsql security definer set search_path = '' as $function$
begin
  if (select private.current_app_role()) not in ('head','teacher') then raise exception 'Not authorized to award points' using errcode = '42501'; end if;
  if (select private.current_app_role()) = 'teacher' and not (select private.can_access_student(new.student_id)) then
    raise exception 'Not authorized for this student grade' using errcode = '42501';
  end if;
  update public.users set points = coalesce(points,0) + new.points where id = new.student_id and role = 'student';
  if not found then raise exception 'Student not found'; end if;
  insert into public.student_points_history(student_id,awarded_by,points,reason)
  values(new.student_id,new.awarded_by,new.points,left(trim(new.reason),300));
  return new;
end;
$function$;
revoke all on function private.apply_student_points_award() from public, anon, authenticated;
drop trigger if exists apply_student_points_award on public.student_points_award_requests;
create trigger apply_student_points_award after insert on public.student_points_award_requests
for each row execute function private.apply_student_points_award();
drop function if exists public.award_student_points(uuid, integer, text);
