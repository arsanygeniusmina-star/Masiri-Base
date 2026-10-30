import React, { useEffect, useState } from 'react';
import { User, MiddleSchoolGrade, TeacherWhitelistEntry, ManagedRoleAccount } from '../types';
import { supabase, mapUserProfile } from '../lib/supabase';
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Save,
  Award,
  Calendar,
  AlertCircle,
  HelpCircle,
  X,
  UserPlus,
  Camera,
  Image,
} from 'lucide-react';
import { SupabaseGuideModal } from '../components/SupabaseGuideModal';
import { AppScreen } from '../components/NavigationTaskbar';
import { StreakBadge } from '../components/readings/StreakBadge';
import { useReadingStreak } from '../lib/useReadingStreak';
import { CameraCapture } from '../components/readings/CameraCapture';

interface ProfileScreenProps {
  currentUser: User | null;
  onUpdateCurrentUser: (updated: User) => void;
  onNavigate: (screen: AppScreen) => void;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = (props) => {
  if (!props.currentUser) {
    return <ProfileSignInPrompt theme={props.theme} onNavigate={props.onNavigate} />;
  }
  return <ProfileScreenInner {...props} currentUser={props.currentUser} />;
};

const ProfileSignInPrompt: React.FC<Pick<ProfileScreenProps, 'theme' | 'onNavigate'>> = ({ theme, onNavigate }) => (
  <div className="relative mx-auto flex min-h-[65vh] max-w-lg items-center justify-center px-4 py-8">
    <div className="liquid-glass-card w-full space-y-6 rounded-3xl p-7 text-center sm:p-9">
      <div
        className="mx-auto h-24 w-24 overflow-hidden rounded-3xl border shadow-2xl transition-transform hover:scale-105 active:scale-95 sm:h-28 sm:w-28"
        style={{
          borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.55)' : 'rgba(118, 36, 58, 0.25)',
          boxShadow: theme === 'dark'
            ? '0 16px 40px rgba(0,0,0,0.6), 0 0 35px rgba(214, 184, 120, 0.35)'
            : '0 16px 36px rgba(118, 36, 58, 0.22), 0 0 25px rgba(214, 184, 120, 0.2)',
        }}
      >
        <img src="/masiri-journey-icon.jpg?v=20261010-2" alt="شعار THE APOSTLES" className="h-full w-full object-cover" />
      </div>
      <h2
        dir="ltr"
        lang="en"
        className="text-2xl uppercase leading-tight sm:text-3xl"
        style={{
          color: theme === 'dark' ? '#F3DEAB' : '#76243A',
          fontFamily: "'Cinzel', 'Times New Roman', serif",
          fontWeight: 900,
          letterSpacing: '0.06em',
        }}
      >
        My Account
      </h2>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={() => onNavigate('login')} className="church-btn-primary rounded-2xl px-6 py-3 text-sm font-bold">تسجيل الدخول</button>
        <button type="button" onClick={() => onNavigate('signup')} className="rounded-2xl border px-6 py-3 text-sm font-bold" style={{ borderColor: '#C5A15A', color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}>إنشاء حساب جديد</button>
      </div>
    </div>
  </div>
);

type ProfileScreenInnerProps = Omit<ProfileScreenProps, 'currentUser'> & { currentUser: User };

const ProfileScreenInner: React.FC<ProfileScreenInnerProps> = ({
  currentUser,
  onUpdateCurrentUser,
  onNavigate,
  theme,
  simulationMode = false,
}) => {
  const isHead = currentUser.role === 'head';
  const isTeacher = currentUser.role === 'teacher';
  const isStudent = currentUser.role === 'student';
  const profileStreak = useReadingStreak(currentUser.id, isStudent, simulationMode, currentUser.streakDays);

  // Profile Edit State
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [churchName, setChurchName] = useState(currentUser.churchName || 'كنيسة السيدة العذراء والشهيد مارمرقس');
  const [gradeLevel, setGradeLevel] = useState<MiddleSchoolGrade>(currentUser.gradeLevel || 'grade-2');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Head Teacher Whitelist Management State
  const [teachersList, setTeachersList] = useState<TeacherWhitelistEntry[]>([]);
  const [roleAccounts, setRoleAccounts] = useState<ManagedRoleAccount[]>([]);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherGrade, setNewTeacherGrade] = useState<MiddleSchoolGrade>('grade-2');
  const [newTeacherNotes, setNewTeacherNotes] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<ManagedRoleAccount['role']>('teacher');
  const [whitelistFeedback, setWhitelistFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick Plus Button Modal for Head
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'teachers'>('profile');

  // Avatar Upload State
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarCameraOpen, setAvatarCameraOpen] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!isHead) return () => { cancelled = true; };

    if (simulationMode) {
      setTeachersList([
        {
          id: 'preview-profile-teacher-1',
          email: 'anton.teacher@example.test',
          name: 'الخادم أنطونيوس',
          assignedGrade: 'grade-1',
          addedBy: 'TEST SIMULATION',
          addedAt: new Date().toISOString(),
          notes: 'بيانات تجريبية',
          status: 'active',
        },
        {
          id: 'preview-profile-teacher-2',
          email: 'peter.teacher@example.test',
          name: 'الخادم بطرس',
          assignedGrade: 'grade-2',
          addedBy: 'TEST SIMULATION',
          addedAt: new Date().toISOString(),
          notes: 'بيانات تجريبية',
          status: 'active',
        },
      ]);
      setRoleAccounts([
        { email: 'head.preview@example.test', name: 'أمين خدمة تجريبي', role: 'head', assigned_grade: null, status: 'active', created_at: new Date().toISOString() },
        { email: 'test.preview@example.test', name: 'حساب اختبار تجريبي', role: 'test', assigned_grade: null, status: 'active', created_at: new Date().toISOString() },
      ]);
      return () => { cancelled = true; };
    }

    const loadAll = async () => {
      const [teachersResult, rolesResult] = await Promise.all([
        supabase
          .from('teachers_whitelist')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.rpc('list_app_role_emails'),
      ]);

      if (cancelled) return;

      if (teachersResult.error) {
        setWhitelistFeedback({ type: 'error', message: 'تعذر تحميل قائمة الخدام من قاعدة البيانات.' });
        return;
      }
      if (rolesResult.error) {
        console.error('Unable to load role accounts:', rolesResult.error);
        // Don't show error to user for this, just log it
      }

      setTeachersList((teachersResult.data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        assignedGrade: row.assigned_grade || undefined,
        addedBy: row.added_by,
        addedAt: row.created_at,
        notes: row.notes || undefined,
        status: row.status === 'active' ? 'active' : 'invited',
      })));

      setRoleAccounts((rolesResult.data || []) as ManagedRoleAccount[]);
    };

    void loadAll();
    return () => { cancelled = true; };
  }, [isHead, currentUser.id, simulationMode]);

  // Persist profile changes in Supabase; local storage is not the source of truth for account data.
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    if (simulationMode) {
      onUpdateCurrentUser({
        ...currentUser,
        name: name.trim(),
        phone: phone.trim() || undefined,
        churchName: churchName.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setSaveSuccessMsg('تم حفظ التغييرات في وضع المحاكاة فقط؛ لم تتغير بيانات أي حساب حقيقي.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          church_name: churchName.trim(),
          avatar_url: avatarUrl || null,
        })
        .eq('id', currentUser.id)
        .select('*')
        .single();

      if (error) throw error;
      const updated = mapUserProfile(data as any);
      onUpdateCurrentUser(updated);
      setSaveSuccessMsg('تم حفظ بيانات الملف الشخصي في قاعدة البيانات بنجاح.');
    } catch (error) {
      console.error('Unable to save Masiri profile:', error);
      setSaveErrorMsg('تعذر حفظ البيانات. تحقق من اتصالك وصلاحيات الحساب ثم حاول مرة أخرى.');
    }
  };

  // EXTREME compression for avatars (max 300px, 55% quality, ~8-20 KB)
// ULTRA-EXTREME avatar compression
const AVATAR_MAX_EDGE = 200;         // Max 200px (was 300) - plenty for thumbnails
const AVATAR_QUALITY = 0.40;         // 40% quality (was 55%)
const AVATAR_MAX_BYTES = 8 * 1024;   // 8 KB hard limit (was 30KB)

async function compressAvatar(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // Aggressive: 0.40 → 0.32 → 0.26 → 0.20 → 0.15
    let quality = AVATAR_QUALITY;
    let blob: Blob | null = null;
    for (let i = 0; i < 5; i++) {
      blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality));
      if (blob && blob.size <= AVATAR_MAX_BYTES) break;
      quality = Math.max(0.12, quality - 0.08);
    }
    if (blob && blob.size > 0) return blob;
  } catch { /* fallthrough */ }
  if (file.type.startsWith('image/') && file.size <= AVATAR_MAX_BYTES) return file;
  throw new Error('الصورة كبيرة جداً. التقط صورة للوجه فقط من قرب.');
}

async function uploadAvatarToSupabase(userId: string, photo: Blob): Promise<string> {
  const compressed = await compressAvatar(photo as File);
  const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
  const path = `avatars/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, {
      contentType: compressed.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) throw error;

  // Get public URL (avatars bucket is public)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

  // Handle avatar photo capture from camera
  const handleAvatarCameraPhoto = async (photo: Blob) => {
    setAvatarCameraOpen(false);
    setAvatarError('');
    setAvatarUploading(true);

    try {
      if (simulationMode) {
        const previewUrl = URL.createObjectURL(photo);
        setAvatarUrl(previewUrl);
        setAvatarError('تم تحديث الصورة في وضع المحاكاة فقط.');
        return;
      }

      const publicUrl = await uploadAvatarToSupabase(currentUser.id, photo);
      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setAvatarError(error instanceof Error ? error.message : 'تعذر رفع الصورة. حاول مرة أخرى.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Only the authenticated head account can manage this server-side whitelist.
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhitelistFeedback(null);

    if (!isHead) {
      setWhitelistFeedback({ type: 'error', message: 'هذه العملية متاحة لأمين الخدمة المعتمد فقط.' });
      return;
    }

    const cleanEmail = newTeacherEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setWhitelistFeedback({ type: 'error', message: 'يرجى إدخال بريد إلكتروني صالح.' });
      return;
    }

    // For teacher role, grade is required
    if (newAccountRole === 'teacher' && !newTeacherGrade) {
      setWhitelistFeedback({ type: 'error', message: 'يجب تحديد الصف للخادم.' });
      return;
    }

    if (simulationMode) {
      // Check if email already exists in either list
      const exists = teachersList.some((t) => t.email.toLowerCase() === cleanEmail) ||
                     roleAccounts.some((r) => r.email.toLowerCase() === cleanEmail);
      if (exists) {
        setWhitelistFeedback({ type: 'error', message: 'هذا البريد موجود بالفعل في بيانات المحاكاة.' });
        return;
      }

      const name = newTeacherName.trim() || (newAccountRole === 'teacher' ? 'خادم جديد' : newAccountRole === 'head' ? 'أمين خدمة جديد' : 'حساب اختبار');

      if (newAccountRole === 'teacher') {
        const previewEntry: TeacherWhitelistEntry = {
          id: 'preview-profile-teacher-' + Date.now(),
          email: cleanEmail,
          name,
          assignedGrade: newTeacherGrade,
          addedBy: currentUser.email,
          addedAt: new Date().toISOString(),
          notes: newTeacherNotes.trim() || 'تمت الإضافة في وضع المحاكاة',
          status: 'active',
        };
        setTeachersList((previous) => [previewEntry, ...previous]);
      } else {
        const role = newAccountRole as ManagedRoleAccount['role'];
        const previewRoleAccount: ManagedRoleAccount = {
          email: cleanEmail,
          name,
          role,
          assigned_grade: role === 'teacher' ? newTeacherGrade : null,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        setRoleAccounts((previous) => [previewRoleAccount, ...previous]);
      }

      setNewTeacherEmail('');
      setNewTeacherName('');
      setNewTeacherNotes('');
      setNewTeacherGrade('grade-2');
      setNewAccountRole('teacher');
      setWhitelistFeedback({ type: 'success', message: 'تمت الإضافة في وضع المحاكاة فقط؛ لم تتغير قاعدة البيانات.' });
      setIsQuickAddModalOpen(false);
      return;
    }

    // Use the RPC that handles teacher, head, and test roles
    const { data, error } = await supabase.rpc('manage_app_role_email', {
      p_email: cleanEmail,
      p_role: newAccountRole,
      p_name: newTeacherName.trim() || null,
      p_grade: newAccountRole === 'teacher' ? newTeacherGrade : null,
    });

    if (error) {
      const msg = error.code === '23505' || error.message.includes('already assigned')
        ? 'هذا البريد مسجل بالفعل تحت صلاحية أخرى.'
        : error.message?.includes('Only an authenticated Head')
          ? 'صلاحية أمين الخدمة مطلوبة.'
          : error.message?.includes('valid email')
            ? 'بريد إلكتروني غير صالح.'
            : error.message?.includes('grade')
              ? 'يجب تحديد الصف للمعلمين.'
              : 'تعذرت الإضافة. تأكد من صلاحية أمين الخدمة.';
      setWhitelistFeedback({ type: 'error', message: msg });
      return;
    }

    // Refresh both lists
    const [teachersResult, rolesResult] = await Promise.all([
      supabase.from('teachers_whitelist').select('*').order('created_at', { ascending: false }),
      supabase.rpc('list_app_role_emails'),
    ]);

    if (!teachersResult.error) {
      setTeachersList((teachersResult.data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        assignedGrade: row.assigned_grade || undefined,
        addedBy: row.added_by,
        addedAt: row.created_at,
        notes: row.notes || undefined,
        status: row.status === 'active' ? 'active' : 'invited',
      })));
    }
    if (!rolesResult.error) {
      setRoleAccounts((rolesResult.data || []) as ManagedRoleAccount[]);
    }

    setNewTeacherEmail('');
    setNewTeacherName('');
    setNewTeacherNotes('');
    setNewTeacherGrade('grade-2');
    setNewAccountRole('teacher');

    const roleLabel = newAccountRole === 'teacher' ? 'خادم' : newAccountRole === 'head' ? 'أمين خدمة' : 'حساب اختبار';
    setWhitelistFeedback({ type: 'success', message: `تم اعتماد ${cleanEmail} كـ ${roleLabel} بنجاح.` });
    setIsQuickAddModalOpen(false);
  };

  const handleRemoveTeacher = async (idOrEmail: string, teacherName: string) => {
    if (!isHead) return;
    if (!simulationMode && !window.confirm(`هل أنت متأكد من إلغاء اعتماد ${teacherName}؟`)) return;

    const isEmail = idOrEmail.includes('@');
    const id = isEmail ? undefined : idOrEmail;
    const email = isEmail ? idOrEmail : undefined;

    if (simulationMode) {
      setTeachersList((previous) => previous.filter((teacher) => teacher.id !== id));
      setRoleAccounts((previous) => previous.filter((acc) => acc.email !== email));
      setWhitelistFeedback({ type: 'success', message: `تم إلغاء اعتماد ${teacherName} في المحاكاة فقط.` });
      return;
    }

    // Find the account in either list to get email and role
    const teacher = id ? teachersList.find((t) => t.id === id) : undefined;
    const roleAcc = email ? roleAccounts.find((r) => r.email === email) : undefined;
    const foundEmail = teacher?.email || roleAcc?.email;
    const role = teacher ? 'teacher' : roleAcc?.role || 'teacher';

    if (!foundEmail) {
      setWhitelistFeedback({ type: 'error', message: 'تعذر العثور على الحساب.' });
      return;
    }

    // Delete from appropriate table using RPC or direct delete
    let error: any = null;
    if (role === 'teacher') {
      const result = await supabase.from('teachers_whitelist').delete().eq('id', id!);
      error = result.error;
    } else if (role === 'head') {
      const result = await supabase.rpc('revoke_head_account', { p_email: foundEmail });
      error = result.error;
    } else if (role === 'test') {
      const result = await supabase.rpc('revoke_test_account', { p_email: foundEmail });
      error = result.error;
    }

    if (error) {
      setWhitelistFeedback({ type: 'error', message: 'تعذر إلغاء الاعتماد. تحقق من صلاحيات أمين الخدمة.' });
      return;
    }

    // Also reset user role to student if they have a profile
    await supabase.from('users').update({ role: 'student', grade_level: null }).eq('email', email);

    setTeachersList((previous) => previous.filter((teacher) => teacher.id !== id));
    setRoleAccounts((previous) => previous.filter((acc) => acc.id !== id));
    setWhitelistFeedback({ type: 'success', message: `تم إلغاء اعتماد ${teacherName} من قاعدة البيانات.` });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-[#76243A]/15 dark:bg-[#B65370]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[#C5A15A]/15 dark:bg-[#D6B878]/10 blur-3xl pointer-events-none" />

      {/* Top Profile Card Banner - Super Liquid Glassmorphism */}
      <div
        className="rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden liquid-glass-card backdrop-blur-3xl"
      >
        <div className="flex items-center gap-4 sm:gap-6 relative">
          <div className="relative">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 transition-transform hover:scale-105 overflow-hidden border"
              style={{
                borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : 'rgba(118, 36, 58, 0.25)',
                background: isHead
                  ? 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)'
                  : isTeacher
                  ? 'linear-gradient(135deg, #C5A15A 0%, #A96F19 100%)'
                  : 'linear-gradient(135deg, #347653 0%, #20352A 100%)',
              }}
            >
              {isHead ? (
                <img
                  src="/logo.jpg"
                  alt="شعار الخدمة"
                  className="w-full h-full object-cover"
                />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`صورة ${currentUser.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser.name.charAt(0) || 'م'
              )}
            </div>
            {/* Camera button for avatar upload */}
            {!isHead && !simulationMode && (
              <button
                type="button"
                onClick={() => setAvatarCameraOpen(true)}
                disabled={avatarUploading}
                className="absolute bottom-0 left-0 rounded-full p-1.5 shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                    : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  border: theme === 'dark' ? '2px solid rgba(214, 184, 120, 0.45)' : '2px solid white',
                }}
                aria-label="تغيير الصورة الشخصية"
                title="تغيير الصورة الشخصية"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
              >
                {currentUser.name}
              </h1>

              {/* Role pill badge */}
              <span
                className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                style={{
                  backgroundColor: isHead
                    ? theme === 'dark' ? 'rgba(56, 35, 44, 0.8)' : '#F3E7EB'
                    : isTeacher
                    ? theme === 'dark' ? 'rgba(52, 45, 32, 0.8)' : '#F6F0E3'
                    : theme === 'dark' ? 'rgba(32, 53, 42, 0.8)' : '#E9F4EC',
                  color: isHead
                    ? theme === 'dark' ? '#B65370' : '#76243A'
                    : isTeacher
                    ? theme === 'dark' ? '#D6B878' : '#A96F19'
                    : theme === 'dark' ? '#75C695' : '#347653',
                  border: `1px solid ${
                    isHead
                      ? theme === 'dark' ? '#69404D' : '#DFC0CA'
                      : theme === 'dark' ? '#D6B878' : '#C5A15A'
                  }`,
                }}
              >
                {isHead && <ShieldAlert className="w-3.5 h-3.5" />}
                {isTeacher && <Sparkles className="w-3.5 h-3.5" />}
                {isStudent && <BookOpen className="w-3.5 h-3.5" />}
                <span>
                  {isHead
                    ? '1. أمين الخدمة العام (Head)'
                    : isTeacher
                    ? '2. خادم فصلي معتمد (Teacher)'
                    : '3. طالب مرحلة إعدادي (Student)'}
                </span>
              </span>
            </div>

            <p className="text-xs sm:text-sm font-mono text-[#77717A] dark:text-[#B8B1BB]" dir="ltr">
              {currentUser.email}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#77717A] dark:text-[#B8B1BB] pt-1">
              <span>{currentUser.churchName || 'كنيسة السيدة العذراء ومارمرقس'}</span>
              {currentUser.gradeLevel && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-[#76243A] dark:text-[#B65370]">
                    {currentUser.gradeLevel === 'grade-1'
                      ? 'الصف السابع (أولى إعدادي)'
                      : currentUser.gradeLevel === 'grade-2'
                      ? 'الصف الثامن (تانية إعدادي)'
                      : 'الصف التاسع (تالتة إعدادي)'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Head's Quick Plus Button to Add Teacher & Action Cards */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0">
          {/* USER REQUIREMENT: Head has a part to add teachers with a PLUS BUTTON (+) */}
          {isHead && (
            <button
              onClick={() => {
                setActiveTab('teachers');
                setIsQuickAddModalOpen(true);
              }}
              className="px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all church-btn-primary"
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
                className="w-5 h-5 rounded-full flex items-center justify-center font-black text-sm"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.25)' : 'rgba(255, 255, 255, 0.2)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                }}
              >
                +
              </div>
              <span>إضافة خادم جديد (إيميل)</span>
            </button>
          )}

          <div
            className="p-3 rounded-2xl border text-center min-w-[90px] backdrop-blur-md"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(242, 240, 237, 0.7)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center justify-center py-1.5">
              <StreakBadge value={profileStreak?.value ?? currentUser.streakDays} active={profileStreak?.completedToday ?? false} size="lg" color={theme === 'dark' ? '#F5F1F0' : '#272329'} />
            </div>
          </div>

          <div
            className="p-3 rounded-2xl border text-center min-w-[90px] backdrop-blur-md"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(242, 240, 237, 0.7)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center justify-center gap-1 text-xs text-[#77717A] dark:text-[#B8B1BB]">
              <Award className="w-3.5 h-3.5 text-[#76243A] dark:text-[#B65370]" />
              <span>نقاط THE APOSTLES</span>
            </div>
            <p className="text-xl font-bold font-mono mt-0.5" style={{ color: theme === 'dark' ? '#B65370' : '#76243A' }}>
              {currentUser.points}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div
        className="flex items-center justify-between border-b pb-2"
        style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'profile' ? (theme === 'dark' ? '#76243A' : '#F3E7EB') : 'transparent',
              color: activeTab === 'profile' ? (theme === 'dark' ? '#F3DEAB' : '#76243A') : (theme === 'dark' ? '#B8B1BB' : '#77717A'),
              border: activeTab === 'profile' ? `1px solid ${theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA'}` : '1px solid transparent',
            }}
          >
            بيانات الملف الشخصي
          </button>

          {/* Tab 2: Exclusively for Head or showing lock for teachers */}
          <button
            onClick={() => setActiveTab('teachers')}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'teachers' ? (theme === 'dark' ? '#76243A' : '#F3E7EB') : 'transparent',
              color: activeTab === 'teachers' ? (theme === 'dark' ? '#F3DEAB' : '#76243A') : (theme === 'dark' ? '#B8B1BB' : '#77717A'),
              border: activeTab === 'teachers' ? `1px solid ${theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA'}` : '1px solid transparent',
            }}
          >
            {isHead ? <ShieldCheck className="w-4 h-4 text-[#76243A] dark:text-[#D6B878]" /> : <Lock className="w-4 h-4 text-[#77717A]" />}
            <span>إدارة الخدام والمعلمين</span>
            {isHead && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                style={{
                  backgroundColor: theme === 'dark' ? '#541424' : '#76243A',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.3)' : 'none',
                }}
              >
                {teachersList.length}
              </span>
            )}
          </button>
        </div>

        {/* Supabase connection guide button */}
        <button
          onClick={() => setIsSupabaseGuideOpen(true)}
          className="text-xs font-bold text-[#C5A15A] dark:text-[#D6B878] hover:underline flex items-center gap-1 shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">دليل ربط Supabase و Cloud SQL</span>
        </button>
      </div>

      {/* Tab 1: Profile Edit Form */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div
              className="rounded-3xl border p-6 sm:p-8 space-y-6 liquid-glass-card backdrop-blur-3xl"
            >
              <div className="border-b pb-3 text-right">
                <h2 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                  تعديل البيانات الأساسية
                </h2>
                <p className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
                  قم بتحديث اسمك وبيانات التواصل الكنسي
                </p>
              </div>

              {saveErrorMsg && (
                <div role="alert" className="flex items-center gap-2 rounded-2xl border p-3.5 text-xs"
                  style={{ backgroundColor: theme === 'dark' ? 'rgba(61,36,42,.75)' : '#F9E9EB', color: theme === 'dark' ? '#F08089' : '#B33B49', borderColor: theme === 'dark' ? '#69404D' : '#DFC0CA' }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div
                  className="p-3.5 rounded-2xl text-xs flex items-center gap-2"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(32, 53, 42, 0.7)' : '#E9F4EC',
                    color: theme === 'dark' ? '#75C695' : '#347653',
                    border: `1px solid ${theme === 'dark' ? '#3A3540' : '#DFC0CA'}`,
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {avatarError && (
                <div role="alert" className="flex items-center gap-2 rounded-2xl border p-3.5 text-xs"
                  style={{ backgroundColor: theme === 'dark' ? 'rgba(61,36,42,.75)' : '#F9E9EB', color: theme === 'dark' ? '#F08089' : '#B33B49', borderColor: theme === 'dark' ? '#69404D' : '#DFC0CA' }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{avatarError}</span>
                </div>
              )}

              {avatarUploading && (
                <div role="status" className="flex items-center gap-2 rounded-2xl border p-3.5 text-xs"
                  style={{ backgroundColor: theme === 'dark' ? 'rgba(52,45,32,.55)' : '#F6F0E3', color: theme === 'dark' ? '#D6B878' : '#A96F19', borderColor: theme === 'dark' ? 'rgba(214,184,120,.3)' : '#E5D3AE' }}>
                  <span className="animate-spin">⏳</span>
                  <span>جاري رفع الصورة الشخصية...</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-right">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      الاسم
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        color: theme === 'dark' ? '#F5F1F0' : '#272329',
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01234567890"
                      className="w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        color: theme === 'dark' ? '#F5F1F0' : '#272329',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                    اسم الكنيسة
                  </label>
                  <input
                    type="text"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      color: theme === 'dark' ? '#F5F1F0' : '#272329',
                    }}
                  />
                </div>

                {isStudent && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      المرحلة الدراسية
                    </label>
                    <select
                      value={gradeLevel}
                      disabled
                      aria-describedby="grade-level-help"
                      onChange={(e) => setGradeLevel(e.target.value as MiddleSchoolGrade)}
                      className="w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        color: theme === 'dark' ? '#F5F1F0' : '#272329',
                      }}
                    >
                      <option value="grade-1">الصف السابع (أولى إعدادي / 7th Grade)</option>
                      <option value="grade-2">الصف الثامن (تانية إعدادي / 8th Grade)</option>
                      <option value="grade-3">الصف التاسع (تالتة إعدادي / 9th Grade)</option>
                    </select>
                    <p id="grade-level-help" className="text-[11px] text-[#77717A] dark:text-[#B8B1BB]">يتم تحديد المرحلة الدراسية من بيانات التسجيل واعتماد الخدمة.</p>
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all church-btn-primary"
                    style={{
                      background:
                        theme === 'dark'
                          ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                          : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                      color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                      border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                    }}
                  >
                    <Save className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Role Privileges & Info Card */}
          <div className="space-y-6">
            <div
              className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right liquid-glass-card backdrop-blur-3xl"
            >
              <h3 className="text-sm font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                صلاحيات الحساب الحالي
              </h3>

              {isHead ? (
                <div className="space-y-3 text-xs leading-relaxed text-[#77717A] dark:text-[#B8B1BB]">
                  <p className="text-[#76243A] dark:text-[#B65370] font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>أمين الخدمة العام (Head)</span>
                  </p>
                  <p>
                    أنت مسجل كأمين الخدمة. يمكنك الضغط على زر الزائد <strong>(+)</strong> لإضافة إيميلات المعلمين في أي وقت.
                  </p>
                  <ul className="space-y-1.5 list-disc list-inside">
                    <li>إضافة إيميلات المعلمين (فور تسجيلهم يدخلون كخدام).</li>
                    <li>الإشراف الكامل على جميع فصول إعدادي.</li>
                  </ul>
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setIsQuickAddModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 mt-2 shadow-md"
                    style={{ backgroundColor: theme === 'dark' ? '#B65370' : '#76243A' }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>فتح نافذة إضافة خادم جديد (+)</span>
                  </button>
                </div>
              ) : isTeacher ? (
                <div className="space-y-3 text-xs leading-relaxed text-[#77717A] dark:text-[#B8B1BB]">
                  <p className="text-[#A96F19] dark:text-[#D6B878] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>خادم فصلي معتمد (Teacher)</span>
                  </p>
                  <p>
                    تم اعتماد بريدك من قِبل أمين الخدمة. تمتلك جميع أدوات المتابعة وتقييم الطلاب وتسجيل الحضور وإسناد النقاط.
                  </p>
                  <div
                    className="p-3.5 rounded-2xl border text-[11px] backdrop-blur-md"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : '#F2F0ED',
                      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="font-bold block mb-1">تنبيه الصلاحية:</span>
                    لا يمكنك إضافة معلمين آخرين؛ هذه الصلاحية قاصرة على أمين الخدمة العام (minasamehdeif@gmail.com).
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs leading-relaxed text-[#77717A] dark:text-[#B8B1BB]">
                  <p className="text-[#347653] dark:text-[#75C695] font-bold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>بطل المرحلة الإعدادية</span>
                  </p>
                  <p>
                    بيانات مسارك الروحي محفوظة في حسابك، يمكنك متابعة تقدمك الدراسي والروحي والدرجات ونقاط التميز مباشرة من ملفك الشخصي.
                  </p>
                  <div
                    className="w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 mt-2 border"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(56, 35, 44, 0.6)' : '#F3E7EB',
                      borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.35)' : '#DFC0CA',
                      color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                    }}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>نقاط التميز الروحي: {currentUser.points} نقطة</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Teacher Management (The exact requested feature!) */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          {!isHead ? (
            <div
              className="p-8 rounded-3xl border text-center space-y-4 max-w-xl mx-auto backdrop-blur-2xl shadow-xl"
              style={{
                background:
                  theme === 'dark'
                    ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.75) 0%, rgba(22, 20, 25, 0.85) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 247, 244, 0.85) 100%)',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{
                  backgroundColor: theme === 'dark' ? '#38232C' : '#F3E7EB',
                  color: theme === 'dark' ? '#B65370' : '#76243A',
                }}
              >
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                هذه الصلاحية خاصة بأمين الخدمة فقط
              </h2>
              <p className="text-sm leading-relaxed text-[#77717A] dark:text-[#B8B1BB]">
                الخادم الفصلي يمتلك كل أدوات إدارة ومتابعة الطلاب تماماً كأمين الخدمة، إلا أنه{' '}
                <strong className="text-[#76243A] dark:text-[#B65370]">لا يستطيع إضافة خدام آخرين</strong>. فقط أمين الخدمة العام (
                <span className="font-mono font-bold" dir="ltr">أمين الخدمة العام</span>) يملك حق إضافة واعتماد المعلمين الجدد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add New Teacher Form with the Plus Button Feature */}
              <div className="lg:col-span-5 space-y-4">
                <div
                  className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right backdrop-blur-2xl shadow-xl"
                  style={{
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.75) 0%, rgba(22, 20, 25, 0.85) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 247, 244, 0.85) 100%)',
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#76243A] text-white">
                        صلاحية أمين الخدمة
                      </span>
                      <h2 className="text-base font-bold flex items-center gap-1.5" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        <Plus className="w-4 h-4 text-[#C5A15A]" />
                        <span>إضافة خادم جديد</span>
                      </h2>
                    </div>
                    <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-1">
                      أدخل إيميل المعلم، وبمجرد أن يسجل بهذا الإيميل سيدخل كخادم فصلي تلقائياً
                    </p>
                  </div>

                  {whitelistFeedback && (
                    <div
                      className="p-3.5 rounded-2xl text-xs flex items-center gap-2"
                      style={{
                        backgroundColor:
                          whitelistFeedback.type === 'success'
                            ? theme === 'dark' ? 'rgba(32, 53, 42, 0.7)' : '#E9F4EC'
                            : theme === 'dark' ? 'rgba(61, 36, 42, 0.7)' : '#F9E9EB',
                        color:
                          whitelistFeedback.type === 'success'
                            ? theme === 'dark' ? '#75C695' : '#347653'
                            : theme === 'dark' ? '#F08089' : '#B33B49',
                        border: `1px solid ${
                          whitelistFeedback.type === 'success'
                            ? theme === 'dark' ? '#3A3540' : '#DFC0CA'
                            : theme === 'dark' ? '#69404D' : '#DFC0CA'
                        }`,
                      }}
                    >
                      {whitelistFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{whitelistFeedback.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddTeacher} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        البريد الإلكتروني للمعلم <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        dir="ltr"
                        placeholder="teacher@maseery.org"
                        value={newTeacherEmail}
                        onChange={(e) => setNewTeacherEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          color: theme === 'dark' ? '#F5F1F0' : '#272329',
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        اسم الخادم (اختياري)
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: أ/ يوحنا نصيف"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          color: theme === 'dark' ? '#F5F1F0' : '#272329',
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        الفصل المسند إليه
                      </label>
                      <select
                        value={newTeacherGrade}
                        onChange={(e) => setNewTeacherGrade(e.target.value as MiddleSchoolGrade)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A] backdrop-blur-md"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          color: theme === 'dark' ? '#F5F1F0' : '#272329',
                        }}
                      >
                        <option value="grade-1">الصف الأول الإعدادي (7th)</option>
                        <option value="grade-2">الصف الثاني الإعدادي (8th)</option>
                        <option value="grade-3">الصف الثالث الإعدادي (9th)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all church-btn-primary"
                      style={{
                        background:
                          theme === 'dark'
                            ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                            : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                        color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                        border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                      }}
                    >
                      <Plus className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
                      <span>اعتماد البريد كمعلم في THE APOSTLES</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Whitelisted Teachers Roster Table */}
              <div className="lg:col-span-7 space-y-4">
                <div
                  className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right backdrop-blur-2xl shadow-xl"
                  style={{
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.75) 0%, rgba(22, 20, 25, 0.85) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 247, 244, 0.85) 100%)',
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
                      إجمالي الحسابات المعتمدة: <strong>{teachersList.length + roleAccounts.length}</strong>
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 font-semibold">
                        {teachersList.length} خادم
                      </span>
                      <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                        {roleAccounts.filter(r => r.role === 'head').length} أمين خدمة
                      </span>
                      <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 font-semibold">
                        {roleAccounts.filter(r => r.role === 'test').length} اختبار
                      </span>
                    </span>
                    <h2 className="text-base font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      قائمة الحسابات المعتمدة
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    {/* Teachers */}
                    {teachersList.map((teacher) => (
                      <div
                        key={`teacher-${teacher.id}`}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(248, 247, 244, 0.8)',
                          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs"
                            style={{
                              backgroundColor: theme === 'dark' ? '#342D20' : '#F6F0E3',
                              color: theme === 'dark' ? '#D6B878' : '#A96F19',
                            }}
                          >
                            خـ
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                                {teacher.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 font-semibold">
                                خادم
                              </span>
                            </div>
                            <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] font-mono" dir="ltr">
                              {teacher.email}
                              {teacher.assignedGrade && ` · ${teacher.assignedGrade === 'grade-1' ? 'الصف السابع' : teacher.assignedGrade === 'grade-2' ? 'الصف الثامن' : 'الصف التاسع'}`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveTeacher(teacher.id, teacher.name)}
                          title="إلغاء اعتماد الخادم"
                          className="p-2 rounded-xl border text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Heads & Test Accounts */}
                    {roleAccounts.map((acc) => (
                      <div
                        key={`role-${acc.email}`}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01]"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(248, 247, 244, 0.8)',
                          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs"
                            style={{
                              backgroundColor: acc.role === 'head'
                                ? (theme === 'dark' ? '#38232C' : '#F3E7EB')
                                : (theme === 'dark' ? '#2D2335' : '#F0E8F5'),
                              color: acc.role === 'head'
                                ? (theme === 'dark' ? '#B65370' : '#76243A')
                                : (theme === 'dark' ? '#A855F7' : '#7C3AED'),
                            }}
                          >
                            {acc.role === 'head' ? 'أم' : acc.role === 'test' ? 'تج' : 'خـ'}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                                {acc.name || acc.email}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  backgroundColor: acc.role === 'head'
                                    ? 'rgba(182, 83, 112, 0.1)'
                                    : acc.role === 'test'
                                      ? 'rgba(168, 85, 247, 0.1)'
                                      : 'rgba(34, 197, 94, 0.1)',
                                  color: acc.role === 'head'
                                    ? (theme === 'dark' ? '#B65370' : '#76243A')
                                    : acc.role === 'test'
                                      ? (theme === 'dark' ? '#A855F7' : '#7C3AED')
                                      : (theme === 'dark' ? '#75C695' : '#347653'),
                                }}
                              >
                                {acc.role === 'head' ? 'أمين خدمة' : acc.role === 'test' ? 'اختبار' : 'خادم'}
                              </span>
                            </div>
                            <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] font-mono" dir="ltr">
                              {acc.email}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveTeacher(acc.email, acc.name || acc.email)}
                          title={`إلغاء اعتماد ${acc.role === 'head' ? 'أمين الخدمة' : acc.role === 'test' ? 'حساب الاختبار' : 'الخادم'}`}
                          className="p-2 rounded-xl border text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Teacher Modal Triggered by the Plus Button */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
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
              <button
                onClick={() => setIsQuickAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5 text-[#77717A]" />
              </button>
              <h3 className="text-base font-bold flex items-center gap-1.5" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                <Plus className="w-4 h-4 text-[#C5A15A]" />
                <span>إضافة خادم جديد سريعاً</span>
              </h3>
            </div>

            <p className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
              أدخل البريد الإلكتروني وسيقوم النظام فوراً باعتماد هذا الخادم.
            </p>

            <form onSubmit={handleAddTeacher} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold block">إيميل المعلم / الخادم / أمين الخدمة:</label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  placeholder="teacher@maseery.org"
                  value={newTeacherEmail}
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
                <label className="text-xs font-semibold block">اسم الحساب (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: أ/ يوحنا"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold block">الصلاحية:</label>
                <select
                  value={newAccountRole}
                  onChange={(e) => setNewAccountRole(e.target.value as ManagedRoleAccount['role'])}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                >
                  <option value="teacher">خادم فصلي (Teacher)</option>
                  <option value="head">أمين خدمة عام (Head)</option>
                  <option value="test">حساب اختبار (Test)</option>
                </select>
              </div>

              {newAccountRole === 'teacher' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">الفصل المسند إليه:</label>
                  <select
                    value={newTeacherGrade}
                    onChange={(e) => setNewTeacherGrade(e.target.value as MiddleSchoolGrade)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                      borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                      color: theme === 'dark' ? '#F5F1F0' : '#272329',
                    }}
                  >
                    <option value="grade-1">الصف الأول الإعدادي (7th)</option>
                    <option value="grade-2">الصف الثاني الإعدادي (8th)</option>
                    <option value="grade-3">الصف الثالث الإعدادي (9th)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl text-xs font-bold shadow-lg church-btn-primary"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                }}
              >
                تأكيد واعتماد الإيميل (+)
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

      {/* Avatar Camera Capture Modal */}
      {avatarCameraOpen && (
        <CameraCapture
          theme={theme}
          onCapture={handleAvatarCameraPhoto}
          onClose={() => setAvatarCameraOpen(false)}
        />
      )}
    </div>
  );
};
