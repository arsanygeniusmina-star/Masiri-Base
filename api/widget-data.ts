/**
 * Widget Data API Endpoint
 * 
 * Returns clean, minimal JSON data for home screen widgets.
 * Designed for fast loading with minimal auth overhead.
 * 
 * Usage: GET /api/widget-data?userId=<uuid>
 * 
 * Security: Uses Supabase anon key (public, safe for frontend).
 * RLS on all tables ensures users only see their own data.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://pduypklunvcsvabireuy.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_GuDGhPahvHnP5-0V6rnzRQ_hJzrUcHL';

type WidgetData = {
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'head' | 'test';
  streakDays: number;
  points: number;
  gradeLevel: string | null;
  todayReading: {
    reference: string;
    completed: boolean;
    assignmentId: string | null;
  };
  pendingTasks: number;
  updatedAt: string;
};

export default async function handler(
  req: { method?: string; query: Record<string, string> },
  res: {
    status: (code: number) => { json: (body: any) => void };
    setHeader: (key: string, value: string) => void;
    json: (body: any) => void;
  }
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Use anon key - public, safe for frontend. RLS enforces row-level security.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch user profile (RLS ensures only own data is accessible)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, streak_days, points, grade_level')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch today's reading assignment
    const today = new Date().toISOString().split('T')[0];
    const { data: assignments } = await supabase
      .from('reading_assignments')
      .select(
        'id, passage:bible_passages(reference_ar), scheduled_date, status'
      )
      .eq('scheduled_date', today)
      .eq('status', 'published')
      .limit(1);

    const todayReading = assignments?.[0];
    const passageData = todayReading?.passage as any;
    const reference =
      passageData?.reference_ar || 'غير محدد';

    // Check if today's reading is completed
    const { data: completions } = await supabase
      .from('reading_completions')
      .select('id')
      .eq('student_id', userId)
      .eq('assignment_id', todayReading?.id || '')
      .maybeSingle();

    // Count pending daily tasks for today
    const { data: tasks } = await supabase
      .from('student_daily_logs')
      .select('completed')
      .eq('student_id', userId)
      .eq('date', today);

    const pendingTasks = tasks
      ? tasks.filter((t: any) => !t.completed).length
      : 0;

    const payload: WidgetData = {
      userId: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      role: user.role as 'student' | 'teacher' | 'head' | 'test',
      streakDays: Number(user.streak_days || 0),
      points: Number(user.points || 0),
      gradeLevel: user.grade_level,
      todayReading: {
        reference,
        completed: !!completions,
        assignmentId: todayReading?.id || null,
      },
      pendingTasks,
      updatedAt: new Date().toISOString(),
    };

    // Cache for 5 minutes - widget data doesn't need real-time freshness
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('Widget data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
