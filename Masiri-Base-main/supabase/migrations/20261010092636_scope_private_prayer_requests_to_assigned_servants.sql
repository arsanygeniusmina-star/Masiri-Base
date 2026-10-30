drop policy if exists "Users can view permitted prayer requests" on public.prayer_requests;
create policy "Users can view permitted prayer requests"
on public.prayer_requests for select to authenticated
using (
  student_id = (select auth.uid())
  or coalesce(is_private, true) = false
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);
