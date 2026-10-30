# Masiri Supabase setup

Masiri uses Supabase Auth for identity and PostgreSQL for shared profiles, approved servants, spiritual tasks, task completions, points, and prayer requests.

## Environment variables

Configure these values in local development and in the Vercel project's environment settings:

- `VITE_SUPABASE_URL`: the URL of the Maseeri Supabase project.
- `VITE_SUPABASE_ANON_KEY`: the project's anon/publishable client key.

Never put a Supabase `service_role` key or secret key in a browser environment variable. The client key is not an authorization mechanism; RLS and database grants enforce access.

## Initial head account

The current database has no Supabase Auth users yet. For that reason, the first account is not automatically made head based on a typed email. This is intentional: client-side email checks are not a secure authorization mechanism.

1. Register the intended head account through Masiri using the real head email address.
2. Confirm that address in Supabase Auth if email confirmation is enabled.
3. Verify the account in Authentication → Users and confirm a matching row exists in `public.users`.
4. In the SQL editor, promote only that verified profile to head. Replace the email below with the actual intended head address after checking it:

```sql
update public.users
set role = 'head'
where id = (
  select id
  from public.users
  where lower(email) = lower('minasamehdeif@gmail.com')
);
```

5. Sign out and sign in again so the app reloads the profile and role.

Do not run the promotion before verifying the intended address and matching Auth account. After this one-time setup, the head can approve servants via the app. Active emails in `public.teachers_whitelist` are assigned the teacher role by the database when they register. Others become students by default.

## Google sign-in

Google login uses Supabase OAuth. Enable Google in Authentication → Sign In / Providers, set the client ID/secret in Supabase, and add the deployed app URL plus its auth callback/redirect URL to the allowed redirect URLs. The app does not include fake Google accounts.

## Database security and migrations

The SQL migrations in `supabase/migrations` reflect the migrations applied to the Maseeri project on 10 October 2026. They enable RLS on the exposed application tables, separate profile fields users can edit from privileged fields, scope teacher access to assigned grades, and update points on task completion.

The `public.award_student_points` function intentionally uses `SECURITY DEFINER` to update points without granting users direct permission to change their own points. It validates that the caller is a head or a teacher assigned to the target student's grade and limits grants to 1–100 points. Review this function if its authorization logic changes.

Run database security/performance advisors after future schema changes. Keep the SQL history committed along with every database migration.

## Bible study & daily readings

Apply `supabase/migrations/20261023010000_bible_study_daily_readings.sql`, then `supabase/migrations/20261023020000_reading_photo_proof.sql` (SQL Editor or `supabase db push`). The second one creates the private `reading-photos` Storage bucket and requires an answer plus a camera photo before a reading counts. It adds the `reading_bible_books`, `bible_passages`, `reading_assignments`, `reading_assignment_recipients`, `reading_completions` and `reading_answers` tables, with RLS. It also adds the `create_reading_assignment` and `get_reading_streaks` functions. The migration is additive and idempotent. See `docs/bible-study-daily-readings.md` for the full design, security rules and usage.
