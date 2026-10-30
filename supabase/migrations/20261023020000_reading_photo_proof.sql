-- =============================================================================
-- Reading completion proof: required answer + required camera photo
-- -----------------------------------------------------------------------------
-- Run AFTER 20261023010000_bible_study_daily_readings.sql. Additive & idempotent.
--
-- A reading (and therefore a streak day) only counts when the student:
--   1. answered the teacher's question (when the reading has one), and
--   2. uploaded a photo taken after reading, stored in the private
--      `reading-photos` bucket at  <student_id>/<assignment_id>/<file>.
-- The database enforces both, so the rule cannot be skipped from the client.
-- Photos are private: only the student, servants of the student's grade and
-- head servants can view them.
-- =============================================================================

-- 1. Private storage bucket (5 MB per photo, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reading-photos',
  'reading-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Photo reference on completions
alter table public.reading_completions
  add column if not exists photo_path text
  check (photo_path is null or length(photo_path) between 1 and 300);

-- 3. Path helpers (safe parsing: never throws on malformed names)
create or replace function private.reading_photo_owner(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_parts text[] := string_to_array(coalesce(p_name, ''), '/');
begin
  if array_length(v_parts, 1) <> 3
    or v_parts[1] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or v_parts[2] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or v_parts[3] !~ '^[A-Za-z0-9._-]{1,120}$' then
    return null;
  end if;
  return v_parts[1]::uuid;
end;
$function$;

create or replace function private.reading_photo_assignment(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $function$
begin
  if private.reading_photo_owner(p_name) is null then
    return null;
  end if;
  return (string_to_array(p_name, '/'))[2]::uuid;
end;
$function$;

create or replace function private.can_upload_reading_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.reading_photo_owner(p_name) = (select auth.uid())
    and (select private.current_app_role()) = 'student'
    and (select private.is_reading_recipient(private.reading_photo_assignment(p_name), (select auth.uid())))
$function$;

create or replace function private.can_view_reading_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when private.reading_photo_owner(p_name) is null then false
    when (select private.current_app_role()) = 'student' then private.reading_photo_owner(p_name) = (select auth.uid())
    when (select private.current_app_role()) = 'head' then true
    when (select private.current_app_role()) = 'teacher' then (select private.can_access_student(private.reading_photo_owner(p_name)))
    else false
  end
$function$;

create or replace function private.can_delete_reading_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  -- Students may remove a retaken photo, but never one already used as proof.
  select private.reading_photo_owner(p_name) = (select auth.uid())
    and (select private.current_app_role()) = 'student'
    and not exists (
      select 1 from public.reading_completions as c where c.photo_path = p_name
    )
$function$;

revoke all on function private.reading_photo_owner(text) from public, anon;
revoke all on function private.reading_photo_assignment(text) from public, anon;
revoke all on function private.can_upload_reading_photo(text) from public, anon;
revoke all on function private.can_view_reading_photo(text) from public, anon;
revoke all on function private.can_delete_reading_photo(text) from public, anon;
grant execute on function private.reading_photo_owner(text) to authenticated;
grant execute on function private.reading_photo_assignment(text) to authenticated;
grant execute on function private.can_upload_reading_photo(text) to authenticated;
grant execute on function private.can_view_reading_photo(text) to authenticated;
grant execute on function private.can_delete_reading_photo(text) to authenticated;

-- 4. Storage policies (scoped to this bucket only)
drop policy if exists "Students upload own reading photos" on storage.objects;
create policy "Students upload own reading photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'reading-photos'
  and (select private.can_upload_reading_photo(name))
);

drop policy if exists "Permitted users view reading photos" on storage.objects;
create policy "Permitted users view reading photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'reading-photos'
  and (select private.can_view_reading_photo(name))
);

drop policy if exists "Students delete unused reading photos" on storage.objects;
create policy "Students delete unused reading photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'reading-photos'
  and (select private.can_delete_reading_photo(name))
);

-- 5. Completion now requires the proof
create or replace function private.prepare_reading_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scheduled_date date;
  v_question text;
  v_utc_today date := (now() at time zone 'UTC')::date;
begin
  select a.scheduled_date, a.question_text
    into v_scheduled_date, v_question
    from public.reading_assignments as a
   where a.id = new.assignment_id;

  if not found then
    raise exception 'Reading assignment not found' using errcode = '23503';
  end if;

  if new.local_date is null or new.local_date < v_utc_today - 1 or new.local_date > v_utc_today + 1 then
    raise exception 'Invalid local completion date' using errcode = '23514';
  end if;

  if new.local_date < v_scheduled_date then
    raise exception 'This reading is not open yet' using errcode = '23514';
  end if;

  if v_question is not null and not exists (
    select 1
    from public.reading_answers as ans
    where ans.assignment_id = new.assignment_id
      and ans.student_id = new.student_id
  ) then
    raise exception 'Answer required before completing this reading' using errcode = '23514';
  end if;

  if new.photo_path is null
    or private.reading_photo_owner(new.photo_path) is distinct from new.student_id
    or private.reading_photo_assignment(new.photo_path) is distinct from new.assignment_id
    or not exists (
      select 1
      from storage.objects as o
      where o.bucket_id = 'reading-photos'
        and o.name = new.photo_path
    ) then
    raise exception 'Photo proof required before completing this reading' using errcode = '23514';
  end if;

  new.completed_at := now();
  return new;
end;
$function$;

revoke all on function private.prepare_reading_completion() from public, anon, authenticated;

-- 6. Students may now send photo_path when completing
grant insert (assignment_id, student_id, local_date, photo_path)
  on table public.reading_completions to authenticated;
