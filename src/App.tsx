import React, { useState, useEffect } from 'react';
import { supabase, fetchUserProfile } from './lib/supabase';
import type { User, UserRole } from './types';
import { NavigationTaskbar, type AppScreen } from './components/NavigationTaskbar';
import { GetStartedScreen } from './screens/GetStartedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { PasswordRecoveryScreen } from './screens/PasswordRecoveryScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { StudentDashboardScreen } from './screens/StudentDashboardScreen';
import { ServantDashboardScreen } from './screens/ServantDashboardScreen';
import { SupabaseScreen } from './screens/SupabaseScreen';
import { Database } from './db/storage';
import { TestDashboardScreen } from './screens/TestDashboardScreen';
import { TestRoleSwitcher } from './components/TestRoleSwitcher';
import { startTestRuntimeLogCapture } from './lib/testRuntimeLogs';

const dashboardFor = (user: User): AppScreen =>
  user.role === 'student' ? 'student-dashboard' : 'servant-dashboard';

const authenticatedHomeFor = (user: User): AppScreen =>
  user.role === 'test' ? 'test' : dashboardFor(user);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('get-started');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => window.location.search.includes('password-reset=1'));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => Database.getTheme());
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    Database.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    startTestRuntimeLogCapture();
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateSession = async (authUserId: string | null, navigateToDashboard = false) => {
      if (!authUserId) {
        if (active) {
          setCurrentUser(null);
          setSessionReady(true);
        }
        return;
      }

      try {
        const profile = await fetchUserProfile(authUserId);
        if (!active) return;
        if (!profile) {
          setCurrentUser(null);
          setSessionReady(true);
          return;
        }
        setCurrentUser(profile);
        setSessionReady(true);
        if (navigateToDashboard) {
          setPreviewRole(null);
          setCurrentScreen(authenticatedHomeFor(profile));
        } else {
          // Keep TEST role previews stable while auth hydration confirms the real TEST account.
          // For normal accounts, reflect role/grade changes in the open dashboard.
          setCurrentScreen((previousScreen) => {
            if (profile.role === 'test') return previousScreen;
            return previousScreen === 'dashboard' ||
              previousScreen === 'student-dashboard' ||
              previousScreen === 'servant-dashboard'
                ? dashboardFor(profile)
                : previousScreen;
          });
        }
      } catch (error) {
        console.error('Unable to load the authenticated Masiri profile:', error);
        if (active) {
          setCurrentUser(null);
          setSessionReady(true);
        }
      }
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Unable to restore Supabase session:', error);
      void hydrateSession(data.session?.user.id ?? null, Boolean(data.session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer the profile query until Supabase has released its internal auth lock.
      window.setTimeout(() => {
        void hydrateSession(session?.user.id ?? null, Boolean(session));
      }, 0);
    });

    const refreshCurrentProfile = async () => {
      if (document.visibilityState === 'hidden') return;
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Unable to refresh the active Masiri session:', error);
        return;
      }
      void hydrateSession(data.session?.user.id ?? null, false);
    };

    // A role may be revoked while a teacher leaves the app open. The database's
    // RLS checks take effect immediately; refresh the profile so the dashboard
    // also switches to the account's new role within at most about 30 seconds.
    window.addEventListener('focus', refreshCurrentProfile);
    document.addEventListener('visibilitychange', refreshCurrentProfile);
    const profileRefreshInterval = window.setInterval(() => {
      void refreshCurrentProfile();
    }, 30_000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', refreshCurrentProfile);
      document.removeEventListener('visibilitychange', refreshCurrentProfile);
      window.clearInterval(profileRefreshInterval);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((previous) => {
      const next = previous === 'dark' ? 'light' : 'dark';
      Database.setTheme(next);
      return next;
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Unable to sign out:', error);
      return;
    }
    setCurrentUser(null);
    setPreviewRole(null);
    setCurrentScreen('get-started');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPreviewRole(null);
    setCurrentScreen(authenticatedHomeFor(user));
  };

  const handleSignUpSuccess = (user: User) => {
    setCurrentUser(user);
    setPreviewRole(null);
    setCurrentScreen(authenticatedHomeFor(user));
  };

  const handleUpdateCurrentUser = (updated: User) => {
    setCurrentUser(updated);
  };

  const handleNavigate = (screen: AppScreen) => {
    if (screen === 'dashboard' || screen === 'student-dashboard' || screen === 'servant-dashboard') {
      if (!currentUser) {
        setCurrentScreen('login');
        return;
      }
      if (currentUser.role === 'test' && !previewRole) {
        setCurrentScreen('test');
        return;
      }
      const targetRole = currentUser.role === 'test' && previewRole ? previewRole : currentUser.role;
      setCurrentScreen(targetRole === 'student' ? 'student-dashboard' : 'servant-dashboard');
      return;
    }
    if (screen === 'test') {
      if (currentUser?.role !== 'test') return;
      setPreviewRole(null);
      setCurrentScreen('test');
      return;
    }
    if (screen === 'supabase' && currentUser?.role !== 'head') return;
    if (screen === 'profile' && !currentUser) {
      setCurrentScreen('profile');
      return;
    }
    setCurrentScreen(screen);
  };

  const handlePreviewRoleSelection = (role: UserRole | null) => {
    if (currentUser?.role !== 'test') return;
    setPreviewRole(role);
    if (!role) {
      setCurrentScreen('test');
      return;
    }
    const previewUser: User = {
      ...currentUser,
      role,
      gradeLevel: role === 'student' || role === 'teacher'
        ? currentUser.gradeLevel ?? 'grade-1'
        : undefined,
    };
    setCurrentScreen(dashboardFor(previewUser));
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    const displayUser: User = currentUser.role === 'test' && previewRole ? {
      ...currentUser,
      role: previewRole,
      gradeLevel: previewRole === 'student' || previewRole === 'teacher'
        ? currentUser.gradeLevel ?? 'grade-1'
        : undefined,
    } : currentUser;
    if (displayUser.role === 'student') {
      return (
        <StudentDashboardScreen
          currentUser={displayUser}
          onUpdateUser={handleUpdateCurrentUser}
          theme={theme}
        />
      );
    }
    return (
      <ServantDashboardScreen
        currentUser={displayUser}
        onNavigate={handleNavigate}
        theme={theme}
      />
    );
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-clip transition-colors"
      style={{
        backgroundColor: theme === 'dark' ? '#141117' : '#FAF8F5',
        color: theme === 'dark' ? '#F5F1F0' : '#272329',
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="liquid-orb-burgundy absolute -right-24 -top-32 h-[32rem] w-[32rem] rounded-full bg-[#76243A]/20 blur-[110px] dark:bg-[#76243A]/28" />
        <div className="liquid-orb-gold absolute -left-32 top-1/3 h-[34rem] w-[34rem] rounded-full bg-[#C5A15A]/18 blur-[120px] dark:bg-[#D6B878]/16" />
        <div className="liquid-orb-amber absolute -bottom-24 right-1/4 h-[28rem] w-[28rem] rounded-full bg-[#9B324D]/14 blur-[100px] dark:bg-[#541424]/30" />
      </div>

      <div className="relative z-40">
        <NavigationTaskbar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={() => { void handleLogout(); }}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {currentUser?.role === 'test' && (
        <TestRoleSwitcher activeRole={previewRole} onSelect={handlePreviewRoleSelection} theme={theme} />
      )}

      <main className="relative z-10 min-w-0 flex-1 pb-28 md:pb-8">
        {!sessionReady ? (
          <div className="flex min-h-[55vh] items-center justify-center px-6 text-sm" style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
            جاري استعادة جلسة الدخول الآمنة...
          </div>
        ) : isPasswordRecovery ? (
          <PasswordRecoveryScreen theme={theme} onComplete={() => {
            setIsPasswordRecovery(false);
            setCurrentUser(null);
            setCurrentScreen('login');
            window.history.replaceState({}, '', window.location.pathname);
          }} />
        ) : (
          <>
            {currentScreen === 'get-started' && (
              <GetStartedScreen onNavigate={handleNavigate} currentUser={currentUser} theme={theme} />
            )}
            {currentScreen === 'login' && (
              <LoginScreen onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} theme={theme} />
            )}
            {currentScreen === 'signup' && (
              <SignUpScreen onSignUpSuccess={handleSignUpSuccess} onNavigate={handleNavigate} theme={theme} />
            )}
            {currentScreen === 'test' && currentUser?.role === 'test' && <TestDashboardScreen theme={theme} />}
            {currentScreen === 'profile' && (
              <ProfileScreen
                currentUser={currentUser}
                onUpdateCurrentUser={handleUpdateCurrentUser}
                onNavigate={handleNavigate}
                theme={theme}
              />
            )}
            {(currentScreen === 'dashboard' || currentScreen === 'student-dashboard' || currentScreen === 'servant-dashboard') && (
              previewRole ? (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-x-4 top-4 z-20 mx-auto max-w-2xl rounded-2xl border p-3 text-center text-xs font-bold shadow-lg" style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.45)' : '#DFC0CA', background: theme === 'dark' ? 'rgba(32,24,34,.95)' : 'rgba(255,255,255,.96)', color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}>
                    وضع معاينة للقراءة فقط — قاعدة البيانات ما زالت تتعامل مع حساب TEST الحقيقي
                  </div>
                  <div inert className="pointer-events-none select-none opacity-80" aria-label="معاينة واجهة للقراءة فقط">{renderDashboard()}</div>
                </div>
              ) : renderDashboard()
            )}
            {currentScreen === 'supabase' && currentUser?.role === 'head' && <SupabaseScreen theme={theme} />}
          </>
        )}
      </main>

      <footer
        className="relative z-10 hidden border-t px-4 py-8 text-xs transition-colors md:block sm:px-6 lg:px-8"
        style={{
          borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
          backgroundColor: theme === 'dark' ? '#211F25' : '#FFFFFF',
          color: theme === 'dark' ? '#B8B1BB' : '#77717A',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="شعار مَسِيري" className="h-5 w-5 rounded-md border object-cover" />
            <span className="font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>مَسِيري</span>
            <span>·</span>
            <span>منصة خدمة المرحلة الإعدادية الكنسية</span>
          </div>
          <span className="text-[11px]">«لاَ يَمْنَعْكَ صِبَاكَ مِنْ أَنْ تَكُونَ قُدْوَةً لِلْمُؤْمِنِينَ» (١ تيموثاوس ٤: ١٢)</span>
          <span className="text-[11px]">جميع الحقوق محفوظة</span>
        </div>
      </footer>
    </div>
  );
}
