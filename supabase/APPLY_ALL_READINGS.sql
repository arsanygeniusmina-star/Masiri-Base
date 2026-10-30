-- ============================================================================
-- THE APOSTLES — Bible readings, photo proof, reading plan & weekly restore
-- ALL FOUR migrations in the correct order. Paste everything into Supabase →
-- SQL Editor → New query → Run. Additive only: existing tables (including the
-- existing bible_* tables) and data are not changed. Safe to run again.
-- ============================================================================

-- >>>>>>>>>>>>>>>> 20261023010000_bible_study_daily_readings.sql >>>>>>>>>>>>>>>>
-- =============================================================================
-- Bible Study, Daily Readings, Streaks & Teacher Tracking
-- -----------------------------------------------------------------------------
-- Additive migration. It does not alter or drop any existing table, policy or
-- function. Authorization reuses the existing helpers in the private schema:
--   private.current_app_role(), private.current_grade_level(),
--   private.can_access_student(uuid)
-- so teacher scope stays "students of my assigned grade" and head scope stays
-- "all students", exactly as the rest of Masiri.
-- The TEST role is intentionally given no access to reading records.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Shared Bible reference data (66 books, Smith & Van Dyck / SVD numbering)
--    Named reading_bible_books so it never touches an existing public.bible_books
--    table that another Bible feature may already use in the same project.
-- -----------------------------------------------------------------------------
create table if not exists public.reading_bible_books (
  id text primary key,
  name_ar text not null,
  short_name_ar text not null,
  testament text not null check (testament in ('OT', 'NT')),
  category_ar text not null,
  total_chapters smallint not null check (total_chapters between 1 and 150),
  bolls_book_number smallint not null unique check (bolls_book_number between 1 and 66),
  sort_order smallint not null unique
);

insert into public.reading_bible_books
  (id, name_ar, short_name_ar, testament, category_ar, total_chapters, bolls_book_number, sort_order)
values
  ('gen', 'سفر التكوين', 'التكوين', 'OT', 'شريعة موسى (التوراة)', 50, 1, 1),
  ('exod', 'سفر الخروج', 'الخروج', 'OT', 'شريعة موسى (التوراة)', 40, 2, 2),
  ('lev', 'سفر اللاويين', 'اللاويين', 'OT', 'شريعة موسى (التوراة)', 27, 3, 3),
  ('num', 'سفر العدد', 'العدد', 'OT', 'شريعة موسى (التوراة)', 36, 4, 4),
  ('deut', 'سفر التثنية', 'التثنية', 'OT', 'شريعة موسى (التوراة)', 34, 5, 5),
  ('josh', 'سفر يشوع', 'يشوع', 'OT', 'الأسفار التاريخية', 24, 6, 6),
  ('judg', 'سفر القضاة', 'القضاة', 'OT', 'الأسفار التاريخية', 21, 7, 7),
  ('ruth', 'سفر راعوث', 'راعوث', 'OT', 'الأسفار التاريخية', 4, 8, 8),
  ('1sam', 'سفر صموئيل الأول', 'صموئيل الأول', 'OT', 'الأسفار التاريخية', 31, 9, 9),
  ('2sam', 'سفر صموئيل الثاني', 'صموئيل الثاني', 'OT', 'الأسفار التاريخية', 24, 10, 10),
  ('1kings', 'سفر ملوك الأول', 'ملوك الأول', 'OT', 'الأسفار التاريخية', 22, 11, 11),
  ('2kings', 'سفر ملوك الثاني', 'ملوك الثاني', 'OT', 'الأسفار التاريخية', 25, 12, 12),
  ('1chron', 'سفر أخبار الأيام الأول', 'أخبار الأيام الأول', 'OT', 'الأسفار التاريخية', 29, 13, 13),
  ('2chron', 'سفر أخبار الأيام الثاني', 'أخبار الأيام الثاني', 'OT', 'الأسفار التاريخية', 36, 14, 14),
  ('ezra', 'سفر عزرا', 'عزرا', 'OT', 'الأسفار التاريخية', 10, 15, 15),
  ('neh', 'سفر نحميا', 'نحميا', 'OT', 'الأسفار التاريخية', 13, 16, 16),
  ('esth', 'سفر أستير', 'أستير', 'OT', 'الأسفار التاريخية', 10, 17, 17),
  ('job', 'سفر أيوب', 'أيوب', 'OT', 'الأسفار الشعرية والحكمية', 42, 18, 18),
  ('psalm', 'سفر المزامير', 'المزامير', 'OT', 'الأسفار الشعرية والحكمية', 150, 19, 19),
  ('prov', 'سفر الأمثال', 'الأمثال', 'OT', 'الأسفار الشعرية والحكمية', 31, 20, 20),
  ('eccl', 'سفر الجامعة', 'الجامعة', 'OT', 'الأسفار الشعرية والحكمية', 12, 21, 21),
  ('song', 'سفر نشيد الأنشاد', 'نشيد الأنشاد', 'OT', 'الأسفار الشعرية والحكمية', 8, 22, 22),
  ('isa', 'سفر إشعياء', 'إشعياء', 'OT', 'الأنبياء الكبار', 66, 23, 23),
  ('jer', 'سفر إرميا', 'إرميا', 'OT', 'الأنبياء الكبار', 52, 24, 24),
  ('lam', 'سفر مراثي إرميا', 'مراثي إرميا', 'OT', 'الأنبياء الكبار', 5, 25, 25),
  ('ezek', 'سفر حزقيال', 'حزقيال', 'OT', 'الأنبياء الكبار', 48, 26, 26),
  ('dan', 'سفر دانيال', 'دانيال', 'OT', 'الأنبياء الكبار', 12, 27, 27),
  ('hos', 'سفر هوشع', 'هوشع', 'OT', 'الأنبياء الصغار', 14, 28, 28),
  ('joel', 'سفر يوئيل', 'يوئيل', 'OT', 'الأنبياء الصغار', 3, 29, 29),
  ('amos', 'سفر عاموس', 'عاموس', 'OT', 'الأنبياء الصغار', 9, 30, 30),
  ('obad', 'سفر عوبديا', 'عوبديا', 'OT', 'الأنبياء الصغار', 1, 31, 31),
  ('jonah', 'سفر يونان', 'يونان', 'OT', 'الأنبياء الصغار', 4, 32, 32),
  ('mic', 'سفر ميخاء', 'ميخاء', 'OT', 'الأنبياء الصغار', 7, 33, 33),
  ('nah', 'سفر ناحوم', 'ناحوم', 'OT', 'الأنبياء الصغار', 3, 34, 34),
  ('hab', 'سفر حبقوق', 'حبقوق', 'OT', 'الأنبياء الصغار', 3, 35, 35),
  ('zeph', 'سفر صفنيا', 'صفنيا', 'OT', 'الأنبياء الصغار', 3, 36, 36),
  ('hag', 'سفر حجي', 'حجي', 'OT', 'الأنبياء الصغار', 2, 37, 37),
  ('zech', 'سفر زكريا', 'زكريا', 'OT', 'الأنبياء الصغار', 14, 38, 38),
  ('mal', 'سفر ملاخي', 'ملاخي', 'OT', 'الأنبياء الصغار', 4, 39, 39),
  ('matt', 'إنجيل متى', 'متى', 'NT', 'الأناجيل المقدسة', 28, 40, 40),
  ('mark', 'إنجيل مرقس', 'مرقس', 'NT', 'الأناجيل المقدسة', 16, 41, 41),
  ('luke', 'إنجيل لوقا', 'لوقا', 'NT', 'الأناجيل المقدسة', 24, 42, 42),
  ('john', 'إنجيل يوحنا', 'يوحنا', 'NT', 'الأناجيل المقدسة', 21, 43, 43),
  ('acts', 'سفر أعمال الرسل', 'أعمال الرسل', 'NT', 'الأسفار التاريخية (العهد الجديد)', 28, 44, 44),
  ('rom', 'رسالة بولس الرسول إلى أهل رومية', 'رومية', 'NT', 'رسائل بولس الرسول', 16, 45, 45),
  ('1cor', 'رسالة بولس الرسول الأولى إلى أهل كورنثوس', 'كورنثوس الأولى', 'NT', 'رسائل بولس الرسول', 16, 46, 46),
  ('2cor', 'رسالة بولس الرسول الثانية إلى أهل كورنثوس', 'كورنثوس الثانية', 'NT', 'رسائل بولس الرسول', 13, 47, 47),
  ('gal', 'رسالة بولس الرسول إلى أهل غلاطية', 'غلاطية', 'NT', 'رسائل بولس الرسول', 6, 48, 48),
  ('eph', 'رسالة بولس الرسول إلى أهل أفسس', 'أفسس', 'NT', 'رسائل بولس الرسول', 6, 49, 49),
  ('phil', 'رسالة بولس الرسول إلى أهل فيلبي', 'فيلبي', 'NT', 'رسائل بولس الرسول', 4, 50, 50),
  ('col', 'رسالة بولس الرسول إلى أهل كولوسي', 'كولوسي', 'NT', 'رسائل بولس الرسول', 4, 51, 51),
  ('1thess', 'رسالة بولس الرسول الأولى إلى أهل تسالونيكي', 'تسالونيكي الأولى', 'NT', 'رسائل بولس الرسول', 5, 52, 52),
  ('2thess', 'رسالة بولس الرسول الثانية إلى أهل تسالونيكي', 'تسالونيكي الثانية', 'NT', 'رسائل بولس الرسول', 3, 53, 53),
  ('1tim', 'رسالة بولس الرسول الأولى إلى تيموثاوس', 'تيموثاوس الأولى', 'NT', 'رسائل بولس الرسول', 6, 54, 54),
  ('2tim', 'رسالة بولس الرسول الثانية إلى تيموثاوس', 'تيموثاوس الثانية', 'NT', 'رسائل بولس الرسول', 4, 55, 55),
  ('titus', 'رسالة بولس الرسول إلى طيطس', 'طيطس', 'NT', 'رسائل بولس الرسول', 3, 56, 56),
  ('philm', 'رسالة بولس الرسول إلى فيلمون', 'فيلمون', 'NT', 'رسائل بولس الرسول', 1, 57, 57),
  ('heb', 'رسالة بولس الرسول إلى العبرانيين', 'العبرانيين', 'NT', 'رسائل بولس الرسول', 13, 58, 58),
  ('jas', 'رسالة يعقوب الرسول', 'يعقوب', 'NT', 'رسائل الكاثوليكون', 5, 59, 59),
  ('1pet', 'رسالة بطرس الرسول الأولى', 'بطرس الأولى', 'NT', 'رسائل الكاثوليكون', 5, 60, 60),
  ('2pet', 'رسالة بطرس الرسول الثانية', 'بطرس الثانية', 'NT', 'رسائل الكاثوليكون', 3, 61, 61),
  ('1john', 'رسالة يوحنا الرسول الأولى', 'يوحنا الأولى', 'NT', 'رسائل الكاثوليكون', 5, 62, 62),
  ('2john', 'رسالة يوحنا الرسول الثانية', 'يوحنا الثانية', 'NT', 'رسائل الكاثوليكون', 1, 63, 63),
  ('3john', 'رسالة يوحنا الرسول الثالثة', 'يوحنا الثالثة', 'NT', 'رسائل الكاثوليكون', 1, 64, 64),
  ('jude', 'رسالة يهوذا الرسول', 'يهوذا', 'NT', 'رسائل الكاثوليكون', 1, 65, 65),
  ('rev', 'سفر رؤيا يوحنا اللاهوتي', 'الرؤيا', 'NT', 'الأسفار النبوية (العهد الجديد)', 22, 66, 66)
on conflict (id) do update set
  name_ar = excluded.name_ar,
  short_name_ar = excluded.short_name_ar,
  testament = excluded.testament,
  category_ar = excluded.category_ar,
  total_chapters = excluded.total_chapters,
  bolls_book_number = excluded.bolls_book_number,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- 2. Bible passages: an immutable snapshot of the exact verses that were assigned
--    (students always read the same text the servant previewed, even offline
--    from the external Bible API).
-- -----------------------------------------------------------------------------
create table if not exists public.bible_passages (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.reading_bible_books(id) on delete restrict,
  chapter smallint not null check (chapter >= 1),
  verse_start smallint not null check (verse_start >= 1),
  verse_end smallint not null,
  reference_ar text not null check (length(trim(reference_ar)) between 1 and 200),
  verses jsonb not null check (
    jsonb_typeof(verses) = 'array'
    and jsonb_array_length(verses) between 1 and 200
  ),
  translation text not null default 'SVD' check (translation in ('SVD')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bible_passages_verse_range_chk check (verse_end >= verse_start and verse_end - verse_start < 200)
);

create index if not exists bible_passages_book_chapter_idx on public.bible_passages (book_id, chapter);
create index if not exists bible_passages_created_by_idx on public.bible_passages (created_by);

-- -----------------------------------------------------------------------------
-- 3. Reading assignments
--    target_type = 'grade'    -> every student of target_grade (incl. late joiners)
--    target_type = 'students' -> only the rows in reading_assignment_recipients
--    scheduled_date is a calendar date in the ministry time zone (timezone column).
-- -----------------------------------------------------------------------------
create table if not exists public.reading_assignments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  passage_id uuid not null references public.bible_passages(id) on delete restrict,
  title text check (title is null or length(trim(title)) between 1 and 120),
  target_type text not null check (target_type in ('grade', 'students')),
  target_grade public.middle_school_grade,
  scheduled_date date not null,
  timezone text not null default 'Africa/Cairo' check (length(timezone) between 1 and 64),
  question_text text check (question_text is null or length(trim(question_text)) between 1 and 1000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_assignments_target_chk check (
    (target_type = 'grade' and target_grade is not null)
    or (target_type = 'students' and target_grade is null)
  )
);

create index if not exists reading_assignments_grade_date_idx
  on public.reading_assignments (target_grade, scheduled_date desc)
  where status = 'published';
create index if not exists reading_assignments_creator_date_idx
  on public.reading_assignments (created_by, scheduled_date desc);
create index if not exists reading_assignments_passage_idx
  on public.reading_assignments (passage_id);
create index if not exists reading_assignments_status_date_idx
  on public.reading_assignments (status, scheduled_date desc);

create table if not exists public.reading_assignment_recipients (
  assignment_id uuid not null references public.reading_assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create index if not exists reading_assignment_recipients_student_idx
  on public.reading_assignment_recipients (student_id);

-- -----------------------------------------------------------------------------
-- 4. Reading completions (one per student per assignment)
--    completed_at is always set by the database (now()), never by the client.
--    local_date is the student's local calendar date of completion and is the
--    basis of streaks; it must be within one day of the server's UTC date.
-- -----------------------------------------------------------------------------
create table if not exists public.reading_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.reading_assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  local_date date not null,
  constraint reading_completions_once_uidx unique (assignment_id, student_id)
);

create index if not exists reading_completions_student_date_idx
  on public.reading_completions (student_id, local_date desc);
create index if not exists reading_completions_assignment_idx
  on public.reading_completions (assignment_id);

-- -----------------------------------------------------------------------------
-- 5. Answers to the optional teacher question (one per student per assignment)
-- -----------------------------------------------------------------------------
create table if not exists public.reading_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.reading_assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  answer_text text not null check (length(trim(answer_text)) between 1 and 2000),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_answers_once_uidx unique (assignment_id, student_id)
);

create index if not exists reading_answers_assignment_idx on public.reading_answers (assignment_id);
create index if not exists reading_answers_student_idx on public.reading_answers (student_id);

-- -----------------------------------------------------------------------------
-- 6. Private authorization helpers (SECURITY DEFINER, fixed search_path)
-- -----------------------------------------------------------------------------
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
        (a.target_type = 'grade' and a.target_grade = u.grade_level)
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

create or replace function private.can_manage_reading_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.reading_assignments as a
    where a.id = p_assignment_id
      and (
        (select private.current_app_role()) = 'head'
        or (
          (select private.current_app_role()) = 'teacher'
          and a.created_by = (select auth.uid())
          and (
            a.target_type = 'students'
            or a.target_grade::text = (select private.current_grade_level())
          )
        )
      )
  )
$function$;

create or replace function private.has_reading_recipient_in_scope(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.reading_assignment_recipients as r
    where r.assignment_id = p_assignment_id
      and (select private.can_access_student(r.student_id))
  )
$function$;

-- Small definer lookups used inside policies to avoid policy recursion between
-- reading_assignments and reading_assignment_recipients.
create or replace function private.is_listed_reading_recipient(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.reading_assignment_recipients as r
    where r.assignment_id = p_assignment_id
      and r.student_id = (select auth.uid())
  )
$function$;

create or replace function private.is_draft_reading_assignment(p_assignment_id uuid, p_students_only boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.reading_assignments as a
    where a.id = p_assignment_id
      and a.status = 'draft'
      and (not p_students_only or a.target_type = 'students')
  )
$function$;

create or replace function private.can_read_bible_passage(p_passage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when (select private.current_app_role()) in ('head', 'teacher') then true
    when (select private.current_app_role()) = 'student' then exists (
      select 1
      from public.reading_assignments as a
      where a.passage_id = p_passage_id
        and a.status = 'published'
        and (select private.is_reading_recipient(a.id, (select auth.uid())))
    )
    else false
  end
$function$;

revoke all on function private.is_reading_recipient(uuid, uuid) from public, anon;
revoke all on function private.can_manage_reading_assignment(uuid) from public, anon;
revoke all on function private.has_reading_recipient_in_scope(uuid) from public, anon;
revoke all on function private.can_read_bible_passage(uuid) from public, anon;
revoke all on function private.is_listed_reading_recipient(uuid) from public, anon;
revoke all on function private.is_draft_reading_assignment(uuid, boolean) from public, anon;
grant execute on function private.is_reading_recipient(uuid, uuid) to authenticated;
grant execute on function private.can_manage_reading_assignment(uuid) to authenticated;
grant execute on function private.has_reading_recipient_in_scope(uuid) to authenticated;
grant execute on function private.can_read_bible_passage(uuid) to authenticated;
grant execute on function private.is_listed_reading_recipient(uuid) to authenticated;
grant execute on function private.is_draft_reading_assignment(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Integrity triggers (server-controlled timestamps and validation)
-- -----------------------------------------------------------------------------
create or replace function private.prepare_bible_passage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_total_chapters smallint;
begin
  select b.total_chapters into v_total_chapters
    from public.reading_bible_books as b
   where b.id = new.book_id;

  if not found then
    raise exception 'Unknown Bible book: %', new.book_id using errcode = '23503';
  end if;
  if new.chapter > v_total_chapters then
    raise exception 'Chapter % is outside this book (max %)', new.chapter, v_total_chapters using errcode = '23514';
  end if;
  if jsonb_array_length(new.verses) <> (new.verse_end - new.verse_start + 1) then
    raise exception 'Verse snapshot does not match the selected range' using errcode = '23514';
  end if;

  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  new.created_at := now();
  return new;
end;
$function$;

revoke all on function private.prepare_bible_passage() from public, anon, authenticated;
drop trigger if exists prepare_bible_passage on public.bible_passages;
create trigger prepare_bible_passage
before insert on public.bible_passages
for each row execute function private.prepare_bible_passage();

create or replace function private.prepare_reading_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- Reject unknown IANA zones early (raises invalid_parameter_value).
  perform now() at time zone new.timezone;

  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      new.created_by := (select auth.uid());
    end if;
    new.created_at := now();
    new.published_at := case when new.status = 'published' then now() else null end;
    new.archived_at := case when new.status = 'archived' then now() else null end;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.status = 'published' and old.status is distinct from 'published' then
      new.published_at := coalesce(old.published_at, now());
    else
      new.published_at := old.published_at;
    end if;
    if new.status = 'archived' and old.status is distinct from 'archived' then
      new.archived_at := now();
    elsif new.status <> 'archived' then
      new.archived_at := null;
    else
      new.archived_at := old.archived_at;
    end if;
    -- After publication the audience and passage are fixed so that progress
    -- history stays meaningful. Archive and re-assign instead.
    if old.status <> 'draft' and (
      new.passage_id is distinct from old.passage_id
      or new.target_type is distinct from old.target_type
      or new.target_grade is distinct from old.target_grade
    ) then
      raise exception 'Published readings cannot change passage or audience' using errcode = '42501';
    end if;
    if new.status = 'draft' and old.status <> 'draft' then
      raise exception 'A published reading cannot return to draft' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.prepare_reading_assignment() from public, anon, authenticated;
drop trigger if exists prepare_reading_assignment on public.reading_assignments;
create trigger prepare_reading_assignment
before insert or update on public.reading_assignments
for each row execute function private.prepare_reading_assignment();

create or replace function private.prepare_reading_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scheduled_date date;
  v_utc_today date := (now() at time zone 'UTC')::date;
begin
  select a.scheduled_date into v_scheduled_date
    from public.reading_assignments as a
   where a.id = new.assignment_id;

  if not found then
    raise exception 'Reading assignment not found' using errcode = '23503';
  end if;

  -- The client reports its local calendar date; any real time zone is within
  -- one day of UTC, so this prevents back-dating or future-dating streaks.
  if new.local_date is null or new.local_date < v_utc_today - 1 or new.local_date > v_utc_today + 1 then
    raise exception 'Invalid local completion date' using errcode = '23514';
  end if;

  if new.local_date < v_scheduled_date then
    raise exception 'This reading is not open yet' using errcode = '23514';
  end if;

  new.completed_at := now();
  return new;
end;
$function$;

revoke all on function private.prepare_reading_completion() from public, anon, authenticated;
drop trigger if exists prepare_reading_completion on public.reading_completions;
create trigger prepare_reading_completion
before insert on public.reading_completions
for each row execute function private.prepare_reading_completion();

create or replace function private.prepare_reading_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.reading_assignments as a
      where a.id = new.assignment_id
        and a.question_text is not null
    ) then
      raise exception 'This reading has no question to answer' using errcode = '23514';
    end if;
    new.submitted_at := now();
  else
    new.assignment_id := old.assignment_id;
    new.student_id := old.student_id;
    new.submitted_at := old.submitted_at;
  end if;
  new.answer_text := trim(new.answer_text);
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.prepare_reading_answer() from public, anon, authenticated;
drop trigger if exists prepare_reading_answer on public.reading_answers;
create trigger prepare_reading_answer
before insert or update on public.reading_answers
for each row execute function private.prepare_reading_answer();

-- -----------------------------------------------------------------------------
-- 8. Row-level security
-- -----------------------------------------------------------------------------
alter table public.reading_bible_books enable row level security;
alter table public.bible_passages enable row level security;
alter table public.reading_assignments enable row level security;
alter table public.reading_assignment_recipients enable row level security;
alter table public.reading_completions enable row level security;
alter table public.reading_answers enable row level security;

-- reading_bible_books: read-only reference data for signed-in users.
drop policy if exists "Signed-in users read Bible books" on public.reading_bible_books;
create policy "Signed-in users read Bible books"
on public.reading_bible_books for select to authenticated
using (true);

-- bible_passages
drop policy if exists "Permitted users read Bible passages" on public.bible_passages;
create policy "Permitted users read Bible passages"
on public.bible_passages for select to authenticated
using ((select private.can_read_bible_passage(id)));

drop policy if exists "Servants create Bible passages" on public.bible_passages;
create policy "Servants create Bible passages"
on public.bible_passages for insert to authenticated
with check (
  (select private.current_app_role()) in ('head', 'teacher')
  and created_by = (select auth.uid())
);

-- reading_assignments
drop policy if exists "Permitted users read reading assignments" on public.reading_assignments;
-- Evaluated on the row's own columns (not a lookup by id) so that
-- INSERT ... RETURNING works for the servant who just created the row.
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
          (target_type = 'grade' and target_grade::text = (select private.current_grade_level()))
          or (target_type = 'students' and (select private.has_reading_recipient_in_scope(id)))
        )
      )
    )
  )
  or (
    (select private.current_app_role()) = 'student'
    and status = 'published'
    and (
      (target_type = 'grade' and target_grade::text = (select private.current_grade_level()))
      or (
        target_type = 'students'
        and (select private.is_listed_reading_recipient(id))
      )
    )
  )
);

drop policy if exists "Servants create scoped reading assignments" on public.reading_assignments;
create policy "Servants create scoped reading assignments"
on public.reading_assignments for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select private.current_app_role()) = 'head'
    or (
      (select private.current_app_role()) = 'teacher'
      and (
        target_type = 'students'
        or target_grade::text = (select private.current_grade_level())
      )
    )
  )
);

drop policy if exists "Servants update own scoped reading assignments" on public.reading_assignments;
create policy "Servants update own scoped reading assignments"
on public.reading_assignments for update to authenticated
using ((select private.can_manage_reading_assignment(id)))
with check (
  (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and created_by = (select auth.uid())
    and (
      target_type = 'students'
      or target_grade::text = (select private.current_grade_level())
    )
  )
);

drop policy if exists "Servants delete own draft reading assignments" on public.reading_assignments;
create policy "Servants delete own draft reading assignments"
on public.reading_assignments for delete to authenticated
using (
  status = 'draft'
  and (select private.can_manage_reading_assignment(id))
);

-- reading_assignment_recipients
drop policy if exists "Permitted users read reading recipients" on public.reading_assignment_recipients;
create policy "Permitted users read reading recipients"
on public.reading_assignment_recipients for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);

drop policy if exists "Servants add scoped reading recipients" on public.reading_assignment_recipients;
create policy "Servants add scoped reading recipients"
on public.reading_assignment_recipients for insert to authenticated
with check (
  (select private.current_app_role()) in ('head', 'teacher')
  and (select private.can_manage_reading_assignment(assignment_id))
  and (select private.can_access_student(student_id))
  and (select private.is_draft_reading_assignment(assignment_id, true))
);

drop policy if exists "Servants remove draft reading recipients" on public.reading_assignment_recipients;
create policy "Servants remove draft reading recipients"
on public.reading_assignment_recipients for delete to authenticated
using (
  (select private.can_manage_reading_assignment(assignment_id))
  and (select private.is_draft_reading_assignment(assignment_id, false))
);

-- reading_completions
drop policy if exists "Permitted users read reading completions" on public.reading_completions;
create policy "Permitted users read reading completions"
on public.reading_completions for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);

drop policy if exists "Students complete own assigned readings" on public.reading_completions;
create policy "Students complete own assigned readings"
on public.reading_completions for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select private.current_app_role()) = 'student'
  and (select private.is_reading_recipient(assignment_id, (select auth.uid())))
);

drop policy if exists "Head corrects reading completions" on public.reading_completions;
create policy "Head corrects reading completions"
on public.reading_completions for delete to authenticated
using ((select private.current_app_role()) = 'head');

-- reading_answers
drop policy if exists "Permitted users read reading answers" on public.reading_answers;
create policy "Permitted users read reading answers"
on public.reading_answers for select to authenticated
using (
  (student_id = (select auth.uid()) and (select private.current_app_role()) = 'student')
  or (select private.current_app_role()) = 'head'
  or (
    (select private.current_app_role()) = 'teacher'
    and (select private.can_access_student(student_id))
  )
);

drop policy if exists "Students answer own assigned readings" on public.reading_answers;
create policy "Students answer own assigned readings"
on public.reading_answers for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (select private.current_app_role()) = 'student'
  and (select private.is_reading_recipient(assignment_id, (select auth.uid())))
);

drop policy if exists "Students edit own reading answers" on public.reading_answers;
create policy "Students edit own reading answers"
on public.reading_answers for update to authenticated
using (
  student_id = (select auth.uid())
  and (select private.current_app_role()) = 'student'
)
with check (
  student_id = (select auth.uid())
  and (select private.current_app_role()) = 'student'
  and (select private.is_reading_recipient(assignment_id, (select auth.uid())))
);

-- -----------------------------------------------------------------------------
-- 9. Table privileges (RLS still decides which rows; grants decide which columns)
-- -----------------------------------------------------------------------------
revoke all on table
  public.reading_bible_books,
  public.bible_passages,
  public.reading_assignments,
  public.reading_assignment_recipients,
  public.reading_completions,
  public.reading_answers
from anon, authenticated;

grant select on table public.reading_bible_books to authenticated;

grant select on table public.bible_passages to authenticated;
grant insert (book_id, chapter, verse_start, verse_end, reference_ar, verses, translation, created_by)
  on table public.bible_passages to authenticated;

grant select, delete on table public.reading_assignments to authenticated;
grant insert (created_by, passage_id, title, target_type, target_grade, scheduled_date, timezone, question_text, status)
  on table public.reading_assignments to authenticated;
grant update (passage_id, title, target_type, target_grade, scheduled_date, timezone, question_text, status)
  on table public.reading_assignments to authenticated;

grant select, delete on table public.reading_assignment_recipients to authenticated;
grant insert (assignment_id, student_id) on table public.reading_assignment_recipients to authenticated;

grant select, delete on table public.reading_completions to authenticated;
grant insert (assignment_id, student_id, local_date) on table public.reading_completions to authenticated;

grant select on table public.reading_answers to authenticated;
grant insert (assignment_id, student_id, answer_text) on table public.reading_answers to authenticated;
grant update (answer_text) on table public.reading_answers to authenticated;

-- -----------------------------------------------------------------------------
-- 10. Streaks, derived only from real completion records.
--     A streak day = a local calendar date with >= 1 completion (several
--     completions on one date still count once). The current streak stays
--     alive through "yesterday" so a student keeps it until today ends.
--     SECURITY INVOKER: RLS limits each caller to the students they may see.
-- -----------------------------------------------------------------------------
create or replace function public.get_reading_streaks(p_student_ids uuid[], p_today date default null)
returns table (
  student_id uuid,
  current_streak integer,
  longest_streak integer,
  last_completed_date date,
  total_reading_days integer,
  completed_today boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with ref as (
    select coalesce(p_today, (now() at time zone 'Africa/Cairo')::date) as today
  ),
  ids as (
    select distinct sid
    from unnest(coalesce(p_student_ids, array[]::uuid[])) with ordinality as t(sid, ord)
    where ord <= 500
  ),
  days as (
    select distinct c.student_id, c.local_date
    from public.reading_completions as c
    join ids on ids.sid = c.student_id
  ),
  grouped as (
    select d.student_id,
           d.local_date,
           d.local_date - (row_number() over (partition by d.student_id order by d.local_date))::integer as grp
    from days as d
  ),
  runs as (
    select g.student_id, max(g.local_date) as run_end, count(*)::integer as run_length
    from grouped as g
    group by g.student_id, g.grp
  )
  select
    ids.sid as student_id,
    coalesce((
      select r.run_length
      from runs as r, ref
      where r.student_id = ids.sid
        and r.run_end >= ref.today - 1
      order by r.run_end desc
      limit 1
    ), 0) as current_streak,
    coalesce((select max(r.run_length) from runs as r where r.student_id = ids.sid), 0) as longest_streak,
    (select max(r.run_end) from runs as r where r.student_id = ids.sid) as last_completed_date,
    coalesce((select sum(r.run_length) from runs as r where r.student_id = ids.sid), 0)::integer as total_reading_days,
    exists (
      select 1 from days as d, ref
      where d.student_id = ids.sid and d.local_date = ref.today
    ) as completed_today
  from ids
$function$;

revoke all on function public.get_reading_streaks(uuid[], date) from public, anon;
grant execute on function public.get_reading_streaks(uuid[], date) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. One-call, all-or-nothing assignment creation used by the teacher wizard.
--     SECURITY INVOKER: every insert below is checked by the RLS policies above,
--     so a teacher can only target their own grade or students in it.
-- -----------------------------------------------------------------------------
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
  p_publish boolean default true
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
    scheduled_date, timezone, question_text, status
  )
  values (
    (select auth.uid()), v_passage_id, nullif(trim(coalesce(p_title, '')), ''),
    p_target_type,
    case when p_target_type = 'grade' then p_target_grade else null end,
    p_scheduled_date, coalesce(nullif(trim(p_timezone), ''), 'Africa/Cairo'),
    nullif(trim(coalesce(p_question_text, '')), ''),
    'draft'
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
  text, integer, integer, integer, text, jsonb, text, public.middle_school_grade, uuid[], date, text, text, text, boolean
) from public, anon;
grant execute on function public.create_reading_assignment(
  text, integer, integer, integer, text, jsonb, text, public.middle_school_grade, uuid[], date, text, text, text, boolean
) to authenticated;

-- >>>>>>>>>>>>>>>> 20261023020000_reading_photo_proof.sql >>>>>>>>>>>>>>>>
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

-- >>>>>>>>>>>>>>>> 20261030010000_reading_plan_all_students.sql >>>>>>>>>>>>>>>>
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

-- >>>>>>>>>>>>>>>> 20261030020000_reading_week_restore.sql >>>>>>>>>>>>>>>>
-- =============================================================================
-- Daily window + weekly restore for reading Streaks
-- -----------------------------------------------------------------------------
-- Run AFTER the other 2026-10-23 / 2026-10-30 reading migrations. Idempotent.
--
-- Rules:
--   * A reading belongs to its scheduled calendar day (12:00 AM → 11:59 PM).
--   * A missed reading can be RESTORED (completed later) only while still inside
--     the same reading week, Friday → Thursday 11:59 PM. After that it is closed.
--   * The Streak counts credited days = the scheduled date of each completed
--     reading, so a restored reading fills its own day back into the Streak.
--   * While missed days are still restorable the Streak is frozen (not reset);
--     it resets only once the week closes without them being restored.
-- =============================================================================

-- 1. Week helper: the Friday that starts the reading week containing p_day.
create or replace function private.reading_week_start(p_day date)
returns date
language sql
immutable
set search_path = ''
as $function$
  -- isodow: Mon=1 … Fri=5 … Sun=7  →  days since Friday = (isodow + 2) % 7
  select p_day - ((extract(isodow from p_day)::integer + 2) % 7)
$function$;

revoke all on function private.reading_week_start(date) from public, anon;
grant execute on function private.reading_week_start(date) to authenticated;

-- 2. The day a completion counts for (set by the database, never the client).
alter table public.reading_completions add column if not exists credited_date date;

update public.reading_completions as c
   set credited_date = a.scheduled_date
  from public.reading_assignments as a
 where a.id = c.assignment_id
   and c.credited_date is null;

create index if not exists reading_completions_student_credited_idx
  on public.reading_completions (student_id, credited_date desc);

-- 3. Completion trigger: answer + photo (as before) + restore window.
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

  -- Restore is only possible inside the same Friday → Thursday week.
  if private.reading_week_start(new.local_date) <> private.reading_week_start(v_scheduled_date) then
    raise exception 'Restore window closed for this reading' using errcode = '23514';
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
  new.credited_date := v_scheduled_date;
  return new;
end;
$function$;

revoke all on function private.prepare_reading_completion() from public, anon, authenticated;

-- 4. Streak by credited day (falls back to local_date for older rows).
create or replace function public.get_reading_streaks(p_student_ids uuid[], p_today date default null)
returns table (
  student_id uuid,
  current_streak integer,
  longest_streak integer,
  last_completed_date date,
  total_reading_days integer,
  completed_today boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with ref as (
    select coalesce(p_today, (now() at time zone 'Africa/Cairo')::date) as today
  ),
  ids as (
    select distinct sid
    from unnest(coalesce(p_student_ids, array[]::uuid[])) with ordinality as t(sid, ord)
    where ord <= 500
  ),
  days as (
    select distinct c.student_id, coalesce(c.credited_date, c.local_date) as local_date
    from public.reading_completions as c
    join ids on ids.sid = c.student_id
  ),
  grouped as (
    select d.student_id,
           d.local_date,
           d.local_date - (row_number() over (partition by d.student_id order by d.local_date))::integer as grp
    from days as d
  ),
  runs as (
    select g.student_id, max(g.local_date) as run_end, count(*)::integer as run_length
    from grouped as g
    group by g.student_id, g.grp
  )
  select
    ids.sid as student_id,
    coalesce((
      select r.run_length
      from runs as r, ref
      where r.student_id = ids.sid
        -- Alive if it reached yesterday, or if every missing day since it ended is
        -- still restorable (i.e. inside this Friday → Thursday week).
        and r.run_end >= least(ref.today - 1, private.reading_week_start(ref.today) - 1)
      order by r.run_end desc
      limit 1
    ), 0) as current_streak,
    coalesce((select max(r.run_length) from runs as r where r.student_id = ids.sid), 0) as longest_streak,
    (select max(r.run_end) from runs as r where r.student_id = ids.sid) as last_completed_date,
    coalesce((select sum(r.run_length) from runs as r where r.student_id = ids.sid), 0)::integer as total_reading_days,
    exists (
      select 1 from days as d, ref
      where d.student_id = ids.sid and d.local_date = ref.today
    ) as completed_today
  from ids
$function$;

revoke all on function public.get_reading_streaks(uuid[], date) from public, anon;
grant execute on function public.get_reading_streaks(uuid[], date) to authenticated;
