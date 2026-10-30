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
import { MyReadingsScreen } from './screens/MyReadingsScreen';
import { BibleStudyScreen } from './screens/BibleStudyScreen';
import { RankingScreen } from './screens/RankingScreen';
import { ComingSoon } from './components/ComingSoon';
import { TestRoleSwitcher } from './components/TestRoleSwitcher';
import { JourneyTransition } from './components/JourneyTransition';
import { LogoBackdrop } from './components/LogoBackdrop';
import { useReadingStreak } from './lib/useReadingStreak';
import { PermissionsOnboarding, shouldShowPermissionsOnboarding } from './components/PermissionsOnboarding';
import { startTestRuntimeLogCapture } from './lib/testRuntimeLogs';

const dashboardFor = (user: User): AppScreen =>
  user.role === 'student' ? 'student-dashboard' : 'servant-dashboard';

// Students land on «إصحاح النهارده», servants on «الترتيب».
const authenticatedHomeFor = (user: User): AppScreen =>
  user.role === 'test' ? 'test' : user.role === 'student' ? 'my-readings' : 'ranking';

/**
 * Pages that are not open yet: they show only the blurred background with
 * "Coming Soon". Remove a screen from this list to open it again.
 */
const COMING_SOON_SCREENS: AppScreen[] = ['get-started', 'dashboard', 'student-dashboard', 'servant-dashboard'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [previewProfile, setPreviewProfile] = useState<Partial<User> | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('get-started');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => window.location.search.includes('password-reset=1'));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => Database.getTheme());
  const [sessionReady, setSessionReady] = useState(false);
  const [journeyTransitionUser, setJourneyTransitionUser] = useState<User | null>(null);
  const [journeyDestination, setJourneyDestination] = useState<AppScreen | null>(null);
  // First launch of the installed app: ask for notifications + camera.
  const [showPermissions, setShowPermissions] = useState(() => shouldShowPermissionsOnboarding());

  useEffect(() => {
    Database.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!journeyTransitionUser) return;

    const destination = journeyDestination ?? authenticatedHomeFor(journeyTransitionUser);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrentScreen(destination);
      setJourneyTransitionUser(null);
      setJourneyDestination(null);
      return;
    }

    const transitionTimer = window.setTimeout(() => {
      setCurrentScreen(destination);
      setJourneyTransitionUser(null);
      setJourneyDestination(null);
    }, 1750);

    return () => window.clearTimeout(transitionTimer);
  }, [journeyTransitionUser, journeyDestination]);

  useEffect(() => {
    if (currentUser?.role === 'test') startTestRuntimeLogCapture();
  }, [currentUser?.role]);

  // If the session ends (sign-out elsewhere or an expired login) while a signed-in
  // page is open, show the login page instead of an empty screen.
  useEffect(() => {
    if (!sessionReady || currentUser) return;
    const signedInOnly: AppScreen[] = ['dashboard', 'student-dashboard', 'servant-dashboard', 'my-readings', 'bible-study', 'ranking', 'test', 'supabase'];
    // The home page is "Coming Soon" for now, so signed-out visitors start at login.
    if (signedInOnly.includes(currentScreen) || currentScreen === 'get-started') setCurrentScreen('login');
  }, [sessionReady, currentUser, currentScreen]);

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
          let animateAfterOAuth = false;
          try {
            animateAfterOAuth = window.sessionStorage.getItem('masiri.auth-transition-after-oauth') === '1';
            if (animateAfterOAuth) window.sessionStorage.removeItem('masiri.auth-transition-after-oauth');
          } catch {
            // Storage may be unavailable in restricted browser contexts; normal navigation still works.
          }
          if (animateAfterOAuth) {
            setJourneyDestination(authenticatedHomeFor(profile));
            setJourneyTransitionUser(profile);
          } else {
            setCurrentScreen(authenticatedHomeFor(profile));
          }
        } else {
          // Keep TEST role previews stable while auth hydration confirms the real TEST account.
          // For normal accounts, reflect role/grade changes in the open dashboard.
          setCurrentScreen((previousScreen) => {
            if (profile.role === 'test') return previousScreen;
            // Leave reading screens that the refreshed role may no longer open.
            if (previousScreen === 'my-readings' && profile.role !== 'student') return dashboardFor(profile);
            if (previousScreen === 'bible-study' && profile.role !== 'teacher' && profile.role !== 'head') return dashboardFor(profile);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer the profile query until Supabase has released its internal auth lock.
      // The explicit login/signup handlers start the visual journey only after the
      // credential check and profile lookup have both succeeded.
      if (event === 'SIGNED_OUT') {
        try {
          window.sessionStorage.removeItem('masiri.auth-transition-after-oauth');
        } catch {
          // Ignore storage restrictions during sign-out.
        }
      }
      window.setTimeout(() => {
        void hydrateSession(session?.user.id ?? null, false);
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
    setPreviewProfile(null);
    setCurrentScreen('get-started');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPreviewRole(null);
    setPreviewProfile(null);
    setJourneyDestination(authenticatedHomeFor(user));
    setJourneyTransitionUser(user);
  };

  const handleSignUpSuccess = (user: User) => {
    setCurrentUser(user);
    setPreviewRole(null);
    setPreviewProfile(null);
    setJourneyDestination(authenticatedHomeFor(user));
    setJourneyTransitionUser(user);
  };

  const handleUpdateCurrentUser = (updated: User) => {
    if (currentUser?.role === 'test' && previewRole) {
      // Preview edits remain local and never overwrite the authenticated TEST profile.
      setPreviewProfile({ ...updated, role: previewRole });
      return;
    }
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
    if (screen === 'my-readings' || screen === 'bible-study') {
      if (!currentUser) {
        setCurrentScreen('login');
        return;
      }
      const effectiveRole = currentUser.role === 'test' && previewRole ? previewRole : currentUser.role;
      const allowed = screen === 'my-readings'
        ? effectiveRole === 'student'
        : effectiveRole === 'teacher' || effectiveRole === 'head';
      if (!allowed) return;
    }
    if (screen === 'ranking' && !currentUser) {
      setCurrentScreen('login');
      return;
    }
    if (screen === 'profile' && !currentUser) {
      setCurrentScreen('profile');
      return;
    }
    setCurrentScreen(screen);
  };

  const handlePreviewRoleSelection = (role: UserRole | null) => {
    if (currentUser?.role !== 'test') return;
    setPreviewRole(role);
    setPreviewProfile(null);
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

  const simulationMode = currentUser?.role === 'test' && Boolean(previewRole);
  const displayUser: User | null = currentUser?.role === 'test' && previewRole
    ? {
        ...currentUser,
        ...(previewProfile ?? {}),
        role: previewRole,
        gradeLevel: previewRole === 'student' || previewRole === 'teacher'
          ? previewProfile?.gradeLevel ?? currentUser.gradeLevel ?? 'grade-1'
          : undefined,
      }
    : currentUser;

  // Restore flow: opens the earliest missed (still restorable) reading, then the next…
  const [restoreMode, setRestoreMode] = useState(false);
  const startRestore = () => {
    setRestoreMode(true);
    handleNavigate('my-readings');
  };

  // Reading Streak shown next to the student's name in the top bar on every page.
  const topBarStreak = useReadingStreak(displayUser?.id, displayUser?.role === 'student', simulationMode, displayUser?.streakDays ?? 0);

  const renderDashboard = () => {
    if (!displayUser || !currentUser) return null;
    if (displayUser.role === 'student') {
      return (
        <StudentDashboardScreen
          currentUser={displayUser}
          onUpdateUser={handleUpdateCurrentUser}
          onOpenReadings={() => handleNavigate('my-readings')}
          theme={theme}
          simulationMode={currentUser.role === 'test' && Boolean(previewRole)}
        />
      );
    }
    return (
      <ServantDashboardScreen
        currentUser={displayUser}
        onNavigate={handleNavigate}
        theme={theme}
        simulationMode={currentUser.role === 'test' && Boolean(previewRole)}
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
      {/* App-wide background: the logo scene (same on every page). */}
      <LogoBackdrop theme={theme} />

      <div className="relative z-40">
        <NavigationTaskbar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          currentUser={displayUser}
          simulationMode={simulationMode}
          onLogout={() => { void handleLogout(); }}
          theme={theme}
          onToggleTheme={toggleTheme}
          streak={topBarStreak}
          onRestore={startRestore}
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
            {COMING_SOON_SCREENS.includes(currentScreen) && currentUser?.role !== 'test' ? (
              <ComingSoon theme={theme} />
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
                currentUser={displayUser}
                onUpdateCurrentUser={handleUpdateCurrentUser}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                theme={theme}
                simulationMode={simulationMode}
              />
            )}
            {(currentScreen === 'dashboard' || currentScreen === 'student-dashboard' || currentScreen === 'servant-dashboard') && (
              previewRole ? (
                <div className="relative">
                  <div className="relative z-20 mx-4 mt-4 rounded-2xl border p-3 text-center text-xs font-bold shadow-lg" role="status" style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.45)' : '#DFC0CA', background: theme === 'dark' ? 'rgba(32,24,34,.95)' : 'rgba(255,255,255,.96)', color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}>
                    وضع تجربة تفاعلي — جرّب الأزرار براحتك. أي تغييرات هنا تجريبية ومش بتأثر على أي حساب أو بيانات حقيقية.
                  </div>
                  {renderDashboard()}
                </div>
              ) : renderDashboard()
            )}
            {currentScreen === 'supabase' && currentUser?.role === 'head' && <SupabaseScreen theme={theme} />}
            {currentScreen === 'my-readings' && displayUser?.role === 'student' && (
              <MyReadingsScreen
                currentUser={displayUser}
                theme={theme}
                simulationMode={simulationMode}
                restoreMode={restoreMode}
                onRestoreDone={() => setRestoreMode(false)}
              />
            )}
            {currentScreen === 'bible-study' && displayUser && (displayUser.role === 'teacher' || displayUser.role === 'head') && (
              <BibleStudyScreen currentUser={displayUser} theme={theme} simulationMode={simulationMode} />
            )}
            </>
            )}
            {currentScreen === 'ranking' && displayUser && displayUser.role !== 'test' && (
              <RankingScreen currentUser={displayUser} theme={theme} simulationMode={simulationMode} />
            )}
          </>
        )}
      </main>

      <footer
        className="relative z-10 border-t px-4 py-6 text-xs transition-colors sm:px-6 lg:px-8"
        style={{
          borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
          backgroundColor: theme === 'dark' ? '#211F25' : '#FFFFFF',
          color: theme === 'dark' ? '#B8B1BB' : '#77717A',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
          {/* Brand block: same look as the top bar (logo + THE APOSTLES + tagline) */}
          <div className="flex items-center gap-2.5">
            <span
              className="block h-12 w-12 shrink-0 overflow-hidden rounded-xl border"
              style={{
                borderColor: theme === 'dark' ? 'rgba(214,184,120,.45)' : 'rgba(118,36,58,.22)',
                boxShadow: theme === 'dark' ? '0 0 14px rgba(214,184,120,.14)' : '0 3px 12px rgba(118,36,58,.12)',
              }}
            >
              <img src="/logo-family.jpg?v=20261010-1" alt="شعار أسرة الرسل" className="h-full w-full object-cover" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight text-right">
              <span
                dir="ltr"
                lang="en"
                className="whitespace-nowrap text-xl uppercase"
                style={{
                  color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                  fontFamily: "'Cinzel', 'Times New Roman', serif",
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textAlign: 'right',
                }}
              >
                THE APOSTLES
              </span>
              <span className="text-[10px] font-semibold" style={{ color: theme === 'dark' ? '#D6B878' : '#77717A' }}>أسرة الرسل · مشوارك مع ربنا</span>
            </span>
          </div>
          <span className="text-[11px]">«لاَ يَمْنَعْكَ صِبَاكَ مِنْ أَنْ تَكُونَ قُدْوَةً لِلْمُؤْمِنِينَ» (١ تيموثاوس ٤: ١٢)</span>
          <img
            src={theme === 'dark' ? '/logo-church-dark.png?v=20261010-2' : '/logo-church-light.svg?v=20261010-4'}
            alt="شعار الكنيسة"
            className="h-auto w-[170px] max-w-full object-contain"
            style={{
              filter: theme === 'dark' ? 'contrast(1.1) brightness(1.12)' : 'none',
            }}
          />
          <span className="text-[11px]">جميع الحقوق محفوظة</span>
        </div>
      </footer>
      {journeyTransitionUser && <JourneyTransition theme={theme} />}
      {showPermissions && <PermissionsOnboarding theme={theme} onDone={() => setShowPermissions(false)} />}
    </div>
  );
}
