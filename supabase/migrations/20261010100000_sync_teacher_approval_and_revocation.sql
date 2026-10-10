-- Keep teacher approval and role assignment synchronized in the database.
-- The profile role is the source of authorization for RLS, so this also revokes
-- teacher-only database access immediately when an approval is deactivated.

create unique index if not exists teachers_whitelist_email_lower_uidx
  on public.teachers_whitelist (lower(email));

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  matched_teacher public.teachers_whitelist%rowtype;
  has_teacher_approval boolean := false;
  resolved_role public.user_role := 'student'::public.user_role;
  resolved_grade public.middle_school_grade;
  resolved_name text;
begin
  if new.email is null then
    return new;
  end if;

  select tw.*
    into matched_teacher
    from public.teachers_whitelist as tw
   where lower(tw.email) = lower(new.email)
     and tw.status = 'active'
     and tw.assigned_grade is not null
   limit 1;

  has_teacher_approval := found;

  if has_teacher_approval then
    resolved_role := 'teacher'::public.user_role;
    resolved_grade := matched_teacher.assigned_grade;
  elsif tg_op = 'INSERT' then
    resolved_grade := case
      when new.raw_user_meta_data ->> 'grade_level' in ('grade-1', 'grade-2', 'grade-3')
        then (new.raw_user_meta_data ->> 'grade_level')::public.middle_school_grade
      else null
    end;
  end if;

  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  if tg_op = 'INSERT' then
    insert into public.users (
      id, email, name, role, phone, church_name, grade_level
    )
    values (
      new.id,
      lower(new.email),
      resolved_name,
      resolved_role,
      nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
      'كنيسة السيدة العذراء والشهيد مارمرقس',
      resolved_grade
    )
    on conflict (id) do update
      set email = excluded.email,
          role = case
            when public.users.role = 'head'::public.user_role then public.users.role
            else excluded.role
          end,
          grade_level = case
            when public.users.role = 'head'::public.user_role then public.users.grade_level
            else excluded.grade_level
          end;
  else
    update public.users as u
       set email = lower(new.email),
           role = case
             when u.role = 'head'::public.user_role then u.role
             when has_teacher_approval then 'teacher'::public.user_role
             when u.role = 'teacher'::public.user_role then 'student'::public.user_role
             else u.role
           end,
           grade_level = case
             when u.role = 'head'::public.user_role then u.grade_level
             when has_teacher_approval then matched_teacher.assigned_grade
             when u.role = 'teacher'::public.user_role then null
             else u.grade_level
           end
     where u.id = new.id;
  end if;

  return new;
end;
$function$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_maseery on auth.users;
create trigger on_auth_user_created_maseery
after insert or update of email on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.sync_teacher_whitelist_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  affected_emails text[];
  target_email text;
  approved_grade public.middle_school_grade;
  is_approved boolean;
begin
  if tg_op = 'DELETE' then
    affected_emails := array[lower(old.email)];
  elsif tg_op = 'UPDATE' then
    affected_emails := array[lower(old.email), lower(new.email)];
  else
    affected_emails := array[lower(new.email)];
  end if;

  for target_email in
    select distinct email
    from unnest(affected_emails) as affected(email)
    where email is not null
  loop
    approved_grade := null;

    select tw.assigned_grade
      into approved_grade
      from public.teachers_whitelist as tw
     where lower(tw.email) = target_email
       and tw.status = 'active'
       and tw.assigned_grade is not null
     limit 1;

    is_approved := found;

    update public.users as u
       set role = case
             when u.role = 'head'::public.user_role then u.role
             when is_approved then 'teacher'::public.user_role
             when u.role = 'teacher'::public.user_role then 'student'::public.user_role
             else u.role
           end,
           grade_level = case
             when u.role = 'head'::public.user_role then u.grade_level
             when is_approved then approved_grade
             when u.role = 'teacher'::public.user_role then null
             else u.grade_level
           end
     where lower(u.email) = target_email;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_teacher_whitelist_profile() from public, anon, authenticated;

drop trigger if exists sync_teacher_whitelist_profile on public.teachers_whitelist;
create trigger sync_teacher_whitelist_profile
after insert or update or delete on public.teachers_whitelist
for each row execute function private.sync_teacher_whitelist_profile();

-- Reconcile any pre-existing profiles with the approved whitelist. Heads are
-- preserved and are never demoted by whitelist changes.
update public.users as u
   set role = 'teacher'::public.user_role,
       grade_level = tw.assigned_grade
  from public.teachers_whitelist as tw
 where lower(u.email) = lower(tw.email)
   and tw.status = 'active'
   and tw.assigned_grade is not null
   and u.role <> 'head'::public.user_role;

update public.users as u
   set role = 'student'::public.user_role,
       grade_level = null
 where u.role = 'teacher'::public.user_role
   and not exists (
     select 1
       from public.teachers_whitelist as tw
      where lower(tw.email) = lower(u.email)
        and tw.status = 'active'
        and tw.assigned_grade is not null
   );