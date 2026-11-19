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

/**
 * Lưu lựa chọn cho sinh viên xem đáp án tham khảo sau khi nộp bài (migration 007).
 * `undefined` = giữ nguyên. Trả về cảnh báo thay vì làm hỏng việc lưu bài khi database chưa chạy migration 007.
 */
export async function saveReferenceAnswerVisibility(
  db: SupabaseClient,
  assignmentId: string,
  visible: boolean | undefined,
): Promise<string | undefined> {
  if (visible === undefined) return undefined;
  const { error } = await db.rpc('set_assignment_reference_visibility', {
    p_assignment_id: assignmentId,
    p_visible: visible,
  });
  if (!error) return undefined;
  reportDatabaseError('Unable to save reference answer visibility', error);
  return 'Đã lưu bài tập nhưng chưa lưu được tùy chọn hiển thị đáp án (cần chạy migration 007).';
}

/**
 * Lưu số lần làm tối đa (1–5) của bài tập (migration 009). Giảng viên đổi được cả khi bài đã công bố.
 * `undefined` = giữ nguyên. Trả về cảnh báo thay vì làm hỏng việc lưu bài khi database chưa chạy migration 009.
 */
export async function saveMaxAttempts(
  db: SupabaseClient,
  assignmentId: string,
  maxAttempts: number | undefined,
): Promise<string | undefined> {
  if (maxAttempts === undefined) return undefined;
  const { error } = await db.rpc('set_assignment_max_attempts', {
    p_assignment_id: assignmentId,
    p_max_attempts: maxAttempts,
  });
  if (!error) return undefined;
  reportDatabaseError('Unable to save attempt limit', error);
  return 'Đã lưu bài tập nhưng chưa lưu được số lần làm tối đa (cần chạy migration 009).';
}
