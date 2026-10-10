-- The TEST account can inspect application records but must not perform student writes.
drop policy if exists "Students can insert own daily logs" on public.student_daily_logs;
create policy "Students can insert own daily logs" on public.student_daily_logs for insert to authenticated
with check (student_id = (select auth.uid())
  and (select private.current_app_role()) = 'student'
  and exists (select 1 from public.daily_tasks t where t.id = task_id and coalesce(t.is_active, true)));

drop policy if exists "Students can update own daily logs" on public.student_daily_logs;
create policy "Students can update own daily logs" on public.student_daily_logs for update to authenticated
using (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
with check (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student');

drop policy if exists "Students can delete own daily logs" on public.student_daily_logs;
create policy "Students can delete own daily logs" on public.student_daily_logs for delete to authenticated
using (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student');

drop policy if exists "Students can send own prayer requests" on public.prayer_requests;
create policy "Students can send own prayer requests" on public.prayer_requests for insert to authenticated
with check (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student');
