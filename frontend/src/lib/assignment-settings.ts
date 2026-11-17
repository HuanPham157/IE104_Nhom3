import type { SupabaseClient } from '@supabase/supabase-js';
import { reportDatabaseError } from '@/lib/oralcheck-api';

/**
 * Lưu thời lượng làm bài (phút) cho bản nháp qua RPC `set_assignment_duration` (migration 006).
 * `undefined` = client không gửi trường này, giữ nguyên. Trả về cảnh báo thay vì làm hỏng
 * việc lưu bài khi database chưa chạy seed.sql + migration 006.
 */
export async function saveAssignmentDuration(
  db: SupabaseClient,
  assignmentId: string,
  durationMinutes: number | null | undefined,
): Promise<string | undefined> {
  if (durationMinutes === undefined) return undefined;
  const { error } = await db.rpc('set_assignment_duration', {
    p_assignment_id: assignmentId,
    p_duration_minutes: durationMinutes,
  });
  if (!error) return undefined;
  reportDatabaseError('Unable to save assignment duration', error);
  return 'Đã lưu bài tập nhưng chưa lưu được thời lượng làm bài (cần chạy supabase/seed.sql và migration 006).';
}

/**
 * Lưu barem chấm chung của bài tập (migration 006). `undefined` = giữ nguyên, chuỗi rỗng = xóa.
 * Trả về cảnh báo thay vì làm hỏng việc lưu bài khi database chưa chạy seed.sql + migration 006.
 */
export async function saveGradingGuide(
  db: SupabaseClient,
  assignmentId: string,
  guideText: string | undefined,
): Promise<string | undefined> {
  if (guideText === undefined) return undefined;
  const { error } = await db.rpc('set_assignment_grading_guide', {
    p_assignment_id: assignmentId,
    p_guide_text: guideText,
  });
  if (!error) return undefined;
  reportDatabaseError('Unable to save grading guide', error);
  return 'Đã lưu bài tập nhưng chưa lưu được barem chấm (cần chạy supabase/seed.sql và migration 006).';
}
