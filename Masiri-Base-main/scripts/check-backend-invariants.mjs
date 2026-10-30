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

console.log('Backend security invariants passed.');
