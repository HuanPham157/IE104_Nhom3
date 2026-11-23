import type { SupabaseClient } from '@supabase/supabase-js';

/** Vai trò chuẩn lấy từ public.users.role. */
export type AppRole = 'student' | 'lecturer' | 'admin';

export type AuthContext = {
  userId: string;
  email: string | null;
  role: AppRole;
  /** Client Supabase mang JWT của người gọi (RLS vẫn áp dụng). */
  db: SupabaseClient;
};

declare module 'express' {
  interface Request {
    auth?: AuthContext;
  }
}
