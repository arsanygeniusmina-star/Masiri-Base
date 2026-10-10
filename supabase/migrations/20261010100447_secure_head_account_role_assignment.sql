create table if not exists private.head_accounts (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint head_accounts_email_lower check (email = lower(trim(email)))
);
revoke all on private.head_accounts from public, anon, authenticated, service_role;
insert into private.head_accounts(email) values ('minasamehdeif@gmail.com') on conflict (email) do nothing;
update public.teachers_whitelist set email = 'minasamehdeif@gmail.com'
where lower(email) = 'minasamehdeif@gamil.com'
and not exists (select 1 from public.teachers_whitelist other_row
  where lower(other_row.email) = 'minasamehdeif@gmail.com' and other_row.id <> public.teachers_whitelist.id);

create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  matched_teacher public.teachers_whitelist%rowtype;
  is_head_account boolean := false;
  has_teacher_approval boolean := false;
  resolved_role public.user_role := 'student'::public.user_role;
  resolved_grade public.middle_school_grade;
  resolved_name text;
begin
  if new.email is null then return new; end if;
  if new.email_confirmed_at is not null then
    select exists(select 1 from private.head_accounts h where lower(h.email) = lower(new.email)) into is_head_account;
  end if;
  if not is_head_account then
    select tw.* into matched_teacher from public.teachers_whitelist tw
    where lower(tw.email) = lower(new.email) and tw.status = 'active' and tw.assigned_grade is not null limit 1;
    has_teacher_approval := found;
  end if;
  if is_head_account then
    resolved_role := 'head'::public.user_role;
  elsif has_teacher_approval then
    resolved_role := 'teacher'::public.user_role;
    resolved_grade := matched_teacher.assigned_grade;
  elsif tg_op = 'INSERT' then
    resolved_grade := case when new.raw_user_meta_data ->> 'grade_level' in ('grade-1','grade-2','grade-3')
      then (new.raw_user_meta_data ->> 'grade_level')::public.middle_school_grade else null end;
  end if;
  resolved_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  if tg_op = 'INSERT' then
    insert into public.users(id,email,name,role,phone,church_name,grade_level)
    values(new.id,lower(new.email),resolved_name,resolved_role,nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
      'كنيسة السيدة العذراء والشهيد مارمرقس',resolved_grade)
    on conflict(id) do update set email=excluded.email, role=excluded.role, grade_level=excluded.grade_level;
  else
    update public.users u set email=lower(new.email),
      role=case when is_head_account then 'head'::public.user_role
        when has_teacher_approval then 'teacher'::public.user_role
        when u.role in ('head'::public.user_role,'teacher'::public.user_role) then 'student'::public.user_role else u.role end,
      grade_level=case when is_head_account then null when has_teacher_approval then matched_teacher.assigned_grade
        when u.role in ('head'::public.user_role,'teacher'::public.user_role) then null else u.grade_level end
    where u.id=new.id;
  end if;
  return new;
end;
$function$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_maseery on auth.users;
drop trigger if exists on_auth_user_email_updated_maseery on auth.users;
create trigger on_auth_user_created_maseery after insert on auth.users
for each row execute function private.handle_new_auth_user();
create trigger on_auth_user_email_updated_maseery after update of email,email_confirmed_at on auth.users
for each row when (old.email is distinct from new.email or old.email_confirmed_at is distinct from new.email_confirmed_at)
execute function private.handle_new_auth_user();
