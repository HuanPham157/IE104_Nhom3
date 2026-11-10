import type { SupabaseClient, User } from '@supabase/supabase-js';
import { authRequest } from '@/lib/auth-request';

export type AppRole = 'student' | 'lecturer' | 'admin';

type AuthenticatedUser = {
  db: SupabaseClient;
  user: User;
  role: AppRole;
};

type AuthenticationResult =
  | { ok: true; value: AuthenticatedUser }
  | { ok: false; response: Response };

export const apiJson = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export async function authenticateRole(
  request: Request,
  allowedRoles?: readonly AppRole[],
): Promise<AuthenticationResult> {
  const auth = await authRequest(request);
  if (!auth.ok) {
    return { ok: false, response: apiJson({ error: auth.error }, auth.status) };
  }

  const { data: profile, error } = await auth.db
    .from('users')
    .select('role,account_status')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    console.error('Unable to load authenticated user profile', error.code);
    return {
      ok: false,
      response: apiJson({ error: 'Không thể xác minh hồ sơ người dùng' }, 500),
    };
  }

  if (
    !profile ||
    profile.account_status !== 'active' ||
    !['student', 'lecturer', 'admin'].includes(profile.role)
  ) {
    return {
      ok: false,
      response: apiJson({ error: 'Tài khoản chưa có hồ sơ hoặc đã bị vô hiệu hóa' }, 403),
    };
  }

  const role = profile.role as AppRole;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      ok: false,
      response: apiJson({ error: 'Bạn không có quyền thực hiện thao tác này' }, 403),
    };
  }

  return { ok: true, value: { db: auth.db, user: auth.user, role } };
}

export function reportDatabaseError(context: string, error: { code?: string; message?: string }) {
  console.error(context, { code: error.code, message: error.message });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
