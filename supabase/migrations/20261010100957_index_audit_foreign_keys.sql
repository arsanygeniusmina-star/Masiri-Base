create index if not exists attendance_records_marked_by_idx on public.attendance_records(marked_by);
create index if not exists student_points_award_requests_student_idx on public.student_points_award_requests(student_id);
create index if not exists student_points_award_requests_awarded_by_idx on public.student_points_award_requests(awarded_by);
create index if not exists student_points_history_awarded_by_idx on public.student_points_history(awarded_by);
