import type { SupabaseClient } from '@supabase/supabase-js';
import { reportDatabaseError } from '@/lib/oralcheck-api';

export const AUDIO_BUCKET = 'oral-answers';
// 30 phút: đủ cho giảng viên nghe và chấm cả bài; hết hạn thì AudioPlayer tự xin liên kết mới.
const SIGNED_URL_TTL_SECONDS = 1800;

/**
 * Tạo signed URL ngắn hạn cho nhiều tệp audio trong bucket private.
 * Dùng client đã xác thực của người gọi để storage RLS vẫn được áp dụng.
 * Trả về Map path → URL; path không ký được sẽ bị bỏ qua thay vì làm hỏng cả yêu cầu.
 */
export async function signAudioPaths(db: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const { data, error } = await db.storage.from(AUDIO_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) {
    reportDatabaseError('Unable to sign audio URLs', error);
    return result;
  }
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) result.set(item.path, item.signedUrl);
  }
  return result;
}
