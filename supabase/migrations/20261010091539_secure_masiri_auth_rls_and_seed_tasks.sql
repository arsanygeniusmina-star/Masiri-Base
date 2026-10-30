create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select u.role::text
  from public.users as u
  where u.id = (select auth.uid())
  limit 1
$function$;

create or replace function private.current_grade_level()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select u.grade_level::text
  from public.users as u
  where u.id = (select auth.uid())
  limit 1
$function$;

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
      and (
        target_user.id = (select auth.uid())
        or (select private.current_app_role()) = 'head'
        or (
          (select private.current_app_role()) = 'teacher'
          and target_user.grade_level::text = (select private.current_grade_level())
        )
      )
  )
$function$;

revoke all on function private.current_app_role() from public, anon;
revoke all on function private.current_grade_level() from public, anon;
revoke all on function private.can_access_student(uuid) from public, anon;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.current_grade_level() to authenticated;
grant execute on function private.can_access_student(uuid) to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  matched_teacher public.teachers_whitelist%rowtype;
  resolved_role public.user_role := 'student'::public.user_role;
  resolved_grade public.middle_school_grade;
  resolved_name text;
begin
  if new.email is null then
    return new;
  end if;

  select *
    into matched_teacher
    from public.teachers_whitelist
   where lower(email) = lower(new.email)
     and status = 'active'
   limit 1;

  if found then
    resolved_role := 'teacher'::public.user_role;
    resolved_grade := matched_teacher.assigned_grade;
  else
    resolved_grade := case
      when new.raw_user_meta_data ->> 'grade_level' in ('grade-1', 'grade-2', 'grade-3')
        then (new.raw_user_meta_data ->> 'grade_level')::public.middle_school_grade
      else null
    end;
  end if;

  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.users (
    id, email, name, role, phone, church_name, grade_level
  )
  values (
    new.id,
    lower(new.email),
    resolved_name,
    resolved_role,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'كنيسة السيدة العذراء والشهيد مارمرقس',
    resolved_grade
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$function$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_maseery on auth.users;
create trigger on_auth_user_created_maseery
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.sync_points_from_daily_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  delta integer := 0;
  task_points integer := 0;
  target_student_id uuid;
begin
  if tg_op = 'INSERT' then
    target_student_id := new.student_id;
    if coalesce(new.completed, false) then
      select coalesce(points, 0) into task_points
      from public.daily_tasks where id = new.task_id;
      delta := coalesce(task_points, 0);
    end if;
  elsif tg_op = 'UPDATE' then
    target_student_id := new.student_id;
    if coalesce(new.completed, false) is distinct from coalesce(old.completed, false) then
      select coalesce(points, 0) into task_points
      from public.daily_tasks where id = coalesce(new.task_id, old.task_id);
      delta := case when coalesce(new.completed, false)
        then coalesce(task_points, 0)
        else -coalesce(task_points, 0)
      end;
    end if;
  elsif tg_op = 'DELETE' then
    target_student_id := old.student_id;
    if coalesce(old.completed, false) then
      select coalesce(points, 0) into task_points
      from public.daily_tasks where id = old.task_id;
      delta := -coalesce(task_points, 0);
    end if;
  end if;

  if delta <> 0 and target_student_id is not null then
    update public.users
       set points = greatest(0, coalesce(points, 0) + delta)
     where id = target_student_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.sync_points_from_daily_log() from public, anon, authenticated;
drop trigger if exists sync_student_points_from_daily_log on public.student_daily_logs;
create trigger sync_student_points_from_daily_log
after insert or update of completed or delete on public.student_daily_logs
for each row execute function private.sync_points_from_daily_log();

create or replace function public.award_student_points(p_student_id uuid, p_points integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_role text;
  target_grade text;
  actor_grade text;
  updated_points integer;
begin
  actor_role := (select private.current_app_role());
  actor_grade := (select private.current_grade_level());

  if actor_role not in ('head', 'teacher') then
    raise exception 'Not authorized to award points';
  end if;

  if p_points is null or p_points < 1 or p_points > 100 then
    raise exception 'Points must be between 1 and 100';
  end if;

  select grade_level::text into target_grade
    from public.users
   where id = p_student_id and role = 'student';

  if not found then
    raise exception 'Student not found';
  end if;

  if actor_role = 'teacher' and (actor_grade is null or target_grade is distinct from actor_grade) then
    raise exception 'Not authorized for this student grade';
  end if;

  update public.users
     set points = coalesce(points, 0) + p_points
   where id = p_student_id
   returning points into updated_points;

  return updated_points;
end;
$function$;

revoke all on function public.award_student_points(uuid, integer) from public, anon;
grant execute on function public.award_student_points(uuid, integer) to authenticated;

alter table public.users enable row level security;
alter table public.teachers_whitelist enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.student_daily_logs enable row level security;
alter table public.prayer_requests enable row level security;

drop policy if exists "Users can view profile" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Servants can view students" on public.users;
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can view own or permitted profiles"
on public.users for select to authenticated
using (
  id = (select auth.uid())
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and grade_level::text = (select private.current_grade_level())
  )
);

create policy "Users can update own editable profile"
on public.users for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Only Head can modify teachers_whitelist" on public.teachers_whitelist;
drop policy if exists "Servants can view teachers_whitelist" on public.teachers_whitelist;
drop policy if exists "Head can read teacher whitelist" on public.teachers_whitelist;
drop policy if exists "Head can insert teacher whitelist" on public.teachers_whitelist;
drop policy if exists "Head can update teacher whitelist" on public.teachers_whitelist;
drop policy if exists "Head can delete teacher whitelist" on public.teachers_whitelist;

create policy "Head can read teacher whitelist"
on public.teachers_whitelist for select to authenticated
using ((select private.current_app_role()) = 'head');
create policy "Head can insert teacher whitelist"
on public.teachers_whitelist for insert to authenticated
with check ((select private.current_app_role()) = 'head');
create policy "Head can update teacher whitelist"
on public.teachers_whitelist for update to authenticated
using ((select private.current_app_role()) = 'head')
with check ((select private.current_app_role()) = 'head');
create policy "Head can delete teacher whitelist"
on public.teachers_whitelist for delete to authenticated
using ((select private.current_app_role()) = 'head');

drop policy if exists "Authenticated can read active daily tasks" on public.daily_tasks;
drop policy if exists "Servants can manage daily tasks" on public.daily_tasks;
create policy "Authenticated can read active daily tasks"
on public.daily_tasks for select to authenticated
using (
  coalesce(is_active, true)
  or (select private.current_app_role()) in ('head', 'teacher')
);
create policy "Servants can insert daily tasks"
on public.daily_tasks for insert to authenticated
with check ((select private.current_app_role()) in ('head', 'teacher'));
create policy "Servants can update daily tasks"
on public.daily_tasks for update to authenticated
using ((select private.current_app_role()) in ('head', 'teacher'))
with check ((select private.current_app_role()) in ('head', 'teacher'));
create policy "Servants can delete daily tasks"
on public.daily_tasks for delete to authenticated
using ((select private.current_app_role()) in ('head', 'teacher'));

drop policy if exists "Users can view permitted daily logs" on public.student_daily_logs;
drop policy if exists "Students can insert own daily logs" on public.student_daily_logs;
drop policy if exists "Students can update own daily logs" on public.student_daily_logs;
drop policy if exists "Students can delete own daily logs" on public.student_daily_logs;
create policy "Users can view permitted daily logs"
on public.student_daily_logs for select to authenticated
using ((select private.can_access_student(student_id)));
create policy "Students can insert own daily logs"
on public.student_daily_logs for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (select 1 from public.daily_tasks t where t.id = task_id and coalesce(t.is_active, true))
);
create policy "Students can update own daily logs"
on public.student_daily_logs for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));
create policy "Students can delete own daily logs"
on public.student_daily_logs for delete to authenticated
using (student_id = (select auth.uid()));

drop policy if exists "Users can view permitted prayer requests" on public.prayer_requests;
drop policy if exists "Students can send own prayer requests" on public.prayer_requests;
drop policy if exists "Servants can moderate prayer requests" on public.prayer_requests;
drop policy if exists "Head can delete prayer requests" on public.prayer_requests;
create policy "Users can view permitted prayer requests"
on public.prayer_requests for select to authenticated
using (
  student_id = (select auth.uid())
  or coalesce(is_private, true) = false
  or (select private.current_app_role()) in ('head', 'teacher')
);
create policy "Students can send own prayer requests"
on public.prayer_requests for insert to authenticated
with check (student_id = (select auth.uid()));
create policy "Servants can moderate prayer requests"
on public.prayer_requests for update to authenticated
using ((select private.current_app_role()) in ('head', 'teacher'))
with check ((select private.current_app_role()) in ('head', 'teacher'));
create policy "Head can delete prayer requests"
on public.prayer_requests for delete to authenticated
using ((select private.current_app_role()) = 'head');

revoke all on table public.users, public.teachers_whitelist, public.daily_tasks, public.student_daily_logs, public.prayer_requests from anon;
revoke insert, delete, update on table public.users from authenticated;
grant select on table public.users to authenticated;
grant update (name, phone, church_name, spiritual_father, avatar_url) on table public.users to authenticated;

revoke all on table public.teachers_whitelist from authenticated;
grant select, insert, update, delete on table public.teachers_whitelist to authenticated;

revoke all on table public.daily_tasks from authenticated;
grant select, insert, update, delete on table public.daily_tasks to authenticated;

revoke all on table public.student_daily_logs from authenticated;
grant select, insert, update, delete on table public.student_daily_logs to authenticated;

revoke all on table public.prayer_requests from authenticated;
grant select on table public.prayer_requests to authenticated;
grant insert (student_id, student_name, content, is_private) on table public.prayer_requests to authenticated;
grant update (status) on table public.prayer_requests to authenticated;
grant delete on table public.prayer_requests to authenticated;

create index if not exists prayer_requests_student_id_idx on public.prayer_requests (student_id);
create index if not exists student_daily_logs_task_id_idx on public.student_daily_logs (task_id);
create index if not exists student_daily_logs_student_id_idx on public.student_daily_logs (student_id);
create unique index if not exists student_daily_logs_student_task_date_uidx
  on public.student_daily_logs (student_id, task_id, date);

insert into public.daily_tasks (title, subtitle, category, points, is_active)
select seed.title, seed.subtitle, seed.category, seed.points, true
from (values
  ('صلاة باكر من الأجبية', 'مزمور 62 وقراءة إنجيل النور الحقيقي', 'prayer', 20),
  ('قراءة الإصحاح اليومي', 'إنجيل متى - الإصحاح الخامس (الموعظة على الجبل)', 'bible', 25),
  ('آية الأسبوع للحفظ وتطبيقها', '«أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَل» (مت 5: 14)', 'verse', 15),
  ('عمل محبة خفي اليوم', 'مساعدة والديك في المنزل أو تشجيع زميل دراسي بكلمة طيبة', 'kindness', 20),
  ('صلاة الغروب والنوم', 'شكر الله على بركات اليوم وطلب سلام الروح', 'prayer', 20)
) as seed(title, subtitle, category, points)
where not exists (select 1 from public.daily_tasks);
