import { createClient } from '@supabase/supabase-js';

// Đọc biến môi trường Supabase từ Next.js.
// Cung cấp URL fallback hợp lệ định dạng để Next.js build không bị crash khi chưa có .env.local
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-publishable-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
