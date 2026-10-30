-- Allow the Head account to revoke other Head / Test accounts.
-- After revoking, the matching profile is downgraded to `student`.

create or replace function public.revoke_head_account(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null
    or coalesce((select private.current_app_role()), '') <> 'head' then
    raise exception 'Only an authenticated Head account can revoke head accounts' using errcode = '42501';
  end if;

  delete from private.head_accounts where email = lower(trim(p_email));
  update public.users
     set role = 'student'::public.user_role,
         grade_level = null
   where lower(email) = lower(trim(p_email));
end;
$function$;

revoke all on function public.revoke_head_account(text) from public, anon;
grant execute on function public.revoke_head_account(text) to authenticated;

create or replace function public.revoke_test_account(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null
    or coalesce((select private.current_app_role()), '') <> 'head' then
    raise exception 'Only an authenticated Head account can revoke test accounts' using errcode = '42501';
  end if;

  delete from private.test_accounts where email = lower(trim(p_email));
  update public.users
     set role = 'student'::public.user_role,
         grade_level = null
   where lower(email) = lower(trim(p_email));
end;
$function$;

revoke all on function public.revoke_test_account(text) from public, anon;
grant execute on function public.revoke_test_account(text) to authenticated;
