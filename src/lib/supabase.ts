import { createClient } from '@supabase/supabase-js';

// User's provided Supabase Project Credentials
export const SUPABASE_URL = 'https://pduypklunvcsvabireuy.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdXlwa2x1bnZjc3ZhYmlyZXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTAzMzQsImV4cCI6MjEwNzE2NjMzNH0.5nNn5ltgOpOj3g5akdQerpXvHl1U6Ljz0xZI-lk1Leg';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Test live connection to the Supabase endpoint
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  hasTables: boolean;
}> {
  try {
    // Attempt to query the users table
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      // If code is 42P01, it means the connection succeeded but tables have not been created yet in SQL editor
      if (error.code === '42P01' || error.message.includes('relation "users" does not exist') || error.message.includes('404')) {
        return {
          connected: true,
          hasTables: false,
          message: 'تم الاتصال بمشروع Supabase بنجاح! الجداول تحتاج فقط لتشغيل سكربت الـ SQL في لوحة التحكم.',
        };
      }
      return {
        connected: true,
        hasTables: false,
        message: `تم الاتصال بمشروع Supabase: ${error.message}`,
      };
    }

    return {
      connected: true,
      hasTables: true,
      message: 'الاتصال نشط والجداول موجودة وتعمل بكفاءة في Supabase!',
    };
  } catch (err: any) {
    return {
      connected: false,
      hasTables: false,
      message: err?.message || 'تعذر الاتصال بـ Supabase، يرجى مراجعة إعدادات الشبكة والمفاتيح.',
    };
  }
}
