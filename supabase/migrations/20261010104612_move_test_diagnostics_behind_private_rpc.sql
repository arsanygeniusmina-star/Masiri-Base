-- Keep the privileged implementation out of the exposed public API schema.
create or replace function private.get_test_diagnostics()
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

revoke all on function private.get_test_diagnostics() from public, anon;
grant execute on function private.get_test_diagnostics() to authenticated;

-- Expose only an invoker wrapper. The private implementation validates the allowlisted account.
create or replace function public.get_test_diagnostics()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.get_test_diagnostics();
$function$;

revoke all on function public.get_test_diagnostics() from public, anon;
grant execute on function public.get_test_diagnostics() to authenticated;
