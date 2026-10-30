-- The table's UNIQUE constraint already provides this index.
-- The redundant index added in the first migration was dropped to avoid duplicate write overhead.
drop index if exists public.student_daily_logs_student_task_date_uidx;
