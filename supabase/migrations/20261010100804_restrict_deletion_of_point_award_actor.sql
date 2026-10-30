alter table public.student_points_award_requests drop constraint if exists student_points_award_requests_awarded_by_fkey;
alter table public.student_points_award_requests add constraint student_points_award_requests_awarded_by_fkey
foreign key (awarded_by) references public.users(id) on delete restrict;
