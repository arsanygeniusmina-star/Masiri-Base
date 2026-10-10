import React, { useState } from 'react';
import { User, StudentRecord, PrayerRequest, MiddleSchoolGrade } from '../types';
import { Database } from '../db/storage';
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
  onNavigate: (screen: 'get-started' | 'login' | 'signup' | 'profile' | 'dashboard' | 'supabase') => void;
  theme: 'light' | 'dark';
}

export const ServantDashboardScreen: React.FC<ServantDashboardScreenProps> = ({
  currentUser,
  onNavigate,
  theme,
}) => {
  const isHead = currentUser.role === 'head' || Database.isHeadEmail(currentUser.email);
  const [students, setStudents] = useState<StudentRecord[]>(Database.getStudentRecords());
  const [selectedGrade, setSelectedGrade] = useState<'all' | MiddleSchoolGrade>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>(Database.getPrayerRequests());
  const [awardingStudentId, setAwardingStudentId] = useState<string | null>(null);
  const [bonusPoints, setBonusPoints] = useState(25);
  const [bonusReason, setBonusReason] = useState('حفظ آية الأسبوع والتسميع المتقن');
  const [feedbackToast, setFeedbackToast] = useState('');

  // Quick Add Teacher Plus Button Modal for Head
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherGrade, setNewTeacherGrade] = useState<MiddleSchoolGrade>('grade-2');
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
    const matchesSearch = s.name.includes(searchQuery) || s.churchFamily.includes(searchQuery);
    return matchesGrade && matchesSearch;
  });

  // Handle Award Points
  const handleAwardPoints = (studentId: string) => {
    const updated = Database.awardPointsToStudent(studentId, bonusPoints, bonusReason);
    if (updated) {
      setStudents(Database.getStudentRecords());
      setAwardingStudentId(null);
      setFeedbackToast(`تم منح +${bonusPoints} نقطة للطالب (${updated.name}) بنجاح!`);
      setTimeout(() => setFeedbackToast(''), 3000);
    }
  };

  // Handle Quick Add Teacher from Dashboard (Exclusive to Head)
  const handleQuickAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHead) return;

    const res = Database.addTeacherEmail(
      newTeacherEmail,
      newTeacherName,
      currentUser.email,
      newTeacherGrade,
      'تمت الإضافة من لوحة الخدمة'
    );

    if (res.success) {
      setFeedbackToast(`تمت إضافة الخادم بنجاح! بمجرد أن يسجل بهذا البريد (${newTeacherEmail}) سيدخل كخادم.`);
      setNewTeacherEmail('');
      setNewTeacherName('');
      setIsQuickAddModalOpen(false);
    } else {
      setFeedbackToast(res.message);
    }
    setTimeout(() => setFeedbackToast(''), 4000);
  };

  // Mark prayer request prayed
  const handleMarkPrayed = (id: string) => {
    Database.markPrayerDone(id);
    setPrayerRequests(Database.getPrayerRequests());
    setFeedbackToast('تم تحديد طلب الصلاة كـ "تمت الصلاة" وتوصيل البركة للطالب.');
    setTimeout(() => setFeedbackToast(''), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative">
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
              <span>إضافة خادم جديد (+)</span>
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
            89%
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
            {Database.getTeachersWhitelist().length}
          </p>
        </div>
      </div>

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
                        ({std.streakDays} يوم متواصل)
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-sm" style={{ color: theme === 'dark' ? '#B65370' : '#76243A' }}>
                    {std.points}
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
                <span>إضافة خادم جديد (+)</span>
              </h3>
            </div>

            <p className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
              أدخل إيميل المعلم. بمجرد أن يسجل حسابه سيدخل مباشرة بصفة (خادم فصلي).
            </p>

            <form onSubmit={handleQuickAddTeacher} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold block">إيميل الخادم:</label>
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
                <label className="text-xs font-semibold block">اسم الخادم (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: أ/ فادي يوسف"
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
    </div>
  );
};
