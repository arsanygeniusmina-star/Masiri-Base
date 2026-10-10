create table if not exists public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  badge_code text not null check (badge_code in ('b-1','b-2','b-3','b-4','b-5')),
  title text not null,
  description text not null,
  category text not null,
  awarded_at timestamptz not null default now(),
  unique(student_id, badge_code)
);
create index if not exists student_badges_student_awarded_idx on public.student_badges(student_id, awarded_at desc);
alter table public.student_badges enable row level security;
drop policy if exists "Permitted users view student badges" on public.student_badges;
create policy "Permitted users view student badges" on public.student_badges for select to authenticated
using (student_id = (select auth.uid()) or (select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and (select private.can_access_student(student_id))));

create or replace function private.evaluate_student_badges(p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $function$
declare prayer_days integer; bible_count integer; kindness_count integer; total_count integer; present_count integer;
begin
  select count(distinct l.date) into prayer_days from public.student_daily_logs l join public.daily_tasks t on t.id=l.task_id
  where l.student_id=p_student_id and l.completed=true and t.category='prayer';
  if prayer_days >= 7 then
    insert into public.student_badges(student_id,badge_code,title,description,category)
    values(p_student_id,'b-1','مواظب الأجبية','أكمل مهام الصلاة في سبعة أيام مختلفة','spiritual') on conflict(student_id,badge_code) do nothing;
  end if;
  select count(*) into bible_count from public.student_daily_logs l join public.daily_tasks t on t.id=l.task_id
  where l.student_id=p_student_id and l.completed=true and t.category in ('bible','verse');
  if bible_count >= 5 then
    insert into public.student_badges(student_id,badge_code,title,description,category)
    values(p_student_id,'b-2','حارس الإنجيل','أكمل خمس مهام مرتبطة بالكتاب المقدس أو الآيات','study') on conflict(student_id,badge_code) do nothing;
  end if;
  select count(*) into total_count from public.student_daily_logs l where l.student_id=p_student_id and l.completed=true;
  if total_count >= 10 then
    insert into public.student_badges(student_id,badge_code,title,description,category)
    values(p_student_id,'b-3','قلب نقي','أكمل عشر مهام روحية','spiritual') on conflict(student_id,badge_code) do nothing;
  end if;
  select count(*) into kindness_count from public.student_daily_logs l join public.daily_tasks t on t.id=l.task_id
  where l.student_id=p_student_id and l.completed=true and t.category='kindness';
  if kindness_count >= 5 then
    insert into public.student_badges(student_id,badge_code,title,description,category)
    values(p_student_id,'b-5','سفير المحبة','أكمل خمس مهام مرتبطة بالمحبة والخدمة','spiritual') on conflict(student_id,badge_code) do nothing;
  end if;
  select count(*) into present_count from public.attendance_records a where a.student_id=p_student_id and a.status='present';
  if present_count >= 5 then
    insert into public.student_badges(student_id,badge_code,title,description,category)
    values(p_student_id,'b-4','نجم الحضور الذهبي','سُجل حضورك في خمس مناسبات','attendance') on conflict(student_id,badge_code) do nothing;
  end if;
end;
$function$;
create or replace function private.handle_student_badge_evaluation()
returns trigger language plpgsql security definer set search_path = '' as $function$
begin perform private.evaluate_student_badges(new.student_id); return new; end;
$function$;
drop trigger if exists evaluate_badges_after_daily_log on public.student_daily_logs;
create trigger evaluate_badges_after_daily_log after insert or update of completed on public.student_daily_logs
for each row when (new.completed = true) execute function private.handle_student_badge_evaluation();
drop trigger if exists evaluate_badges_after_attendance on public.attendance_records;
create trigger evaluate_badges_after_attendance after insert or update of status on public.attendance_records
for each row when (new.status = 'present') execute function private.handle_student_badge_evaluation();
revoke all on function private.evaluate_student_badges(uuid) from public, anon, authenticated;
revoke all on function private.handle_student_badge_evaluation() from public, anon, authenticated;
