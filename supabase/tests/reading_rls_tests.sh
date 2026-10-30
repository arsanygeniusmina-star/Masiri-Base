#!/bin/bash
# Runs the Bible-readings migration against a THROWAWAY local PostgreSQL database named "t"
# (never your Supabase project) and checks every RLS rule. Usage: PGPORT=5432 bash supabase/tests/reading_rls_tests.sh
HERE="$(cd "$(dirname "$0")" && pwd)"; MIG="$HERE/../migrations/20261023010000_bible_study_daily_readings.sql"; MIG2="$HERE/../migrations/20261023020000_reading_photo_proof.sql"; MIG3="$HERE/../migrations/20261030010000_reading_plan_all_students.sql"; MIG4="$HERE/../migrations/20261030020000_reading_week_restore.sql"
PGHOST="${PGHOST:-/tmp}"; PGPORT="${PGPORT:-5432}"; PGUSER="${PGUSER:-postgres}"; export PGHOST PGPORT PGUSER
P="psql -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists t" 2>/dev/null; $P -c "create database t" && $P -d t -f "$HERE/local_bootstrap.sql" >/dev/null && $P -d t -f "$MIG" >/dev/null 2>&1 && $P -d t -f "$MIG2" >/dev/null 2>&1 && $P -d t -f "$MIG3" >/dev/null 2>&1 && $P -d t -f "$MIG3" >/dev/null 2>&1 && $P -d t -f "$MIG4" >/dev/null 2>&1 && $P -d t -f "$MIG4" >/dev/null 2>&1 && echo "MIGRATIONS OK (latest migrations applied twice)"
H=00000000-0000-0000-0000-00000000000a; T1=00000000-0000-0000-0000-0000000000a1; T2=00000000-0000-0000-0000-0000000000a2; S11=00000000-0000-0000-0000-000000000011; S12=00000000-0000-0000-0000-000000000012; S21=00000000-0000-0000-0000-000000000021; TE=00000000-0000-0000-0000-0000000000ee
V='[{"number":16,"text":"a"},{"number":17,"text":"b"},{"number":18,"text":"c"}]'
TODAY=$(date -u +%F); YEST=$(date -u -d yesterday +%F); NEXTW=$(date -u -d '+7 day' +%F)
pass=0; fail=0
q(){ psql -d t -q -t -A -v ON_ERROR_STOP=1 -c "set role authenticated; set request.jwt.claim.sub = '$1';" -c "$2" 2>&1 | grep -v '^CONTEXT\|^ \|^PL/pgSQL\|^SQL statement\|^LINE\|^\s*\^' | head -1; }
chk(){ # name expected_regex actual
  if [[ "$3" =~ $2 ]]; then pass=$((pass+1)); printf "PASS  %-58s %s\n" "$1" "$3"; else fail=$((fail+1)); printf "FAIL  %-58s got: %s\n" "$1" "$3"; fi; }
mk(){ q $1 "select public.create_reading_assignment('john',3,16,18,'إنجيل يوحنا ٣:١٦–١٨','$V'::jsonb,'$2',$3,$4,'$5','Africa/Cairo',$6,null,true)"; }
UUID='^[0-9a-f-]{36}$'; DENY='ERROR'
A1=$(mk $T1 grade "'grade-1'" null $TODAY "'ماذا تعلمت؟'"); chk "teacher G1 assigns to own grade" "$UUID" "$A1"
chk "teacher G1 assigns to grade-2 is denied" "row-level security" "$(mk $T1 grade "'grade-2'" null $YEST null)"
chk "teacher G1 assigns a grade-2 student is denied" "row-level security" "$(mk $T1 students null "array['$S21']::uuid[]" $YEST null)"
A2=$(mk $T1 students null "array['$S11']::uuid[]" $TODAY null); chk "teacher G1 assigns individual student S11" "$UUID" "$A2"
A3=$(mk $H grade "'grade-2'" null $NEXTW null); chk "head assigns grade-2 for next week" "$UUID" "$A3"
A4=$(mk $H students null "array['$S12','$S21']::uuid[]" $TODAY null); chk "head assigns students across grades" "$UUID" "$A4"
chk "student cannot create assignments" "Only servants" "$(mk $S11 grade "'grade-1'" null $TODAY null)"
chk "TEST role cannot create assignments" "Only servants" "$(mk $TE grade "'grade-1'" null $TODAY null)"
chk "S11 sees grade-1 + own individual (2)" "^2$" "$(q $S11 'select count(*) from reading_assignments')"
chk "S12 sees grade-1 + head multi (2), not S11-only" "^2$" "$(q $S12 'select count(*) from reading_assignments')"
chk "S21 sees head grade-2 + head multi (2)" "^2$" "$(q $S21 'select count(*) from reading_assignments')"
chk "T1 sees own 2 + head multi (has S12 in scope) = 3" "^3$" "$(q $T1 'select count(*) from reading_assignments')"
chk "T2 sees head grade-2 + head multi (S21) = 2" "^2$" "$(q $T2 'select count(*) from reading_assignments')"
chk "head sees all 4" "^4$" "$(q $H 'select count(*) from reading_assignments')"
chk "TEST role sees 0 assignments" "^0$" "$(q $TE 'select count(*) from reading_assignments')"
chk "S12 cannot read S11-only passage" "^0$" "$(q $S12 "select count(*) from bible_passages p join reading_assignments a on a.passage_id=p.id where a.id='$A2'")"
chk "S11 can read own passage text" "^1$" "$(q $S11 "select count(*) from bible_passages p join reading_assignments a on a.passage_id=p.id where a.id='$A2'")"
chk "S12 sees only own recipient rows (1)" "^1$" "$(q $S12 'select count(*) from reading_assignment_recipients')"
chk "T1 sees recipients only in its grade (S11,S12 = 2)" "^2$" "$(q $T1 'select count(*) from reading_assignment_recipients')"
PH1="$S11/$A1/photo-1.jpg"; PH2="$S11/$A1/retake.jpg"
up(){ q $1 "insert into storage.objects(bucket_id,name) values ('reading-photos','$2') returning 1"; }
done_(){ q $1 "insert into reading_completions(assignment_id,student_id,local_date,photo_path) values ('$2','$3','$TODAY',$4) returning to_char(completed_at,'YYYY')"; }
chk "photo bucket exists and is private" "^f$" "$(q $H "select public from storage.buckets where id='reading-photos'")"
chk "completion without answer is rejected (question set)" "Answer required" "$(done_ $S11 $A1 $S11 "'$PH1'")"
chk "S11 answers question (trimmed)" "^إن الله محبة$" "$(q $S11 "insert into reading_answers(assignment_id,student_id,answer_text) values ('$A1','$S11','  إن الله محبة ') returning answer_text")"
chk "completion without photo is rejected" "Photo proof required" "$(done_ $S11 $A1 $S11 null)"
chk "completion with a not-uploaded photo is rejected" "Photo proof required" "$(done_ $S11 $A1 $S11 "'$PH1'")"
chk "S11 uploads photo into own folder" "^1$" "$(up $S11 "$PH1")"
chk "S11 cannot upload into S12's folder" "row-level security" "$(up $S11 "$S12/$A1/x.jpg")"
chk "S12 cannot upload for a reading not assigned to them" "row-level security" "$(up $S12 "$S12/$A2/x.jpg")"
chk "malformed photo path is rejected" "row-level security" "$(up $S11 "../$A1/x.jpg")"
chk "teacher cannot upload reading photos" "row-level security" "$(up $T1 "$T1/$A1/x.jpg")"
chk "S11 marks A1 as read with answer + photo" "^[0-9]{4}$" "$(done_ $S11 $A1 $S11 "'$PH1'")"
chk "duplicate completion is rejected" "duplicate key" "$(done_ $S11 $A1 $S11 "'$PH1'")"
chk "S12 cannot reuse S11's photo as proof" "required|row-level security" "$(q $S12 "insert into reading_answers(assignment_id,student_id,answer_text) values ('$A1','$S12','x')" >/dev/null; done_ $S12 $A1 $S12 "'$PH1'")"
chk "student cannot complete for someone else" "row-level security|required" "$(done_ $S11 $A1 $S12 "'$PH1'")"
chk "student cannot complete an unassigned reading" "row-level security|required" "$(done_ $S12 $A2 $S12 null)"
chk "future reading cannot be completed yet" "not open yet" "$(done_ $S21 $A3 $S21 null)"
chk "back-dated local_date (-10 days) rejected" "Invalid local completion date" "$(q $S12 "insert into reading_completions(assignment_id,student_id,local_date) values ('$A1','$S12',current_date-10)")"
chk "client cannot set completed_at" "permission denied" "$(q $S11 "insert into reading_completions(assignment_id,student_id,local_date,completed_at) values ('$A2','$S11','$TODAY','2020-01-01')")"
chk "photo visible to S11 (owner)" "^1$" "$(q $S11 "select count(*) from storage.objects where bucket_id='reading-photos'")"
chk "photo hidden from S12 (other student)" "^0$" "$(q $S12 "select count(*) from storage.objects where bucket_id='reading-photos'")"
chk "photo visible to T1 (same grade)" "^1$" "$(q $T1 "select count(*) from storage.objects where bucket_id='reading-photos'")"
chk "photo hidden from T2 (other grade)" "^0$" "$(q $T2 "select count(*) from storage.objects where bucket_id='reading-photos'")"
chk "photo visible to head" "^1$" "$(q $H "select count(*) from storage.objects where bucket_id='reading-photos'")"
chk "TEST role cannot see photos" "^0$" "$(q $TE "select count(*) from storage.objects where bucket_id='reading-photos'")"
chk "student cannot delete a photo used as proof (0 rows)" "^$" "$(q $S11 "delete from storage.objects where name='$PH1' returning 1")"
up $S11 "$PH2" >/dev/null
chk "student can delete an unused retake" "^1$" "$(q $S11 "delete from storage.objects where name='$PH2' returning 1")"
chk "answer on reading without question rejected" "no question" "$(q $S11 "insert into reading_answers(assignment_id,student_id,answer_text) values ('$A2','$S11','x')")"
chk "S11 edits own answer" "^جديد$" "$(q $S11 "update reading_answers set answer_text='جديد' where assignment_id='$A1' returning answer_text")"
chk "S12 cannot edit S11 answer (0 rows)" "^$" "$(q $S12 "update reading_answers set answer_text='hack' where assignment_id='$A1' and student_id='$S11' returning 1")"
chk "student cannot change submitted_at (column)" "permission denied" "$(q $S11 "update reading_answers set submitted_at=now() where assignment_id='$A1'")"
chk "T1 reads progress in scope (1 completion,2 answers)" "^1\|2$" "$(q $T1 'select (select count(*) from reading_completions),(select count(*) from reading_answers)')"
chk "T2 reads nothing from grade-1 (0,0)" "^0\|0$" "$(q $T2 'select (select count(*) from reading_completions),(select count(*) from reading_answers)')"
chk "TEST role reads no progress (0,0)" "^0\|0$" "$(q $TE 'select (select count(*) from reading_completions),(select count(*) from reading_answers)')"
chk "T2 cannot update T1 assignment (0 rows)" "^$" "$(q $T2 "update reading_assignments set title='x' where id='$A1' returning 1")"
chk "audience locked after publish" "cannot change passage or audience" "$(q $T1 "update reading_assignments set target_type='grade', target_grade='grade-1' where id='$A2'")"
chk "published cannot return to draft" "cannot return to draft" "$(q $T1 "update reading_assignments set status='draft' where id='$A2'")"
chk "T1 cannot add recipient to published reading" "row-level security" "$(q $T1 "insert into reading_assignment_recipients values ('$A2','$S12')")"
chk "T1 cannot delete a published reading (0 rows)" "^$" "$(q $T1 "delete from reading_assignments where id='$A2' returning 1")"
chk "T1 archives A1" "^archived\|t$" "$(q $T1 "update reading_assignments set status='archived' where id='$A1' returning status, archived_at is not null")"
chk "archived reading hidden from S11 (1 left)" "^1$" "$(q $S11 'select count(*) from reading_assignments')"
chk "anon cannot read anything" "permission denied" "$(psql -d t -q -t -A -c 'set role anon;' -c 'select count(*) from reading_bible_books' 2>&1 | head -1)"
chk "verse snapshot must match range" "does not match" "$(q $T1 "select public.create_reading_assignment('john',3,16,20,'x','$V'::jsonb,'grade','grade-1',null,'$TODAY')")"
chk "chapter must exist in book" "outside this book" "$(q $T1 "select public.create_reading_assignment('john',30,16,18,'x','$V'::jsonb,'grade','grade-1',null,'$TODAY')")"
chk "invalid time zone rejected" "not recognized" "$(q $T1 "select public.create_reading_assignment('john',3,16,18,'x','$V'::jsonb,'grade','grade-1',null,'$TODAY','Mars/Base')")"
D=$(q $T1 "select public.create_reading_assignment('john',3,16,18,'x','$V'::jsonb,'grade','grade-1',null,'$TODAY','Africa/Cairo',null,null,false)")
chk "draft is invisible to students" "^0$" "$(q $S11 "select count(*) from reading_assignments where id='$D'")"
chk "teacher deletes own draft" "^1$" "$(q $T1 "delete from reading_assignments where id='$D' returning 1")"
chk "failed calls roll back fully (5 = 4 published + 1 draft)" "^5$" "$(q $H 'select count(*) from bible_passages')"
# ---- reading plan: audience 'all' + reminder verse
ALL=$(q $H "select public.create_reading_assignment('john',3,16,18,'إنجيل يوحنا ٣','$V'::jsonb,'all',null,null,'$TODAY','Africa/Cairo','شوفت ربنا فين في الإصحاح؟',null,true,16)")
chk "head assigns a plan day to ALL students" "$UUID" "$ALL"
chk "teacher cannot assign to ALL students" "Only head servants" "$(q $T1 "select public.create_reading_assignment('john',3,16,18,'x','$V'::jsonb,'all',null,null,'$TODAY')")"
chk "reminder verse outside passage rejected" "inside the assigned passage" "$(q $H "select public.create_reading_assignment('john',3,16,18,'x','$V'::jsonb,'all',null,null,'$TODAY','Africa/Cairo',null,null,true,40)")"
chk "grade-1 student sees ALL reading" "^1$" "$(q $S12 "select count(*) from reading_assignments where id='$ALL'")"
chk "grade-2 student sees ALL reading" "^1$" "$(q $S21 "select count(*) from reading_assignments where id='$ALL'")"
chk "teachers of any grade see ALL reading" "^1\|1$" "$(q $T1 "select count(*) from reading_assignments where id='$ALL'")|$(q $T2 "select count(*) from reading_assignments where id='$ALL'")"
chk "TEST role does not see ALL reading" "^0$" "$(q $TE "select count(*) from reading_assignments where id='$ALL'")"
chk "reminder verse stored" "^16$" "$(q $S21 "select reminder_verse from reading_assignments where id='$ALL'")"
chk "student reads ALL passage text" "^3$" "$(q $S21 "select jsonb_array_length(p.verses) from bible_passages p join reading_assignments a on a.passage_id=p.id where a.id='$ALL'")"
PHA="$S21/$ALL/plan.jpg"; up $S21 "$PHA" >/dev/null; q $S21 "insert into reading_answers(assignment_id,student_id,answer_text) values ('$ALL','$S21','في محبته للعالم')" >/dev/null
chk "grade-2 student completes ALL reading (answer+photo)" "^[0-9]{4}$" "$(done_ $S21 $ALL $S21 "'$PHA'")"
chk "T1 cannot see grade-2 completion of ALL reading" "^0$" "$(q $T1 "select count(*) from reading_completions where assignment_id='$ALL'")"
chk "T2 sees grade-2 completion of ALL reading" "^1$" "$(q $T2 "select count(*) from reading_completions where assignment_id='$ALL'")"
# ---- streaks (fixtures inserted as admin with trigger disabled to simulate history)
$P -d t -c "alter table reading_completions disable trigger prepare_reading_completion;" -c "
insert into reading_assignments(id,created_by,passage_id,target_type,target_grade,scheduled_date,status)
select gen_random_uuid(),'$H',(select id from bible_passages limit 1),'grade','grade-1',d::date,'published' from generate_series(current_date-20, current_date-1, '1 day') d;
-- S12: days -20..-15 (6 day run), then -3,-2,-1 (3 day run ending yesterday) ; two completions on -2
insert into reading_completions(assignment_id,student_id,local_date)
select a.id,'$S12',a.scheduled_date from reading_assignments a where a.target_grade='grade-1' and a.status='published' and a.scheduled_date in (current_date-20,current_date-19,current_date-18,current_date-17,current_date-16,current_date-15,current_date-3,current_date-1);
insert into reading_completions(assignment_id,student_id,local_date)
select a.id,'$S12',current_date-2 from reading_assignments a where a.scheduled_date in (current_date-2,current_date-4) and a.target_grade='grade-1' and a.status='published';
" -c "alter table reading_completions enable trigger prepare_reading_completion;" >/dev/null
chk "S12 streak: current 3 (to yesterday), longest 6, 9 days" "^3\|6\|9\|f$" "$(q $S12 "select current_streak,longest_streak,total_reading_days,completed_today from get_reading_streaks(array['$S12']::uuid[], current_date)")"
chk "S12 streak resets once a whole week passes" "^0\|6$" "$(q $S12 "select current_streak,longest_streak from get_reading_streaks(array['$S12']::uuid[], current_date+8)")"
chk "S11 streak: 1 today, completed_today" "^1\|1\|t$" "$(q $S11 "select current_streak,longest_streak,completed_today from get_reading_streaks(array['$S11']::uuid[], '$TODAY'::date)")"
chk "T1 gets streaks of in-scope students" "^2$" "$(q $T1 "select count(*) from get_reading_streaks(array['$S11','$S12']::uuid[], current_date) where total_reading_days>0")"
chk "T2 gets zero for out-of-scope students (RLS)" "^0$" "$(q $T2 "select count(*) from get_reading_streaks(array['$S11','$S12']::uuid[], current_date) where total_reading_days>0")"
# ---- weekly restore window (week = Friday → Thursday)
chk "week helper: Sat 2026-10-31 → Fri 2026-10-30" "^2026-10-30$" "$(q $H "select private.reading_week_start('2026-10-31')")"
chk "week helper: Thu 2026-11-05 → Fri 2026-10-30" "^2026-10-30$" "$(q $H "select private.reading_week_start('2026-11-05')")"
chk "week helper: Fri 2026-10-30 → itself" "^2026-10-30$" "$(q $H "select private.reading_week_start('2026-10-30')")"
OLD=$(q $H "select public.create_reading_assignment('john',3,16,18,'x','$V'::jsonb,'grade','grade-1',null,current_date-8)")
chk "reading from last week cannot be restored" "Restore window closed" "$(q $S12 "insert into reading_completions(assignment_id,student_id,local_date,photo_path) values ('$OLD','$S12','$TODAY','$S12/$OLD/x.jpg')")"
WS=$(q $H "select private.reading_week_start('$TODAY'::date)")
if [[ "$WS" < "$TODAY" ]]; then RSCHED=$WS; RLOCAL=$TODAY; else RSCHED=$TODAY; RLOCAL=$(date -u -d tomorrow +%F); fi
RES=$(q $H "select public.create_reading_assignment('john',3,16,18,'x','$V'::jsonb,'grade','grade-1',null,'$RSCHED')")
RPH="$S12/$RES/restore.jpg"; up $S12 "$RPH" >/dev/null
chk "missed reading restored in the same week" "^$RSCHED$" "$(q $S12 "insert into reading_completions(assignment_id,student_id,local_date,photo_path) values ('$RES','$S12','$RLOCAL','$RPH') returning credited_date")"
# frozen streak (fixed calendar: Fri 2026-10-23 starts a week, Fri 2026-10-30 starts the next)
$P -d t -c "insert into public.users values ('00000000-0000-0000-0000-000000000013','s13@x','Student G1 C','student','grade-1');" -c "alter table reading_completions disable trigger prepare_reading_completion;" -c "
insert into reading_completions(assignment_id,student_id,local_date,credited_date)
select a.id,'00000000-0000-0000-0000-000000000013',d,d from (select id, row_number() over () rn from reading_assignments limit 2) a
join (values (1,'2026-10-24'::date),(2,'2026-10-25'::date)) v(rn,d) on v.rn=a.rn;" -c "alter table reading_completions enable trigger prepare_reading_completion;" >/dev/null
S13=00000000-0000-0000-0000-000000000013
chk "streak frozen while missed days are restorable (Wed 28)" "^2\|f$" "$(q $H "select current_streak,completed_today from get_reading_streaks(array['$S13']::uuid[], '2026-10-28')")"
chk "streak resets when the week closes (Fri 30)" "^0$" "$(q $H "select current_streak from get_reading_streaks(array['$S13']::uuid[], '2026-10-30')")"
echo; echo "RESULT: $pass passed, $fail failed"
