# Bible Study, Daily Readings, Streaks & Teacher Tracking

This feature brings the Bible reader and daily-reading workflow from the legacy `masiri-main`
(Firebase) app into Masiri-Base. It uses Supabase Auth, PostgreSQL, row-level security (RLS) and the
existing Masiri design system. Nothing from Firebase is used.

## 1. Migration map (legacy → Masiri-Base)

| Legacy item (`masiri-main`) | Decision | Where it lives now |
|---|---|---|
| `src/lib/bibleData.ts` – 66 books, Arabic names, SVD book numbers | **Direct reuse** (data) | `src/lib/bible/books.ts` + seeded `public.reading_bible_books` |
| `bibleData.ts` – `fetchVerseTextByReference`, bolls.life SVD fetch | **Adapt** (typed service, cache, timeout, HTML clean-up) | `src/lib/bible/bibleService.ts` |
| `bibleData.ts` – `PRELOADED_CHAPTERS` (partial chapters) | **Obsolete** – partial chapters would mislead; assigned passages are snapshotted in the DB instead | — |
| `components/common/FullBibleNavigator.tsx` | **Adapt** – OT/NT tabs, search, chapter grid, contiguous range picking, Arabic references, “Assign this passage” | `src/components/bible/FullBibleNavigator.tsx` |
| Navigator “highlight colour / notes / publish verse” | **Reimplement** as the 5-step assignment wizard | `src/components/readings/AssignReadingWizard.tsx` |
| `teacher/TeacherBibleVerse.tsx` (Firestore `bibleVerses`) | **Reimplement** on Supabase (`reading_assignments`) | `src/screens/BibleStudyScreen.tsx` |
| `student/StudentBibleReading.tsx`, `ReadingRecord` | **Reimplement** (one completion per assignment, server timestamp) | `src/screens/MyReadingsScreen.tsx`, `public.reading_completions` |
| Legacy streak = “number of readings” (`MaseeriContext.tsx`) | **Reimplement** – consecutive local calendar days from real completions | `public.get_reading_streaks`, `computeReadingStreak` |
| `api/bible/chapter.ts`, `server.ts` Express proxy | **Obsolete** – the provider allows browser requests; Masiri-Base is a static Vite app | — |
| `api/ai/generate-quiz.ts`, `lib/quizGenerator.ts` (Gemini) | **Not migrated** (out of scope; replaced by the teacher's free-text question) | — |
| `firebase.ts`, `firestore.rules`, `firebase-*.json`, `MaseeriContext` listeners | **Obsolete** | Supabase + RLS |

## 2. Database (migration `20261023010000_bible_study_daily_readings.sql`)

| Table | Purpose |
|---|---|
| `reading_bible_books` | 66 books (Arabic name, testament, chapter count, SVD number). Read-only reference data. |
| `bible_passages` | Immutable snapshot of the exact verses assigned (book, chapter, verse range, Arabic reference, verse JSON). |
| `reading_assignments` | Creator, passage, audience (`grade` or `students`), `scheduled_date` (calendar date), time zone, optional question, status `draft` / `published` / `archived`. |
| `reading_assignment_recipients` | Individual students for `target_type = 'students'`. |
| `reading_completions` | One row per student per assignment (unique). `completed_at` is set by the database; `local_date` is the student's calendar date. |
| `reading_answers` | One answer per student per assignment; `submitted_at` set by the database; `updated_at` tracks edits. |

Functions:

* `public.create_reading_assignment(...)` creates the passage, assignment and recipients and publishes them in **one transaction**. It runs as the caller (SECURITY INVOKER), so RLS applies.
* `public.get_reading_streaks(student_ids uuid[], today date)` returns current streak, longest streak, last reading date, total reading days and `completed_today`. It is derived only from `reading_completions` and runs as the caller.

**Photo proof (migration `20261023020000_reading_photo_proof.sql`).** A reading only counts as completed when the student has answered the question (if the reading has one) **and** uploaded a photo taken after reading. Photos go to the private Storage bucket `reading-photos` (max 5 MB each) at `<student_id>/<assignment_id>/<file>`. The app compresses each photo to roughly 200–600 KB first. The database rejects any completion without both. Only the student, the servants of the student's grade and head servants can view the photo. A photo already used as proof cannot be deleted by the student.

Streak rules: a day counts when the student completed one or more readings that local calendar day. Several completions on the same day count once. The current streak stays alive until the end of the day after the last reading. Example: someone who read yesterday but not yet today keeps their streak.

## 3. Security (RLS)

* **Students** see only *published* assignments for their grade or naming them individually, plus those passages. They can insert completions and answers only for themselves and only for readings assigned to them. They can only edit their own answer text. They cannot set timestamps or complete future readings. They cannot back-date or future-date `local_date` by more than one day from server time.
* **Teachers** create assignments only for their own grade or for students in it. They manage (publish, archive, delete drafts) only their own assignments. They read completions and answers only for students in their grade.
* **Head servants** can do all of the above for every grade.
* **TEST role and anonymous users** get no access to reading records. TEST previews use local demo data.
* After publication, the passage and audience are locked. Published readings are archived, not deleted, so history stays intact.

## 4. Applying the migration

1. Open the Supabase dashboard → SQL Editor. Paste and run `supabase/migrations/20261023010000_bible_study_daily_readings.sql`. **Then** paste and run `supabase/migrations/20261023020000_reading_photo_proof.sql` (it must come second). Alternatively, use `supabase db push` if you use the CLI. The migration is additive and safe to re-run.
2. Run the Security Advisor in Supabase afterwards.
3. Optional local check (needs PostgreSQL; never point it at production): `PGPORT=5432 bash supabase/tests/reading_rls_tests.sh` → `71 passed, 0 failed`.

## 5. How to use it

**Servant / head servant**

1. Open **الكتاب المقدس** in the navigation bar, or press the button on the servant dashboard.
2. Pick a book and chapter, tap the first verse and then the last verse, and press **تعيين هذا النص**.
3. Follow the 5 steps: confirm the text → choose recipients (one student, several students or a whole grade) → choose the date → optional question → **نشر القراءة**. You can also save it as a draft.
4. **القراءات المعيّنة** lists every reading with its progress, and lets you publish drafts and archive readings.
5. **متابعة الطلاب** shows students (rows) × dates (columns). Each cell shows the completion time (e.g. «٦:٤٢ م»), *لم تُقرأ بعد*, *فائتة* or *قادمة*. Tap a cell to see the timestamp, the student's answer and the photo they took.

**Student**

1. Open **قراءاتي** in the navigation bar, or use the card on the dashboard.
2. Read today's passage, answer the question (if there is one), then press **افتح الكاميرا والتقط صورة** and take a photo with the phone camera. **تمت القراءة** unlocks only when both are done, and the **Streak** (on the dashboard and in قراءاتي) updates immediately.
3. Missed readings stay available as catch-up. Upcoming readings are listed but locked until their date.
