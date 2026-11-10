import { supabase } from '@/lib/supabase-browser';

export async function oralcheckFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer ' + session.access_token);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => null) as T & { error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? 'Không thể hoàn tất yêu cầu.');
  if (!result) throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  return result;
}
