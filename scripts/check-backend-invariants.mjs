import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const signup = read('src/screens/SignUpScreen.tsx');
const servant = read('src/screens/ServantDashboardScreen.tsx');
const dashboard = read('src/screens/TestDashboardScreen.tsx');
const migration = read('supabase/migrations/20261010154000_harden_test_role_privacy.sql');

assert.equal((app.match(/simulationMode=\{currentUser\.role === 'test' && Boolean\(previewRole\)\}/g) || []).length, 2);
assert.match(signup, /supabase\.rpc\('detect_signup_role'/);
assert.match(signup, /const isStudent = detectedRole === 'student'/);
assert.match(signup, /signupRole === 'student' \? \{ grade_level: gradeLevel \}/);
assert.ok((servant.match(/if \(simulationMode\) \{/g) || []).length >= 6);
assert.match(migration, /revoke all privileges on all tables in schema public from anon/i);
assert.match(migration, /create policy "Head can read teacher whitelist"/);
assert.doesNotMatch(migration, /apostlestech\.church@gmail\.com/i);
assert.doesNotMatch(migration, /select \* from public\.%I/i);
assert.match(migration, /'rows', '\[\]'::jsonb/);
assert.match(dashboard, /لا تعرض اللوحة عينات من سجلات الطلاب الحقيقية/);

// Bible study & daily readings: RLS on every table, no anon grants, server-owned timestamps.
const readings = read('supabase/migrations/20261023010000_bible_study_daily_readings.sql');
for (const table of ['reading_bible_books', 'bible_passages', 'reading_assignments', 'reading_assignment_recipients', 'reading_completions', 'reading_answers']) {
  assert.match(readings, new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.doesNotMatch(readings, /grant[^;]*\bto\s+anon\b/i);
assert.match(readings, /new\.completed_at := now\(\)/);
assert.match(readings, /new\.submitted_at := now\(\)/);
assert.doesNotMatch(readings, /grant insert \([^)]*completed_at/i);
assert.match(readings, /security invoker[\s\S]*get_reading_streaks|get_reading_streaks[\s\S]*security invoker/);
assert.match(app, /currentScreen === 'my-readings' && displayUser\?\.role === 'student'/);
assert.match(app, /displayUser\.role === 'teacher' \|\| displayUser\.role === 'head'/);

// Photo proof: private bucket, completion requires answer + photo.
const photoProof = read('supabase/migrations/20261023020000_reading_photo_proof.sql');
assert.match(photoProof, /'reading-photos',\s*'reading-photos',\s*false/);
assert.match(photoProof, /Answer required before completing this reading/);
assert.match(photoProof, /Photo proof required before completing this reading/);
assert.doesNotMatch(photoProof, /grant[^;]*\bto\s+anon\b/i);

// Reading plan: 'all' audience is head-only; reminder verse validated in the database.
const readingPlan = read('supabase/migrations/20261030010000_reading_plan_all_students.sql');
assert.match(readingPlan, /Only head servants can assign readings to all students/);
assert.match(readingPlan, /Reminder verse must be inside the assigned passage/);
assert.doesNotMatch(readingPlan, /grant[^;]*\bto\s+anon\b/i);

console.log('Backend security invariants passed.');
