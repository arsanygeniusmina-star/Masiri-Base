-- =============================================================================
-- Daily reading plan support
-- -----------------------------------------------------------------------------
-- Run AFTER 20261023010000_* and 20261023020000_*. Additive & idempotent.
--   1. New audience target_type = 'all'  → every student of every grade
--      (only head servants can create it).
--   2. reminder_verse: the verse number shown in the daily reminder.
-- =============================================================================

-- 1. Audience 'all'
alter table public.reading_assignments drop constraint if exists reading_assignments_target_type_check;
alter table public.reading_assignments
  add constraint reading_assignments_target_type_check
  check (target_type in ('grade', 'students', 'all'));

alter table public.reading_assignments drop constraint if exists reading_assignments_target_chk;
alter table public.reading_assignments
  add constraint reading_assignments_target_chk check (
    (target_type = 'grade' and target_grade is not null)
    or (target_type in ('students', 'all') and target_grade is null)
  );

-- 2. Reminder verse
alter table public.reading_assignments
  add column if not exists reminder_verse smallint check (reminder_verse is null or reminder_verse >= 1);

create index if not exists reading_assignments_all_date_idx
  on public.reading_assignments (scheduled_date desc)
  where status = 'published' and target_type = 'all';

create or replace function private.validate_reading_reminder_verse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_start smallint;
  v_end smallint;
begin
  if new.reminder_verse is null then
    return new;
  end if;
  select p.verse_start, p.verse_end into v_start, v_end
    from public.bible_passages as p
   where p.id = new.passage_id;
  if not found or new.reminder_verse < v_start or new.reminder_verse > v_end then
    raise exception 'Reminder verse must be inside the assigned passage' using errcode = '23514';
  end if;
  return new;
end;
$function$;

revoke all on function private.validate_reading_reminder_verse() from public, anon, authenticated;
drop trigger if exists validate_reading_reminder_verse on public.reading_assignments;
create trigger validate_reading_reminder_verse
before insert or update of reminder_verse, passage_id on public.reading_assignments
for each row execute function private.validate_reading_reminder_verse();

-- 3. Recipients: 'all' reaches every student
create or replace function private.is_reading_recipient(p_assignment_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.reading_assignments as a
    join public.users as u on u.id = p_student_id
    where a.id = p_assignment_id
      and a.status = 'published'
      and u.role = 'student'::public.user_role
      and (
        a.target_type = 'all'
        or (a.target_type = 'grade' and a.target_grade = u.grade_level)
        or (
          a.target_type = 'students'
          and exists (
            select 1
            from public.reading_assignment_recipients as r
            where r.assignment_id = a.id
              and r.student_id = u.id
          )
        )
      )
  )
$function$;

revoke all on function private.is_reading_recipient(uuid, uuid) from public, anon;
grant execute on function private.is_reading_recipient(uuid, uuid) to authenticated;

drop policy if exists "Permitted users read reading assignments" on public.reading_assignments;
create policy "Permitted users read reading assignments"
on public.reading_assignments for select to authenticated
using (
  (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (
      created_by = (select auth.uid())
      or (
        status <> 'draft'
        and (
          target_type = 'all'
          or (target_type = 'grade' and target_grade::text = (select private.current_grade_level()))
          or (target_type = 'students' and (select private.has_reading_recipient_in_scope(id)))
        )
      )
    )
  )
  or (
    (select private.current_app_role()) = 'student'
    and status = 'published'
    and (
      target_type = 'all'
      or (target_type = 'grade' and target_grade::text = (select private.current_grade_level()))
      or (target_type = 'students' and (select private.is_listed_reading_recipient(id)))
    )
  )
);

-- Teachers keep their existing insert/update rules ('students' or their own grade),
-- so only head servants can create or edit 'all' readings.

grant insert (reminder_verse) on table public.reading_assignments to authenticated;
grant update (reminder_verse) on table public.reading_assignments to authenticated;

-- 4. One-call creation, now with the reminder verse
drop function if exists public.create_reading_assignment(
  text, integer, integer, integer, text, jsonb, text, public.middle_school_grade, uuid[], date, text, text, text, boolean
);

create or replace function public.create_reading_assignment(
  p_book_id text,
  p_chapter integer,
  p_verse_start integer,
  p_verse_end integer,
  p_reference_ar text,
  p_verses jsonb,
  p_target_type text,
  p_target_grade public.middle_school_grade,
  p_student_ids uuid[],
  p_scheduled_date date,
  p_timezone text default 'Africa/Cairo',
  p_question_text text default null,
  p_title text default null,
  p_publish boolean default true,
  p_reminder_verse integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_passage_id uuid;
  v_assignment_id uuid;
  v_student_ids uuid[];
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if (select private.current_app_role()) not in ('head', 'teacher') then
    raise exception 'Only servants can assign readings' using errcode = '42501';
  end if;
  if p_target_type = 'all' and (select private.current_app_role()) <> 'head' then
    raise exception 'Only head servants can assign readings to all students' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct sid), array[]::uuid[])
    into v_student_ids
    from unnest(coalesce(p_student_ids, array[]::uuid[])) as t(sid)
   where sid is not null;

  if p_target_type = 'students' and cardinality(v_student_ids) = 0 then
    raise exception 'Choose at least one student' using errcode = '23514';
  end if;
  if cardinality(v_student_ids) > 300 then
    raise exception 'Too many recipients in one assignment' using errcode = '23514';
  end if;

  insert into public.bible_passages (book_id, chapter, verse_start, verse_end, reference_ar, verses, created_by)
  values (p_book_id, p_chapter, p_verse_start, p_verse_end, trim(p_reference_ar), p_verses, (select auth.uid()))
  returning id into v_passage_id;

  insert into public.reading_assignments (
    created_by, passage_id, title, target_type, target_grade,
    scheduled_date, timezone, question_text, status, reminder_verse
  )
  values (
    (select auth.uid()), v_passage_id, nullif(trim(coalesce(p_title, '')), ''),
    p_target_type,
    case when p_target_type = 'grade' then p_target_grade else null end,
    p_scheduled_date, coalesce(nullif(trim(p_timezone), ''), 'Africa/Cairo'),
    nullif(trim(coalesce(p_question_text, '')), ''),
    'draft',
    p_reminder_verse
  )
  returning id into v_assignment_id;

  if p_target_type = 'students' then
    insert into public.reading_assignment_recipients (assignment_id, student_id)
    select v_assignment_id, sid from unnest(v_student_ids) as t(sid);
  end if;

  if coalesce(p_publish, true) then
    update public.reading_assignments
       set status = 'published'
     where id = v_assignment_id;
  end if;

  return v_assignment_id;
end;
$function$;

revoke all on function public.create_reading_assignment(
  text, integer, integer, integer, text, jsonb, text, public.middle_school_grade, uuid[], date, text, text, text, boolean, integer
) from public, anon;
grant execute on function public.create_reading_assignment(
  text, integer, integer, integer, text, jsonb, text, public.middle_school_grade, uuid[], date, text, text, text, boolean, integer
) to authenticated;
