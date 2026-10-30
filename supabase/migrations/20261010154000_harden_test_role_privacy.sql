-- Keep TEST role previews interactive with local demo data while denying access to real student records.
-- Head/Teacher access remains governed by their existing grade-scoped policies.

create or replace function private.can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.users as target_user
    where target_user.id = target_student_id
      and target_user.role = 'student'::public.user_role
      and (
        (select auth.uid()) = target_user.id
        or (select private.current_app_role()) = 'head'
        or (
          (select private.current_app_role()) = 'teacher'
          and target_user.grade_level::text = (select private.current_grade_level())
        )
      )
  )
$function$;

revoke all on function private.can_access_student(uuid) from public, anon;
grant execute on function private.can_access_student(uuid) to authenticated;

drop policy if exists "Users can view own or permitted profiles" on public.users;
create policy "Users can view own or permitted profiles"
on public.users for select to authenticated
using (
  id = (select auth.uid())
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and role = 'student'::public.user_role
    and grade_level::text = (select private.current_grade_level())
  )
);

drop policy if exists "Permitted users view attendance" on public.attendance_records;
create policy "Permitted users view attendance"
on public.attendance_records for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(attendance_records.student_id))
  )
);

drop policy if exists "Users can view permitted prayer requests" on public.prayer_requests;
create policy "Users can view permitted prayer requests"
on public.prayer_requests for select to authenticated
using (
  (select private.current_app_role()) <> 'test'
  and (
    (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
    or coalesce(is_private, true) = false
    or (select private.current_app_role()) = 'head'
    or (
      (select private.current_app_role()) = 'teacher'
      and (select private.can_access_student(prayer_requests.student_id))
    )
  )
);

drop policy if exists "Permitted users view student badges" on public.student_badges;
create policy "Permitted users view student badges"
on public.student_badges for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_badges.student_id))
  )
);

drop policy if exists "Permitted users view points history" on public.student_points_history;
create policy "Permitted users view points history"
on public.student_points_history for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_points_history.student_id))
  )
);

drop policy if exists "Head and TEST can read teacher whitelist" on public.teachers_whitelist;
create policy "Head can read teacher whitelist"
on public.teachers_whitelist for select to authenticated
using ((select private.current_app_role()) = 'head');

-- TEST diagnostics expose aggregate counts and column metadata, never raw production rows.
create or replace function private.get_test_diagnostics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_table text;
  v_count bigint;
  v_columns jsonb;
  v_tables jsonb := '{}'::jsonb;
begin
  if (select auth.uid()) is null
    or not exists (
      select 1
      from public.users u
      join private.test_accounts t on lower(t.email) = lower(u.email)
      where u.id = (select auth.uid())
        and u.role::text = 'test'
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
      'name', column_name,
      'type', data_type,
      'nullable', is_nullable = 'YES'
    ) order by ordinal_position), '[]'::jsonb)
      into v_columns
      from information_schema.columns
     where table_schema = 'public'
       and table_name = v_table;

    v_tables := v_tables || jsonb_build_object(v_table, jsonb_build_object(
      'schema', 'public',
      'row_count', v_count,
      'columns', coalesce(v_columns, '[]'::jsonb),
      'rows', '[]'::jsonb,
      'sample_limit', 0
    ));
  end loop;

  return jsonb_build_object(
    'project_ref', 'pduypklunvcsvabireuy',
    'generated_at', statement_timestamp(),
    'available_schema', 'public',
    'tables', v_tables,
    'security_note', 'TEST diagnostics expose only schema, aggregate row counts and local runtime logs. No production table rows or auth/private data are returned.'
  );
end;
$function$;

revoke all on function private.get_test_diagnostics() from public, anon;
grant execute on function private.get_test_diagnostics() to authenticated;

create or replace function public.get_test_diagnostics()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.get_test_diagnostics();
$function$;

revoke all on function public.get_test_diagnostics() from public, anon, authenticated;
grant execute on function public.get_test_diagnostics() to authenticated;

-- Anonymous clients use Auth and the role-detection RPC only; app data requires sign-in.
revoke all privileges on all tables in schema public from anon;
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
