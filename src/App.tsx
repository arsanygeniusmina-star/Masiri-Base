/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database } from './db/storage';
import { User } from './types';
import { NavigationTaskbar, AppScreen } from './components/NavigationTaskbar';
import { GetStartedScreen } from './screens/GetStartedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { ProfileScreen } from './screens/ProfileScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => Database.getCurrentUser());
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('get-started');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => Database.getTheme());

  // Initialize theme class on root
  useEffect(() => {
    Database.setTheme(theme);
  }, [theme]);

  // Purge lingering users except head, ensuring clean sign up requirement
  useEffect(() => {
    const hasPurged = localStorage.getItem('maseery_purged_v3');
    if (!hasPurged) {
      Database.purgeAllUsersExceptHeadAndRequireSignUp();
      setCurrentUser(null);
      localStorage.setItem('maseery_purged_v3', 'true');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    Database.setTheme(next);
  };

  const handleLogout = () => {
    Database.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentScreen('get-started');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentScreen('profile');
  };

  const handleSignUpSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentScreen('profile');
  };

  const handleNavigate = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden transition-colors selection:bg-[#F3E7EB] dark:selection:bg-[#38232C] selection:text-[#76243A] dark:selection:text-[#F3DEAB]"
      style={{
        backgroundColor: theme === 'dark' ? '#141117' : '#FAF8F5',
        color: theme === 'dark' ? '#F5F1F0' : '#272329',
      }}
    >
      {/* Super Liquid Glassmorphism Ambient Light Orbs (Deep Church Burgundy & Radiant Gold) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Floating Orb 1: Church Burgundy */}
        <div className="absolute -top-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-[#76243A]/22 dark:bg-[#76243A]/30 blur-[110px] liquid-orb-burgundy" />
        {/* Floating Orb 2: Radiant Church Gold */}
        <div className="absolute top-1/3 -left-32 w-[34rem] h-[34rem] rounded-full bg-[#C5A15A]/20 dark:bg-[#D6B878]/18 blur-[120px] liquid-orb-gold" />
        {/* Floating Orb 3: Deep Warm Rose/Amber */}
        <div className="absolute -bottom-24 right-1/4 w-[28rem] h-[28rem] rounded-full bg-[#9B324D]/18 dark:bg-[#541424]/35 blur-[100px] liquid-orb-amber" />
        {/* Subtle Liquid Caustic Sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent dark:via-white/[0.01]" />
      </div>

      {/* 1. Horizontal Taskbar Navigation (Only Welcome, Login, Signup, Profile) */}
      <div className="relative z-40">
        <NavigationTaskbar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* 2. Main Content Screens (Strictly 4 screens: Welcome, Login, SignUp, Profile) */}
      <main className="flex-1 pb-16 relative z-10">
        {currentScreen === 'get-started' && (
          <GetStartedScreen
            onNavigate={handleNavigate}
            currentUser={currentUser}
            theme={theme}
          />
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigate={handleNavigate}
            theme={theme}
          />
        )}

        {currentScreen === 'signup' && (
          <SignUpScreen
            onSignUpSuccess={handleSignUpSuccess}
            onNavigate={handleNavigate}
            theme={theme}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
            onNavigate={handleNavigate}
            theme={theme}
          />
        )}
      </main>

      {/* 3. Quiet, Refined Ecclesiastical Footer */}
      <footer
        className="border-t py-8 px-4 sm:px-6 lg:px-8 text-xs transition-colors"
        style={{
          borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
          backgroundColor: theme === 'dark' ? '#211F25' : '#FFFFFF',
          color: theme === 'dark' ? '#B8B1BB' : '#77717A',
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <img
              src="/src/assets/images/maseery_app_logo_1791622420580.jpg"
              alt="شعار مَسِيري"
              className="w-5 h-5 rounded-md object-cover border"
              style={{ borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.4)' : 'rgba(118, 36, 58, 0.25)' }}
            />
            <span className="font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              مَسِيري
            </span>
            <span>·</span>
            <span>منصة خدمة المرحلة الإعدادية الكنسية</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>«لاَ يَمْنَعْكَ صِبَاكَ مِنْ أَنْ تَكُونَ قُدْوَةً لِلْمُؤْمِنِينَ» (١ تيموثاوس ٤ : ١٢)</span>
          </div>

          <div className="text-[11px]">
            <span>جاهز للربط مع Supabase · جميع الحقوق محفوظة</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
