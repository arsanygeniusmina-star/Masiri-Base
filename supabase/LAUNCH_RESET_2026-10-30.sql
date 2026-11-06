-- LAUNCH RESET (run once, evening of 30 Oct 2026, in the Supabase SQL Editor)
-- 1) Clears all TEST activity: readings done, answers, AI reviews, likes.
--    (Accounts, points, the 260-day plan and photos in storage are NOT touched.)
-- 2) Moves the daily plan one day later: سفر التكوين ١ becomes 31 Oct, and so on.
--    Anyone who reads tonight (30 Oct) gets it counted as 31 Oct.

begin;

delete from public.reading_likes;
delete from public.reading_answer_reviews;
delete from public.reading_completions;
delete from public.reading_answers;

update public.reading_assignments
set scheduled_date = scheduled_date + 1
where target_type = 'all'
  and scheduled_date >= date '2026-10-30';

commit;

-- Check: the first days of the plan now start on 31 Oct.
select a.scheduled_date, p.reference_ar
from public.reading_assignments a
join public.bible_passages p on p.id = a.passage_id
where a.target_type = 'all'
order by a.scheduled_date
limit 3;
