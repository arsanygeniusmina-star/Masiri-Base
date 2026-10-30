/**
 * Small client-only preferences and display content.
 *
 * Authenticated account data, roles, teacher approvals, daily tasks, completions,
 * points and prayer requests are stored in Supabase, not in browser localStorage.
 * Achievement persistence will be added when the database has a dedicated badges table.
 */
import type { AchievementBadge, MemoryVerse } from '../types';

const THEME_KEY = 'maseery_theme';

export const CURRENT_WEEK_VERSE: MemoryVerse = {
  id: 'verse-week-1',
  verseText: '«أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَلٍ»',
  reference: 'إنجيل متى ٥ : ١٤',
  weekTitle: 'الأسبوع الثاني - أنتم نور العالم',
  meaning: 'يدعونا السيد المسيح في مرحلة إعدادي أن نكون قدوة حسنة في المدرسة والبيت، فنشهد لاسم المسيح بأخلاقنا ومحبتنا الصادقة.',
};

const BADGE_DEFINITIONS: AchievementBadge[] = [
  {
    id: 'b-1',
    title: 'مواظب الأجبية',
    description: 'شارة لمواظبة صلاة الأجبية على مدار عدة أيام',
    iconName: 'book-open',
    isUnlocked: false,
    category: 'spiritual',
  },
  {
    id: 'b-2',
    title: 'حارس الإنجيل',
    description: 'شارة لحفظ آيات الكتاب المقدس الأسبوعية',
    iconName: 'scroll',
    isUnlocked: false,
    category: 'study',
  },
  {
    id: 'b-3',
    title: 'قلب نقي',
    description: 'شارة للنمو الروحي والاستمرار في الممارسات الكنسية',
    iconName: 'cross',
    isUnlocked: false,
    category: 'spiritual',
  },
  {
    id: 'b-4',
    title: 'نجم الحضور الذهبي',
    description: 'شارة للمواظبة على حضور مدارس الأحد',
    iconName: 'award',
    isUnlocked: false,
    category: 'attendance',
  },
  {
    id: 'b-5',
    title: 'سفير المحبة',
    description: 'شارة لأعمال المحبة والخدمة',
    iconName: 'heart',
    isUnlocked: false,
    category: 'spiritual',
  },
];

export const Database = {
  getTheme(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Storage may be unavailable in privacy mode; use the system preference instead.
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  setTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The appearance still updates for the current app session if storage is unavailable.
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  getBadges(): AchievementBadge[] {
    // Until achievements are persisted by the database, never show invented unlocked progress.
    return BADGE_DEFINITIONS.map((badge) => ({ ...badge }));
  },
};
