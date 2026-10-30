-- Minimal local stand-in for Supabase (roles, auth.uid(), users, role helpers) used ONLY by reading_rls_tests.sh.
do $$ begin if not exists (select 1 from pg_roles where rolname=$q$anon$q$) then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
create type public.user_role as enum ('head','teacher','student');
alter type public.user_role add value 'test';
create type public.middle_school_grade as enum ('grade-1','grade-2','grade-3');
create table public.users (id uuid primary key, email text not null, name text not null, role public.user_role not null default 'student', grade_level public.middle_school_grade, points integer default 0, avatar_url text);
alter table public.users enable row level security;
create schema private; revoke all on schema private from public, anon; grant usage on schema private to authenticated;
create or replace function private.current_app_role() returns text language sql stable security definer set search_path = '' as $f$ select u.role::text from public.users u where u.id = (select auth.uid()) limit 1 $f$;
create or replace function private.current_grade_level() returns text language sql stable security definer set search_path = '' as $f$ select u.grade_level::text from public.users u where u.id = (select auth.uid()) limit 1 $f$;
create or replace function private.can_access_student(target_student_id uuid) returns boolean language sql stable security definer set search_path = '' as $f$
  select exists (select 1 from public.users as target_user where target_user.id = target_student_id and target_user.role = 'student'::public.user_role and (
    (select auth.uid()) = target_user.id or (select private.current_app_role()) = 'head'
    or ((select private.current_app_role()) = 'teacher' and target_user.grade_level::text = (select private.current_grade_level())))) $f$;
grant execute on all functions in schema private to authenticated;
create policy "Users can view own or permitted profiles" on public.users for select to authenticated using (
  id = (select auth.uid()) or (select private.current_app_role()) = 'head'
  or ((select private.current_app_role()) = 'teacher' and role = 'student'::public.user_role and grade_level::text = (select private.current_grade_level())));
grant select on public.users to authenticated;
insert into public.users values
 ('00000000-0000-0000-0000-00000000000a','head@x','Head','head',null),
 ('00000000-0000-0000-0000-0000000000a1','t1@x','Teacher G1','teacher','grade-1'),
 ('00000000-0000-0000-0000-0000000000a2','t2@x','Teacher G2','teacher','grade-2'),
 ('00000000-0000-0000-0000-000000000011','s11@x','Student G1 A','student','grade-1'),
 ('00000000-0000-0000-0000-000000000012','s12@x','Student G1 B','student','grade-1'),
 ('00000000-0000-0000-0000-000000000021','s21@x','Student G2 A','student','grade-2'),
 ('00000000-0000-0000-0000-0000000000ee','test@x','Test','test',null);
-- Minimal stand-in for Supabase Storage (buckets/objects) used by the photo-proof tests.
create schema if not exists storage;
grant usage on schema storage to authenticated, anon;
create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid default nullif(current_setting('request.jwt.claim.sub', true), '')::uuid, created_at timestamptz default now(), unique (bucket_id, name));
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
