-- Head-only: delete a student account and all cascading student data.
-- The matching auth.users row is removed too, so the email can sign up again.

create or replace function public.delete_student_account(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_role public.user_role;
begin
  if (select auth.uid()) is null
    or coalesce((select private.current_app_role()), '') <> 'head' then
    raise exception 'Only an authenticated Head account can delete students' using errcode = '42501';
  end if;

  select u.role into target_role
    from public.users as u
   where u.id = p_student_id;

  if target_role is null then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;

  if target_role <> 'student' then
    raise exception 'Only student accounts can be deleted here' using errcode = '22023';
  end if;

  -- Cascade deletes attendance, points, badges, reading data, etc.
  delete from public.users where id = p_student_id;

  -- Remove the auth identity so the account cannot sign in again.
  delete from auth.users where id = p_student_id;
end;
$function$;

revoke all on function public.delete_student_account(uuid) from public, anon;
grant execute on function public.delete_student_account(uuid) to authenticated;
