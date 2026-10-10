import React, { useEffect, useState } from 'react';
import { User, StudentRecord, PrayerRequest, MiddleSchoolGrade } from '../types';
import { supabase } from '../lib/supabase';
import type { AppScreen } from '../components/NavigationTaskbar';
import {
  Users,
  CheckCircle,
  XCircle,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  Flame,
  Award,
  Heart,
  MessageCircle,
  Check,
  UserPlus,
  Plus,
  X,
  HelpCircle,
} from 'lucide-react';
import { SupabaseGuideModal } from '../components/SupabaseGuideModal';

interface ServantDashboardScreenProps {
  currentUser: User;
  onNavigate: (screen: AppScreen) => void;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
}

type TeacherApproval = {
  id: string;
  email: string;
  name: string;
  assigned_grade: MiddleSchoolGrade | null;
  status: string | null;
};

type ManagedRoleAccount = {
  email: string;
  name: string;
  role: 'teacher' | 'head' | 'test';
  assigned_grade: MiddleSchoolGrade | null;
  status: string;
  created_at?: string;
};

const roleAccountLabels: Record<ManagedRoleAccount['role'], string> = {
  teacher: 'خادم / معلم',
  head: 'أمين خدمة عام',
  test: 'حساب اختبار',
};

const gradeLabel = (grade: MiddleSchoolGrade | null) => {
  if (grade === 'grade-1') return 'الصف السابع (أولى إعدادي)';
  if (grade === 'grade-2') return 'الصف الثامن (تانية إعدادي)';
  if (grade === 'grade-3') return 'الصف التاسع (تالتة إعدادي)';
  return 'لم يتم تحديد الصف';
};

export const ServantDashboardScreen: React.FC<ServantDashboardScreenProps> = ({
  currentUser,
  onNavigate,
  theme,
  simulationMode = false,
}) => {
  const isHead = currentUser.role === 'head';
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<'all' | MiddleSchoolGrade>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [approvedTeachersCount, setApprovedTeachersCount] = useState(0);
  const [teacherApprovals, setTeacherApprovals] = useState<TeacherApproval[]>([]);
  const [roleAccounts, setRoleAccounts] = useState<ManagedRoleAccount[]>([]);
  const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);
  const [awardingStudentId, setAwardingStudentId] = useState<string | null>(null);
  const [bonusPoints, setBonusPoints] = useState(25);
  const [bonusReason, setBonusReason] = useState('حفظ آية الأسبوع والتسميع المتقن');
  const [feedbackToast, setFeedbackToast] = useState('');
  const [attendanceToday, setAttendanceToday] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [attendanceAverage, setAttendanceAverage] = useState<number | null>(null);
  const [latestPointReasons, setLatestPointReasons] = useState<Record<string, string>>({});

  // Quick Add Teacher Plus Button Modal for Head
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherGrade, setNewTeacherGrade] = useState<MiddleSchoolGrade>('grade-2');
  const [newAccountRole, setNewAccountRole] = useState<ManagedRoleAccount['role']>('teacher');
  const [isAddingRoleAccount, setIsAddingRoleAccount] = useState(false);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadServantData = async () => {
      setIsLoadingData(true);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (simulationMode) {
        const demoStudents: StudentRecord[] = [
          { id: 'preview-student-1', name: 'مارك عماد رفعت', email: 'mark.student@example.test', gradeLevel: 'grade-1', churchFamily: 'عائلة مارك', spiritualFather: 'أبونا أنطونيوس', phone: '01000000001', attendanceRate: 92, points: 120, streakDays: 4, lastActive: now.toISOString(), teacherNotes: '' },
          { id: 'preview-student-2', name: 'مينا فادي جرجس', email: 'mina.student@example.test', gradeLevel: 'grade-1', churchFamily: 'عائلة مينا', spiritualFather: 'أبونا بطرس', phone: '01000000002', attendanceRate: 84, points: 95, streakDays: 3, lastActive: now.toISOString(), teacherNotes: '' },
          { id: 'preview-student-3', name: 'كيرلس سامح عادل', email: 'kyrillos.student@example.test', gradeLevel: 'grade-2', churchFamily: 'عائلة كيرلس', spiritualFather: 'أبونا أنطونيوس', phone: '01000000003', attendanceRate: 96, points: 210, streakDays: 6, lastActive: now.toISOString(), teacherNotes: '' },
          { id: 'preview-student-4', name: 'بيشوي أمير فوزي', email: 'bishoy.student@example.test', gradeLevel: 'grade-2', churchFamily: 'عائلة بيشوي', spiritualFather: 'أبونا يوحنا', phone: '01000000004', attendanceRate: 78, points: 75, streakDays: 1, lastActive: now.toISOString(), teacherNotes: '' },
          { id: 'preview-student-5', name: 'جورج بيتر عادل', email: 'george.student@example.test', gradeLevel: 'grade-3', churchFamily: 'عائلة جورج', spiritualFather: 'أبونا بطرس', phone: '01000000005', attendanceRate: 88, points: 180, streakDays: 5, lastActive: now.toISOString(), teacherNotes: '' },
          { id: 'preview-student-6', name: 'فادي مينا سمير', email: 'fady.student@example.test', gradeLevel: 'grade-3', churchFamily: 'عائلة فادي', spiritualFather: 'أبونا أنطونيوس', phone: '01000000006', attendanceRate: 71, points: 60, streakDays: 0, lastActive: now.toISOString(), teacherNotes: '' },
        ];
        setStudents(isHead
          ? demoStudents
          : demoStudents.filter((student) => student.gradeLevel === (currentUser.gradeLevel ?? 'grade-1')));
        setAttendanceToday({
          'preview-student-1': 'present',
          'preview-student-2': 'absent',
          'preview-student-3': 'present',
          'preview-student-4': 'excused',
          'preview-student-5': 'present',
          'preview-student-6': 'absent',
        });
        setAttendanceAverage(82);
        setLatestPointReasons({
          'preview-student-1': 'حفظ آية الأسبوع',
          'preview-student-3': 'الالتزام والحضور',
          'preview-student-5': 'مساعدة زميل',
        });
        setPrayerRequests([
          { id: 'preview-prayer-1', studentId: 'preview-student-1', studentName: 'مارك عماد رفعت', content: 'أرجو الصلاة من أجل عائلتي.', isPrivate: false, status: 'pending', createdAt: now.toISOString() },
          { id: 'preview-prayer-2', studentId: 'preview-student-3', studentName: 'كيرلس سامح عادل', content: 'أحتاج صلاة من أجل السلام والهدوء في الدراسة.', isPrivate: true, status: 'pending', createdAt: now.toISOString() },
        ]);
        if (isHead) {
          const demoTeachers: TeacherApproval[] = [
            { id: 'preview-teacher-1', email: 'anton.teacher@example.test', name: 'الخادم أنطونيوس', assigned_grade: 'grade-1', status: 'active' },
            { id: 'preview-teacher-2', email: 'peter.teacher@example.test', name: 'الخادم بطرس', assigned_grade: 'grade-2', status: 'active' },
            { id: 'preview-teacher-3', email: 'john.teacher@example.test', name: 'الخادم يوحنا', assigned_grade: 'grade-3', status: 'inactive' },
          ];
          setTeacherApprovals(demoTeachers);
          setApprovedTeachersCount(demoTeachers.filter((row) => row.status === 'active' && row.assigned_grade).length);
          setRoleAccounts([
            { email: 'head.preview@example.test', name: 'أمين خدمة تجريبي', role: 'head', assigned_grade: null, status: 'active', created_at: now.toISOString() },
            { email: 'test.preview@example.test', name: 'حساب اختبار تجريبي', role: 'test', assigned_grade: null, status: 'active', created_at: now.toISOString() },
            ...demoTeachers.map((row) => ({ ...row, role: 'teacher' as const, created_at: now.toISOString() })),
          ]);
        } else {
          setTeacherApprovals([]);
          setApprovedTeachersCount(0);
          setRoleAccounts([]);
        }
        setFeedbackToast('');
        setIsLoadingData(false);
        return;
      }

      const [studentsResult, prayersResult, attendanceResult, pointsHistoryResult] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'student').order('name'),
        supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('attendance_records').select('student_id, attendance_date, status'),
        supabase.from('student_points_history').select('student_id, reason, created_at').order('created_at', { ascending: false }).limit(500),
      ]);
      if (cancelled) return;

      if (currentUser.role === 'head') {
        const { data: approvalRows, error: approvalsError } = await supabase
          .from('teachers_whitelist')
          .select('id, email, name, assigned_grade, status')
          .order('created_at', { ascending: false });

        if (!cancelled && !approvalsError) {
          const rows = (approvalRows || []) as TeacherApproval[];
          setTeacherApprovals(rows);
          setApprovedTeachersCount(rows.filter((row) => row.status === 'active' && row.assigned_grade).length);
          const { data: managedRows, error: managedError } = await supabase.rpc('list_app_role_emails');
          if (!cancelled && !managedError && Array.isArray(managedRows)) {
            setRoleAccounts(managedRows as ManagedRoleAccount[]);
          } else if (!cancelled && managedError) {
            console.error('Unable to load managed role accounts:', managedError);
            setFeedbackToast('تعذر تحميل قائمة الحسابات والصلاحيات.');
          }
        } else if (!cancelled && approvalsError) {
          console.error('Unable to load teacher approvals:', approvalsError);
          setFeedbackToast('تعذر تحميل قائمة الخدام المعتمدين.');
        }
      }

      if (studentsResult.error || prayersResult.error || attendanceResult.error || pointsHistoryResult.error) {
        console.error('Unable to load servant dashboard data:', studentsResult.error || prayersResult.error || attendanceResult.error || pointsHistoryResult.error);
        setFeedbackToast('تعذر تحميل بيانات الخدمة من قاعدة البيانات. تحقق من الصلاحيات أو الاتصال.');
      } else {
        const attendanceRows = attendanceResult.data || [];
        const todayRows = attendanceRows.filter((row: any) => row.attendance_date === today);
        const todayMap: Record<string, 'present' | 'absent' | 'excused'> = {};
        todayRows.forEach((row: any) => { todayMap[row.student_id] = row.status; });
        setAttendanceToday(todayMap);
        const countedRows = attendanceRows.filter((row: any) => row.status === 'present' || row.status === 'absent');
        setAttendanceAverage(countedRows.length ? Math.round(countedRows.filter((row: any) => row.status === 'present').length / countedRows.length * 100) : null);
        const reasons: Record<string, string> = {};
        (pointsHistoryResult.data || []).forEach((row: any) => { if (!reasons[row.student_id]) reasons[row.student_id] = row.reason; });
        setLatestPointReasons(reasons);
        setStudents((studentsResult.data || []).map((row: any) => {
          const records = attendanceRows.filter((record: any) => record.student_id === row.id && (record.status === 'present' || record.status === 'absent'));
          const rate = records.length ? Math.round(records.filter((record: any) => record.status === 'present').length / records.length * 100) : 0;
          return {
            id: row.id,
            name: row.name,
            email: row.email,
            gradeLevel: row.grade_level || 'grade-2',
            churchFamily: row.church_family || '',
            spiritualFather: row.spiritual_father || '',
            phone: row.phone || '',
            attendanceRate: rate,
            points: Number(row.points || 0),
            streakDays: Number(row.streak_days || 0),
            lastActive: row.created_at || '',
            teacherNotes: '',
          };
        }));
        setPrayerRequests((prayersResult.data || []).map((row: any) => ({
          id: row.id,
          studentId: row.student_id,
          studentName: row.student_name,
          content: row.content,
          isPrivate: Boolean(row.is_private),
          status: row.status === 'prayed' ? 'prayed' : 'pending',
          createdAt: row.created_at,
        })));
      }
      setIsLoadingData(false);
    };

    void loadServantData();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.role, currentUser.gradeLevel, simulationMode]);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
    const matchesSearch = s.name.includes(searchQuery) || s.churchFamily.includes(searchQuery);
    return matchesGrade && matchesSearch;
  });

  const handleAttendanceChange = async (studentId: string, status: 'present' | 'absent' | 'excused') => {
    if (simulationMode) {
      setAttendanceToday((previous) => ({ ...previous, [studentId]: status }));
      setStudents((previous) => previous.map((student) => student.id === studentId
        ? { ...student, attendanceRate: status === 'present' ? Math.min(100, student.attendanceRate + 2) : status === 'absent' ? Math.max(0, student.attendanceRate - 2) : student.attendanceRate }
        : student));
      setFeedbackToast('تم تسجيل الحضور تجريبياً. لم تتغير سجلات قاعدة البيانات.');
      window.setTimeout(() => setFeedbackToast(''), 2600);
      return;
    }
    const now = new Date();
    const attendanceDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { error } = await supabase.from('attendance_records').upsert({
      student_id: studentId,
      attendance_date: attendanceDate,
      status,
      marked_by: currentUser.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,attendance_date' });
    if (error) {
      console.error('Unable to save attendance:', error);
      setFeedbackToast('تعذر حفظ الحضور. تحقق من صلاحيات الفصل ثم حاول مرة أخرى.');
      window.setTimeout(() => setFeedbackToast(''), 3500);
      return;
    }
    setAttendanceToday((previous) => ({ ...previous, [studentId]: status }));
    setFeedbackToast('تم حفظ الحضور في قاعدة البيانات.');
    window.setTimeout(() => setFeedbackToast(''), 2200);
    const { data } = await supabase.from('attendance_records').select('student_id,status');
    if (data) {
      const counted = data.filter((row: any) => row.status === 'present' || row.status === 'absent');
      setAttendanceAverage(counted.length ? Math.round(counted.filter((row: any) => row.status === 'present').length / counted.length * 100) : null);
      setStudents((previous) => previous.map((student) => {
        const records = data.filter((row: any) => row.student_id === student.id && (row.status === 'present' || row.status === 'absent'));
        return { ...student, attendanceRate: records.length ? Math.round(records.filter((row: any) => row.status === 'present').length / records.length * 100) : 0 };
      }));
    }
  };

  // Point changes are performed by a database function that verifies the servant's role and grade.
  const handleAwardPoints = async (studentId: string) => {
    const safePoints = Math.max(1, Math.min(100, Math.round(bonusPoints)));
    if (simulationMode) {
      setStudents((previous) => previous.map((student) => student.id === studentId ? { ...student, points: student.points + safePoints } : student));
      setAwardingStudentId(null);
      setLatestPointReasons((previous) => ({ ...previous, [studentId]: bonusReason.trim() || 'مكافأة تجريبية' }));
      setFeedbackToast(`تمت إضافة +${safePoints} نقطة في وضع المحاكاة فقط.`);
      window.setTimeout(() => setFeedbackToast(''), 3000);
      return;
    }
    const { error } = await supabase.from('student_points_award_requests').insert({
      student_id: studentId,
      points: safePoints,
      reason: bonusReason.trim(),
    });
    if (error) {
      console.error('Unable to award student points:', error);
      setFeedbackToast('تعذر منح النقاط. تأكد من أنك خادم معتمد وأن الطالب ضمن فصلك.');
      window.setTimeout(() => setFeedbackToast(''), 3500);
      return;
    }

    const { data: updatedStudent, error: refreshError } = await supabase.from('users').select('id,points').eq('id', studentId).maybeSingle();
    if (!refreshError && updatedStudent) {
      setStudents((previous) => previous.map((student) =>
        student.id === studentId ? { ...student, points: Number(updatedStudent.points || 0) } : student
      ));
    }
    setAwardingStudentId(null);
    setLatestPointReasons((previous) => ({ ...previous, [studentId]: bonusReason.trim() }));
    setFeedbackToast(`تم منح +${safePoints} نقطة للطالب بنجاح.`);
    window.setTimeout(() => setFeedbackToast(''), 3000);
  };

  // Role assignment is validated server-side by an RPC that only a real Head can execute.
  const handleQuickAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHead) return;

    const email = newTeacherEmail.trim().toLowerCase();
    const name = newTeacherName.trim() || (
      newAccountRole === 'teacher' ? 'خادم جديد' :
      newAccountRole === 'head' ? 'أمين خدمة جديد' : 'حساب اختبار'
    );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedbackToast('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    if (simulationMode) {
      if (roleAccounts.some((account) => account.email.toLowerCase() === email) ||
          teacherApprovals.some((account) => account.email.toLowerCase() === email)) {
        setFeedbackToast('هذا البريد مسجل بالفعل في بيانات المحاكاة.');
        window.setTimeout(() => setFeedbackToast(''), 3000);
        return;
      }
      const created: ManagedRoleAccount = {
        email,
        name,
        role: newAccountRole,
        assigned_grade: newAccountRole === 'teacher' ? newTeacherGrade : null,
        status: 'active',
        created_at: new Date().toISOString(),
      };
      setRoleAccounts((previous) => [created, ...previous]);
      if (newAccountRole === 'teacher') {
        const createdTeacher: TeacherApproval = {
          id: 'preview-teacher-' + Date.now(),
          email,
          name,
          assigned_grade: newTeacherGrade,
          status: 'active',
        };
        setTeacherApprovals((previous) => [createdTeacher, ...previous]);
        setApprovedTeachersCount((count) => count + 1);
      }
      setFeedbackToast('تمت إضافة الصلاحية في المحاكاة فقط؛ لم تتغير أي حسابات حقيقية.');
      setNewTeacherEmail('');
      setNewTeacherName('');
      setNewTeacherGrade('grade-2');
      setNewAccountRole('teacher');
      setIsQuickAddModalOpen(false);
      window.setTimeout(() => setFeedbackToast(''), 3500);
      return;
    }

    setIsAddingRoleAccount(true);
    const { error } = await supabase.rpc('manage_app_role_email', {
      p_email: email,
      p_role: newAccountRole,
      p_name: name,
      p_grade: newAccountRole === 'teacher' ? newTeacherGrade : null,
    });

    if (error) {
      console.error('Unable to manage role account:', error);
      const message = error.code === '23505'
        ? 'هذا البريد مسجل بالفعل تحت صلاحية أخرى.'
        : error.message?.includes('already assigned')
          ? 'هذا البريد مرتبط بالفعل بصلاحية أخرى. راجع قائمة الحسابات.'
          : 'تعذرت إضافة الصلاحية. تأكد من صحة البريد وأن حسابك أمين خدمة عام.';
      setFeedbackToast(message);
      setIsAddingRoleAccount(false);
      window.setTimeout(() => setFeedbackToast(''), 5000);
      return;
    }

    const { data: accountRows, error: accountsError } = await supabase.rpc('list_app_role_emails');
    if (!accountsError && Array.isArray(accountRows)) setRoleAccounts(accountRows as ManagedRoleAccount[]);

    if (newAccountRole === 'teacher') {
      const { data: teacherRows, error: teacherRowsError } = await supabase
        .from('teachers_whitelist')
        .select('id, email, name, assigned_grade, status')
        .order('created_at', { ascending: false });
      if (!teacherRowsError && teacherRows) {
        const rows = teacherRows as TeacherApproval[];
        setTeacherApprovals(rows);
        setApprovedTeachersCount(rows.filter((row) => row.status === 'active' && row.assigned_grade).length);
      }
    }

    setFeedbackToast(
      newAccountRole === 'teacher'
        ? 'تم اعتماد ' + email + ' كخادم للصف المحدد.'
        : newAccountRole === 'head'
          ? 'تم اعتماد ' + email + ' كأمين خدمة عام.'
          : 'تم اعتماد ' + email + ' كحساب TEST.'
    );
    setNewTeacherEmail('');
    setNewTeacherName('');
    setNewTeacherGrade('grade-2');
    setNewAccountRole('teacher');
    setIsQuickAddModalOpen(false);
    setIsAddingRoleAccount(false);
    window.setTimeout(() => setFeedbackToast(''), 4500);
  };

  const handleUpdateTeacherGrade = async (teacherId: string, grade: MiddleSchoolGrade) => {
    if (!isHead) return;
    if (simulationMode) {
      const nextApprovals = teacherApprovals.map((teacher) => teacher.id === teacherId ? { ...teacher, assigned_grade: grade } : teacher);
      setTeacherApprovals(nextApprovals);
      setApprovedTeachersCount(nextApprovals.filter((row) => row.status === 'active' && row.assigned_grade).length);
      setFeedbackToast('تم تحديث الصف في بيانات المحاكاة فقط.');
      window.setTimeout(() => setFeedbackToast(''), 3000);
      return;
    }
    setSavingTeacherId(teacherId);

    const { data, error } = await supabase
      .from('teachers_whitelist')
      .update({ assigned_grade: grade })
      .eq('id', teacherId)
      .select('id, email, name, assigned_grade, status')
      .single();

    if (error || !data) {
      console.error('Unable to update teacher grade:', error);
      setFeedbackToast('تعذر حفظ الصف المسند إلى الخادم.');
    } else {
      const nextApprovals = teacherApprovals.map((teacher) =>
        teacher.id === teacherId ? data as TeacherApproval : teacher
      );
      setTeacherApprovals(nextApprovals);
      setApprovedTeachersCount(nextApprovals.filter((row) => row.status === 'active' && row.assigned_grade).length);
      setFeedbackToast('تم حفظ الصف، وحدّثت قاعدة البيانات صلاحيات الخادم المرتبطة به.');
    }

    setSavingTeacherId(null);
    window.setTimeout(() => setFeedbackToast(''), 3500);
  };

  const handleToggleTeacherApproval = async (teacher: TeacherApproval) => {
    if (!isHead) return;
    const nextStatus = teacher.status === 'active' ? 'inactive' : 'active';
    if (nextStatus === 'active' && !teacher.assigned_grade) {
      setFeedbackToast('اختر الصف المسند إلى الخادم أولاً، ثم أعد اعتماده.');
      window.setTimeout(() => setFeedbackToast(''), 3500);
      return;
    }

    if (simulationMode) {
      const nextApprovals = teacherApprovals.map((row) => row.id === teacher.id ? { ...row, status: nextStatus } : row);
      setTeacherApprovals(nextApprovals);
      setApprovedTeachersCount(nextApprovals.filter((row) => row.status === 'active' && row.assigned_grade).length);
      setFeedbackToast(nextStatus === 'active'
        ? 'تمت إعادة اعتماد الخادم في بيانات المحاكاة فقط.'
        : 'تم إيقاف اعتماد الخادم في بيانات المحاكاة فقط.');
      window.setTimeout(() => setFeedbackToast(''), 3200);
      return;
    }

    setSavingTeacherId(teacher.id);
    const { data, error } = await supabase
      .from('teachers_whitelist')
      .update({ status: nextStatus })
      .eq('id', teacher.id)
      .select('id, email, name, assigned_grade, status')
      .single();

    if (error || !data) {
      console.error('Unable to change teacher approval:', error);
      setFeedbackToast('تعذر تغيير حالة اعتماد الخادم. لم يتم تغيير الحالة في الواجهة.');
    } else {
      const nextApprovals = teacherApprovals.map((row) =>
        row.id === teacher.id ? data as TeacherApproval : row
      );
      setTeacherApprovals(nextApprovals);
      setApprovedTeachersCount(nextApprovals.filter((row) => row.status === 'active' && row.assigned_grade).length);
      setFeedbackToast(
        nextStatus === 'active'
          ? 'تمت إعادة اعتماد الخادم وتحديث دوره من قاعدة البيانات.'
          : 'تم إيقاف اعتماد الخادم وسحب صلاحيات المعلم من قاعدة البيانات.'
      );
    }

    setSavingTeacherId(null);
    window.setTimeout(() => setFeedbackToast(''), 4000);
  };

  // Moderation is written to Supabase; RLS limits status updates to head/teacher roles.
  const handleMarkPrayed = async (id: string) => {
    if (simulationMode) {
      setPrayerRequests((previous) => previous.map((request) => request.id === id ? { ...request, status: 'prayed' } : request));
      setFeedbackToast('تم تحديث طلب الصلاة في بيانات المحاكاة فقط.');
      window.setTimeout(() => setFeedbackToast(''), 2800);
      return;
    }
    const { error } = await supabase.from('prayer_requests').update({ status: 'prayed' }).eq('id', id);
    if (error) {
      console.error('Unable to update prayer request status:', error);
      setFeedbackToast('تعذر تحديث حالة طلب الصلاة. تحقق من صلاحياتك.');
      window.setTimeout(() => setFeedbackToast(''), 3000);
      return;
    }
    setPrayerRequests((previous) => previous.map((request) => request.id === id ? { ...request, status: 'prayed' } : request));
    setFeedbackToast('تم حفظ حالة طلب الصلاة في قاعدة البيانات.');
    window.setTimeout(() => setFeedbackToast(''), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative">
      {isLoadingData && (
        <div role="status" className="relative z-10 rounded-2xl border p-3 text-sm"
          style={{ borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0', color: theme === 'dark' ? '#D6B878' : '#76243A' }}>
          جاري تحميل بيانات الخدمة من قاعدة البيانات...
        </div>
      )}

      {/* Background Ambient Glow */}
      <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-[#76243A]/15 dark:bg-[#B65370]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[#C5A15A]/15 dark:bg-[#D6B878]/10 blur-3xl pointer-events-none" />

      {/* Top Servant Banner - Liquid Glassmorphism */}
      <div
        className="rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-2xl shadow-xl transition-all"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.75) 0%, rgba(22, 20, 25, 0.85) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 247, 244, 0.85) 100%)',
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <div className="space-y-2 text-right">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full shadow-xs"
              style={{
                backgroundColor: isHead
                  ? theme === 'dark' ? 'rgba(56, 35, 44, 0.8)' : '#F3E7EB'
                  : theme === 'dark' ? 'rgba(52, 45, 32, 0.8)' : '#F6F0E3',
                color: isHead
                  ? theme === 'dark' ? '#B65370' : '#76243A'
                  : theme === 'dark' ? '#D6B878' : '#A96F19',
              }}
            >
              {isHead ? 'أمانة الخدمة العامة (Head)' : 'لوحة متابعة فصل إعدادي (Teacher)'}
            </span>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">·</span>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">متابعة الرعاية والافتقاد</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            أهلاً يا {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#77717A] dark:text-[#B8B1BB] max-w-xl">
            {isHead
              ? 'بصفتك أمين الخدمة العام، يمكنك الإشراف على جميع الفصول والضغط على زر (+) لإضافة معلمين جدد.'
              : 'يمكنك متابعة حضور فصلك، مراجعة حفظ الآيات، منح النقاط الروحية، والرد على طلبات الصلاة.'}
          </p>
        </div>

        {/* Quick Head Action / Teacher Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* USER SPECIFICATION: Head has a plus button to add teachers */}
          {isHead && (
            <button
              onClick={() => setIsQuickAddModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all church-btn-primary"
              style={{
                background:
                  theme === 'dark'
                    ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                    : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center font-black"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.25)' : 'rgba(255, 255, 255, 0.2)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                }}
              >
                +
              </div>
              <span>إضافة حساب أو صلاحية (+)</span>
            </button>
          )}

          <button
            onClick={() => setIsSupabaseGuideOpen(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 backdrop-blur-md hover:scale-105 active:scale-95 transition-all"
            style={{
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              color: theme === 'dark' ? '#D6B878' : '#A96F19',
              backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.6)' : 'rgba(242, 240, 237, 0.8)',
            }}
          >
            <HelpCircle className="w-4 h-4" />
            <span>ربط Supabase</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          className="p-3.5 rounded-2xl border text-xs flex items-center gap-2 text-right shadow-lg animate-in fade-in"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(32, 53, 42, 0.8)' : '#E9F4EC',
            borderColor: theme === 'dark' ? '#3A3540' : '#DFC0CA',
            color: theme === 'dark' ? '#75C695' : '#347653',
          }}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Stats Cards - Liquid Glassmorphism */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="p-5 rounded-3xl border text-right space-y-1 liquid-glass-card backdrop-blur-3xl transition-transform hover:scale-105"
        >
          <span className="text-xs text-[#77717A] dark:text-[#B8B1BB] font-semibold">إجمالي الطلاب</span>
          <p className="text-2xl font-black font-mono" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            {students.length}
          </p>
        </div>

        <div
          className="p-5 rounded-3xl border text-right space-y-1 liquid-glass-card backdrop-blur-3xl transition-transform hover:scale-105"
        >
          <span className="text-xs text-[#77717A] dark:text-[#B8B1BB] font-semibold">متوسط الحضور</span>
          <p className="text-2xl font-black font-mono text-green-600 dark:text-green-400">
            {attendanceAverage === null ? '—' : `${attendanceAverage}%`}
          </p>
        </div>

        <div
          className="p-5 rounded-3xl border text-right space-y-1 liquid-glass-card backdrop-blur-3xl transition-transform hover:scale-105"
        >
          <span className="text-xs text-[#77717A] dark:text-[#B8B1BB] font-semibold">طلبات صلاة للمتابعة</span>
          <p className="text-2xl font-black font-mono" style={{ color: theme === 'dark' ? '#D6B878' : '#C5A15A' }}>
            {prayerRequests.filter(p => p.status === 'pending').length}
          </p>
        </div>

        <div
          className="p-5 rounded-3xl border text-right space-y-1 liquid-glass-card backdrop-blur-3xl transition-transform hover:scale-105"
        >
          <span className="text-xs text-[#77717A] dark:text-[#B8B1BB] font-semibold">الخدام المعتمدين</span>
          <p className="text-2xl font-black font-mono" style={{ color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}>
            {approvedTeachersCount}
          </p>
        </div>
      </div>

      {isHead && (
        <section className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right liquid-glass-card backdrop-blur-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4"
            style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                إدارة اعتماد الخدام
              </h2>
              <p className="mt-1 text-xs text-[#77717A] dark:text-[#B8B1BB]">
                تغيير الصف أو إيقاف الاعتماد يحدّث صلاحيات الحساب مباشرةً في قاعدة البيانات.
              </p>
            </div>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
              {teacherApprovals.filter((row) => row.status === 'active' && row.assigned_grade).length} خادم نشط
            </span>
          </div>

          {teacherApprovals.length === 0 ? (
            <p className="rounded-2xl border p-4 text-xs text-[#77717A] dark:text-[#B8B1BB]"
              style={{ borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0' }}>
              لا توجد اعتمادات مسجلة حتى الآن.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              {teacherApprovals.map((teacher) => {
                const isActive = teacher.status === 'active' && Boolean(teacher.assigned_grade);
                const isSaving = savingTeacherId === teacher.id;
                return (
                  <div key={teacher.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>{teacher.name}</p>
                      <p className="mt-1 text-[11px] font-mono text-[#77717A] dark:text-[#B8B1BB]" dir="ltr">{teacher.email}</p>
                      <p className="mt-1 text-[11px]" style={{ color: isActive ? (theme === 'dark' ? '#75C695' : '#347653') : (theme === 'dark' ? '#D6B878' : '#A96F19') }}>
                        {isActive ? 'معتمد ونشط' : teacher.status === 'active' ? 'نشط لكن يحتاج تحديد الصف' : 'موقوف'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <span className="whitespace-nowrap text-[#77717A] dark:text-[#B8B1BB]">الصف:</span>
                        <select
                          aria-label={`الصف المسند إلى ${teacher.name}`}
                          value={teacher.assigned_grade || ''}
                          disabled={isSaving}
                          onChange={(event) => {
                            const value = event.target.value as MiddleSchoolGrade;
                            if (value) void handleUpdateTeacherGrade(teacher.id, value);
                          }}
                          className="rounded-xl border px-3 py-2 text-xs"
                          style={{
                            backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                            borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                            color: theme === 'dark' ? '#F5F1F0' : '#272329',
                          }}
                        >
                          <option value="" disabled>اختر الصف</option>
                          <option value="grade-1">الصف السابع</option>
                          <option value="grade-2">الصف الثامن</option>
                          <option value="grade-3">الصف التاسع</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        disabled={isSaving || (teacher.status !== 'active' && !teacher.assigned_grade)}
                        onClick={() => void handleToggleTeacherApproval(teacher)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: teacher.status === 'active'
                            ? (theme === 'dark' ? 'rgba(214, 100, 120, 0.55)' : '#DFC0CA')
                            : (theme === 'dark' ? 'rgba(117, 198, 149, 0.45)' : '#B9DCC4'),
                          color: teacher.status === 'active'
                            ? (theme === 'dark' ? '#F0A6B2' : '#9D3048')
                            : (theme === 'dark' ? '#75C695' : '#347653'),
                        }}
                      >
                        {isSaving ? 'جارٍ الحفظ...' : teacher.status === 'active' ? 'إيقاف الاعتماد' : 'إعادة الاعتماد'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {isHead && (
        <section className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right liquid-glass-card backdrop-blur-3xl">
          <div className="border-b pb-4" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <h2 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>أمناء الخدمة وحسابات الاختبار</h2>
            <p className="mt-1 text-xs text-[#77717A] dark:text-[#B8B1BB]">هذه القائمة تعرض الحسابات التي أضيفت عبر صلاحيات أمين الخدمة العام. إضافة البريد لا تكشف كلمة مروره ولا تنشئ كلمة مرور نيابةً عن صاحبه.</p>
          </div>
          {roleAccounts.filter((account) => account.role === 'head' || account.role === 'test').length === 0 ? (
            <p className="rounded-2xl border p-4 text-xs text-[#77717A] dark:text-[#B8B1BB]" style={{ borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0' }}>
              لا توجد حسابات إضافية من هذا النوع حتى الآن.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              {roleAccounts.filter((account) => account.role === 'head' || account.role === 'test').map((account) => (
                <div key={account.role + ':' + account.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>{account.name || account.email}</p>
                    <p className="mt-1 text-[11px] font-mono text-[#77717A] dark:text-[#B8B1BB]" dir="ltr">{account.email}</p>
                  </div>
                  <span className="self-start rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.4)' : '#DFC0CA', color: account.role === 'test' ? (theme === 'dark' ? '#D6B878' : '#765A22') : (theme === 'dark' ? '#F3DEAB' : '#76243A') }}>
                    {roleAccountLabels[account.role]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Students Table with Search & Filter */}
      <div
        className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right liquid-glass-card backdrop-blur-3xl"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              سجل طلاب المرحلة الإعدادية
            </h2>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">({filteredStudents.length} طالب)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Grade */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#76243A] backdrop-blur-md"
              style={{
                backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                color: theme === 'dark' ? '#F5F1F0' : '#272329',
              }}
            >
              <option value="all">جميع فصول إعدادي</option>
              <option value="grade-1">الصف السابع (أولى إعدادي)</option>
              <option value="grade-2">الصف الثامن (تانية إعدادي)</option>
              <option value="grade-3">الصف التاسع (تالتة إعدادي)</option>
            </select>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="بحث بالاسم أو الفصل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 pr-8 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#76243A] w-40 sm:w-56 backdrop-blur-md"
                style={{
                  backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#77717A] dark:text-[#B8B1BB] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr
                className="border-b text-[#77717A] dark:text-[#B8B1BB]"
                style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
              >
                <th className="py-3 px-3 font-semibold">الطالب</th>
                <th className="py-3 px-3 font-semibold">الصف</th>
                <th className="py-3 px-3 font-semibold">المواظبة</th>
                <th className="py-3 px-3 font-semibold">نقاط مسيري</th>
                <th className="py-3 px-3 font-semibold">إجراءات وتشجيع</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              {filteredStudents.map((std) => (
                <tr
                  key={std.id}
                  className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      {std.name}
                    </div>
                    <div className="text-[11px] text-[#77717A] dark:text-[#B8B1BB] font-mono" dir="ltr">
                      {std.phone || std.email}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium">
                      {std.gradeLevel === 'grade-1'
                        ? 'الصف السابع (أولى)'
                        : std.gradeLevel === 'grade-2'
                        ? 'الصف الثامن (تانية)'
                        : 'الصف التاسع (تالتة)'}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-green-600 dark:text-green-400">
                        {std.attendanceRate}%
                      </span>
                      <span className="text-[10px] text-[#77717A] dark:text-[#B8B1BB]">
                        {attendanceToday[std.id] === 'present' ? 'حاضر اليوم' : attendanceToday[std.id] === 'absent' ? 'غائب اليوم' : attendanceToday[std.id] === 'excused' ? 'غياب بعذر' : 'لم يُسجل اليوم'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {([
                        ['present', 'حاضر'], ['absent', 'غائب'], ['excused', 'بعذر'],
                      ] as const).map(([status, label]) => (
                        <button key={status} type="button" onClick={() => void handleAttendanceChange(std.id, status)}
                          className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${attendanceToday[std.id] === status ? 'bg-[#76243A] text-white border-[#76243A]' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-sm" style={{ color: theme === 'dark' ? '#B65370' : '#76243A' }}>
                    <div>{std.points}</div>
                    {latestPointReasons[std.id] && <div className="mt-1 max-w-40 font-sans text-[10px] font-normal text-[#77717A] dark:text-[#B8B1BB]">آخر سبب: {latestPointReasons[std.id]}</div>}
                  </td>

                  <td className="py-3 px-3">
                    <button
                      onClick={() => setAwardingStudentId(std.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: theme === 'dark' ? '#76243A' : 'transparent',
                        color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                        borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA',
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" style={{ color: theme === 'dark' ? '#F3DEAB' : '#76243A' }} />
                      <span>منح نقاط تشجيعية</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Award Points Modal */}
      {awardingStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-4 text-right shadow-2xl"
            style={{
              backgroundColor: theme === 'dark' ? '#211F25' : '#FFFFFF',
              borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
            }}
          >
            <div className="border-b pb-3">
              <h3 className="text-base font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                منح نقاط تميز روحي
              </h3>
              <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-0.5">
                تشجيع الطالب على حفظ الآيات أو الحضور المبكر للقداس
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold">عدد النقاط:</label>
                <div className="flex gap-2">
                  {[10, 20, 30, 50].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setBonusPoints(pts)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors"
                      style={{
                        backgroundColor: bonusPoints === pts ? (theme === 'dark' ? '#38232C' : '#F3E7EB') : 'transparent',
                        borderColor: bonusPoints === pts ? '#76243A' : (theme === 'dark' ? '#3A3540' : '#E7E2E0'),
                        color: bonusPoints === pts ? '#76243A' : (theme === 'dark' ? '#F5F1F0' : '#272329'),
                      }}
                    >
                      +{pts}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">سبب التميز:</label>
                <input
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0' }}>
              <button
                onClick={() => setAwardingStudentId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs border"
                style={{ borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0' }}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleAwardPoints(awardingStudentId)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm church-btn-primary"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                }}
              >
                تأكيد المنح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Head's Plus Button Quick Add Modal */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl border p-6 sm:p-7 space-y-4 shadow-2xl relative text-right"
            style={{
              background:
                theme === 'dark'
                  ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.95) 0%, rgba(22, 20, 25, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 247, 244, 0.98) 100%)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(118,36,58,0.15)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <button onClick={() => setIsQuickAddModalOpen(false)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                <X className="w-5 h-5 text-[#77717A]" />
              </button>
              <h3 className="text-base font-bold flex items-center gap-1.5" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                <Plus className="w-4 h-4 text-[#C5A15A]" />
                <span>إضافة حساب أو صلاحية (+)</span>
              </h3>
            </div>

            <p className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
              اختر الصلاحية وأدخل البريد. يتم اعتماد الدور من قاعدة البيانات؛ لا يمكن للحساب أن يمنح نفسه صلاحيات.
            </p>

            <form onSubmit={handleQuickAddTeacher} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold block">نوع الحساب:</label>
                <select
                  required
                  value={newAccountRole}
                  onChange={(event) => setNewAccountRole(event.target.value as ManagedRoleAccount['role'])}
                  disabled={isAddingRoleAccount}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                  style={{ backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF', borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0', color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
                >
                  <option value="teacher">خادم / معلم لفصل</option>
                  <option value="head">أمين خدمة عام إضافي</option>
                  <option value="test">حساب اختبار TEST</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold block">البريد الإلكتروني للحساب:</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  placeholder={newAccountRole === 'head' ? 'head@maseery.org' : newAccountRole === 'test' ? 'test@maseery.org' : 'teacher@maseery.org'}
                  value={newTeacherEmail}
                  disabled={isAddingRoleAccount}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold block">اسم الخادم (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: أ/ فادي يوسف"
                  value={newTeacherName}
                  disabled={isAddingRoleAccount}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                />
              </div>

              {newAccountRole === 'teacher' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">الصف المسند إلى الخادم:</label>
                  <select
                    required
                    value={newTeacherGrade}
                    onChange={(event) => setNewTeacherGrade(event.target.value as MiddleSchoolGrade)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                      borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                      color: theme === 'dark' ? '#F5F1F0' : '#272329',
                    }}
                  >
                    <option value="grade-1">الصف السابع (أولى إعدادي)</option>
                    <option value="grade-2">الصف الثامن (تانية إعدادي)</option>
                    <option value="grade-3">الصف التاسع (تالتة إعدادي)</option>
                  </select>
                </div>
  
  
              )}

              <button
                type="submit"
                disabled={isAddingRoleAccount}
                className="w-full py-3 rounded-2xl text-xs font-bold shadow-lg church-btn-primary disabled:opacity-60"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                }}
              >
                {isAddingRoleAccount ? 'جارٍ حفظ الصلاحية...' : 'إضافة الصلاحية (+)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supabase Connection Instructions Guide Modal */}
      <SupabaseGuideModal
        isOpen={isSupabaseGuideOpen}
        onClose={() => setIsSupabaseGuideOpen(false)}
        theme={theme}
      />
    </div>
  );
};
