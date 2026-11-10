import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

type AuthResult =
  | { ok: true; db: SupabaseClient; user: User }
  | { ok: false; status: 401 | 503; error: string };

export async function authRequest(request: Request): Promise<AuthResult> {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1].trim();
  if (!token) return { ok: false, status: 401, error: 'Chưa đăng nhập' };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, status: 503, error: 'Máy chủ chưa được cấu hình Supabase' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return { ok: false, status: 503, error: 'Cấu hình Supabase không hợp lệ' };
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { ok: false, status: 503, error: 'Cấu hình Supabase không hợp lệ' };
  }

  const db = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' };
  }

  return { ok: true, db, user: data.user };
}

export async function getProfileRole(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('users')
    .select('role,account_status')
    .eq('id', userId)
    .maybeSingle();

  const role = data?.account_status === 'active'
    ? data.role === 'lecturer'
      ? 'teacher'
      : data.role
    : null;
  return { role, error };
}
