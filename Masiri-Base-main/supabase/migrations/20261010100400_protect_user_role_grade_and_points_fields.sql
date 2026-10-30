create or replace function private.protect_user_privileged_fields()
returns trigger language plpgsql set search_path = '' as $function$
begin
  -- Only trusted database-owned routines may change authorization and points fields.
  -- PostgREST requests execute as authenticated; SECURITY DEFINER routines execute as their owner.
  if current_user not in ('postgres', 'service_role') then
    if new.role is distinct from old.role
      or new.grade_level is distinct from old.grade_level
      or new.points is distinct from old.points then
      raise exception 'Role, grade assignment, and points must be changed through approved server-side workflows'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists protect_user_privileged_fields on public.users;
create trigger protect_user_privileged_fields before update on public.users
for each row execute function private.protect_user_privileged_fields();
revoke all on function private.protect_user_privileged_fields() from public, anon, authenticated;
