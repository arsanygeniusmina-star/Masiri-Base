create or replace function private.set_prayer_request_student_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  resolved_name text;
begin
  select u.name into resolved_name
    from public.users as u
   where u.id = new.student_id;
  if resolved_name is null then
    raise exception 'Authenticated student profile not found';
  end if;
  new.student_name := resolved_name;
  return new;
end;
$function$;

revoke all on function private.set_prayer_request_student_name() from public, anon, authenticated;
drop trigger if exists set_prayer_request_student_name on public.prayer_requests;
create trigger set_prayer_request_student_name
before insert on public.prayer_requests
for each row execute function private.set_prayer_request_student_name();

drop policy if exists "Servants can moderate prayer requests" on public.prayer_requests;
create policy "Head or assigned servant can moderate prayer requests"
on public.prayer_requests for update to authenticated
using (
  (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
)
with check (
  (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);

revoke insert (student_name) on public.prayer_requests from authenticated;
grant insert (student_id, content, is_private) on public.prayer_requests to authenticated;
