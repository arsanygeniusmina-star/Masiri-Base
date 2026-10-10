-- Restrict the internal TEST role to one explicitly allowlisted, email-confirmed account.
create table if not exists private.test_accounts (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint test_accounts_email_lower check (email = lower(trim(email)))
);
revoke all on private.test_accounts from public, anon, authenticated, service_role;
insert into private.test_accounts(email)
values ('apostlestech.church@gmail.com')
on conflict (email) do nothing;

-- TEST is assigned only after email confirmation and never via client-submitted metadata.
create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  matched_teacher public.teachers_whitelist%rowtype;
  is_head_account boolean := false;
  is_test_account boolean := false;
  has_teacher_approval boolean := false;
  resolved_role public.user_role := 'student'::public.user_role;
  resolved_grade public.middle_school_grade;
  resolved_name text;
begin
  if new.email is null then return new; end if;
  if new.email_confirmed_at is not null then
    select exists(select 1 from private.head_accounts h where lower(h.email) = lower(new.email)) into is_head_account;
    select exists(select 1 from private.test_accounts t where lower(t.email) = lower(new.email)) into is_test_account;
  end if;
  if not is_head_account and not is_test_account then
    select tw.* into matched_teacher from public.teachers_whitelist tw
    where lower(tw.email) = lower(new.email) and tw.status = 'active' and tw.assigned_grade is not null limit 1;
    has_teacher_approval := found;
  end if;
  if is_head_account then
    resolved_role := 'head'::public.user_role;
  elsif is_test_account then
    resolved_role := 'test'::public.user_role;
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
        when is_test_account then 'test'::public.user_role
        when has_teacher_approval then 'teacher'::public.user_role
        when u.role in ('head'::public.user_role,'teacher'::public.user_role,'test'::public.user_role) then 'student'::public.user_role
        else u.role end,
      grade_level=case when is_head_account or is_test_account then null when has_teacher_approval then matched_teacher.assigned_grade
        when u.role in ('head'::public.user_role,'teacher'::public.user_role,'test'::public.user_role) then null else u.grade_level end
    where u.id=new.id;
  end if;
  return new;
end;
$function$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

-- TEST may read app tables, but it does not gain write privileges from these policies.
create or replace function private.can_access_student(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.users as target_user
    where target_user.id = target_student_id
      and (
        target_user.id = (select auth.uid())
        or (select private.current_app_role()) in ('head', 'test')
        or ((select private.current_app_role()) = 'teacher'
          and target_user.grade_level::text = (select private.current_grade_level()))
      )
  )
$function$;
revoke all on function private.can_access_student(uuid) from public, anon;
grant execute on function private.can_access_student(uuid) to authenticated;

drop policy if exists "Users can view own or permitted profiles" on public.users;
create policy "Users can view own or permitted profiles" on public.users for select to authenticated
using (id = (select auth.uid())
  or (select private.current_app_role()) in ('head', 'test')
  or ((select private.current_app_role()) = 'teacher' and grade_level::text = (select private.current_grade_level())));

drop policy if exists "Head can read teacher whitelist" on public.teachers_whitelist;
create policy "Head and TEST can read teacher whitelist" on public.teachers_whitelist for select to authenticated
using ((select private.current_app_role()) in ('head', 'test'));

drop policy if exists "Authenticated can read active daily tasks" on public.daily_tasks;
create policy "Authenticated can read active daily tasks" on public.daily_tasks for select to authenticated
using (coalesce(is_active, true) or (select private.current_app_role()) in ('head', 'teacher', 'test'));

drop policy if exists "Users can view permitted prayer requests" on public.prayer_requests;
create policy "Users can view permitted prayer requests" on public.prayer_requests for select to authenticated
using (student_id = (select auth.uid()) or coalesce(is_private, true) = false
  or (select private.current_app_role()) in ('head', 'test')
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

drop policy if exists "Permitted users view attendance" on public.attendance_records;
create policy "Permitted users view attendance" on public.attendance_records for select to authenticated
using (student_id = (select auth.uid()) or (select private.current_app_role()) in ('head', 'test')
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

drop policy if exists "Permitted users view points history" on public.student_points_history;
create policy "Permitted users view points history" on public.student_points_history for select to authenticated
using (student_id = (select auth.uid()) or (select private.current_app_role()) in ('head', 'test')
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

drop policy if exists "Permitted users view student badges" on public.student_badges;
create policy "Permitted users view student badges" on public.student_badges for select to authenticated
using (student_id = (select auth.uid()) or (select private.current_app_role()) in ('head', 'test')
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

-- Read-only, allowlisted diagnostics. Never exposes auth.users, private schema, or API secrets.
create or replace function public.get_test_diagnostics()
returns jsonb language plpgsql stable security definer set search_path = '' as $function$
declare
  v_table text;
  v_count bigint;
  v_columns jsonb;
  v_rows jsonb;
  v_tables jsonb := '{}'::jsonb;
begin
  if (select auth.uid()) is null
    or lower(coalesce((select auth.jwt() ->> 'email'), '')) <> 'apostlestech.church@gmail.com'
    or not exists (
      select 1 from public.users u
      join private.test_accounts t on lower(t.email) = lower(u.email)
      where u.id = (select auth.uid()) and u.role::text = 'test'
    ) then
    raise exception 'Not authorized to view TEST diagnostics' using errcode = '42501';
  end if;

  foreach v_table in array array[
    'users', 'teachers_whitelist', 'daily_tasks', 'student_daily_logs',
    'prayer_requests', 'attendance_records', 'student_points_history',
    'student_badges', 'student_points_award_requests'
  ] loop
    execute format('select count(*) from public.%I', v_table) into v_count;
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', column_name, 'type', data_type, 'nullable', is_nullable = 'YES'
    ) order by ordinal_position), '[]'::jsonb)
      into v_columns
      from information_schema.columns
     where table_schema = 'public' and table_name = v_table;
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) from (select * from public.%I order by ctid desc limit 50) row_data',
      v_table
    ) into v_rows;
    v_tables := v_tables || jsonb_build_object(v_table, jsonb_build_object(
      'schema', 'public', 'row_count', v_count, 'columns', coalesce(v_columns, '[]'::jsonb),
      'rows', coalesce(v_rows, '[]'::jsonb), 'sample_limit', 50
    ));
  end loop;

  return jsonb_build_object(
    'project_ref', 'pduypklunvcsvabireuy',
    'generated_at', statement_timestamp(),
    'available_schema', 'public',
    'tables', v_tables,
    'security_note', 'Read-only app diagnostics; auth.users, private schema and secrets are excluded.'
  );
end;
$function$;
revoke all on function public.get_test_diagnostics() from public, anon;
grant execute on function public.get_test_diagnostics() to authenticated;
