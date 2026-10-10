import React, { useState, useEffect } from 'react';
import { supabase, fetchUserProfile } from './lib/supabase';
import type { User } from './types';
import { NavigationTaskbar, type AppScreen } from './components/NavigationTaskbar';
import { GetStartedScreen } from './screens/GetStartedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { StudentDashboardScreen } from './screens/StudentDashboardScreen';
import { ServantDashboardScreen } from './screens/ServantDashboardScreen';
import { SupabaseScreen } from './screens/SupabaseScreen';
import { Database } from './db/storage';

const dashboardFor = (user: User): AppScreen =>
  user.role === 'student' ? 'student-dashboard' : 'servant-dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('get-started');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => Database.getTheme());
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    Database.setTheme(theme);
  }, [theme]);

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
          setCurrentScreen(dashboardFor(profile));
        } else {
          // Re-route an open dashboard when a head changes this account's role.
          // RLS protects the data immediately; this refresh updates the visible UI too.
          setCurrentScreen((previousScreen) =>
            previousScreen === 'dashboard' ||
            previousScreen === 'student-dashboard' ||
            previousScreen === 'servant-dashboard'
              ? dashboardFor(profile)
              : previousScreen
          );
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
    setCurrentScreen('get-started');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentScreen(dashboardFor(user));
  };

  const handleSignUpSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentScreen(dashboardFor(user));
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
      setCurrentScreen(dashboardFor(currentUser));
      return;
    }
    if (screen === 'supabase' && currentUser?.role !== 'head') return;
    if (screen === 'profile' && !currentUser) {
      setCurrentScreen('profile');
      return;
    }
    setCurrentScreen(screen);
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    if (currentUser.role === 'student') {
      return (
        <StudentDashboardScreen
          currentUser={currentUser}
          onUpdateUser={handleUpdateCurrentUser}
          theme={theme}
        />
      );
    }
    return (
      <ServantDashboardScreen
        currentUser={currentUser}
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

      <main className="relative z-10 min-w-0 flex-1 pb-28 md:pb-8">
        {!sessionReady ? (
          <div className="flex min-h-[55vh] items-center justify-center px-6 text-sm" style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
            جاري استعادة جلسة الدخول الآمنة...
          </div>
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
            {currentScreen === 'profile' && (
              <ProfileScreen
                currentUser={currentUser}
                onUpdateCurrentUser={handleUpdateCurrentUser}
                onNavigate={handleNavigate}
                theme={theme}
              />
            )}
            {(currentScreen === 'dashboard' || currentScreen === 'student-dashboard' || currentScreen === 'servant-dashboard') && renderDashboard()}
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
