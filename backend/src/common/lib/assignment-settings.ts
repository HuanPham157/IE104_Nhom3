import type { SupabaseClient } from '@supabase/supabase-js';
import { reportDatabaseError } from '../http/validation';

/**
 * Lưu thời lượng làm bài (phút) cho bản nháp qua RPC `set_assignment_duration`.
 * `undefined` = client không gửi trường này, giữ nguyên. Trả về cảnh báo thay vì làm hỏng
 * việc lưu bài khi database chưa có RPC tương ứng (07_assignments.sql).
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
  return 'Đã lưu bài tập nhưng chưa lưu được thời lượng làm bài (cần chạy 07_assignments.sql).';
}

/**
 * Lưu barem chấm chung của bài tập. `undefined` = giữ nguyên, chuỗi rỗng = xóa.
 * Trả về cảnh báo thay vì làm hỏng việc lưu bài khi database chưa có RPC tương ứng (07_assignments.sql).
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
  return 'Đã lưu bài tập nhưng chưa lưu được barem chấm (cần chạy 07_assignments.sql).';
}

/**
 * Lưu lựa chọn cho sinh viên xem đáp án tham khảo sau khi nộp bài.
 * `undefined` = giữ nguyên. Trả về cảnh báo thay vì làm hỏng việc lưu bài khi database chưa có RPC tương ứng (07_assignments.sql).
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
  return 'Đã lưu bài tập nhưng chưa lưu được tùy chọn hiển thị đáp án (cần chạy 07_assignments.sql).';
}

/**
 * Lưu số lần làm tối đa (1–5) của bài tập. Giảng viên đổi được cả khi bài đã công bố.
 * `undefined` = giữ nguyên. Trả về cảnh báo thay vì làm hỏng việc lưu bài khi database chưa có RPC tương ứng (07_assignments.sql).
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
  return 'Đã lưu bài tập nhưng chưa lưu được số lần làm tối đa (cần chạy 07_assignments.sql).';
}
