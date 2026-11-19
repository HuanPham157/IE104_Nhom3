import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';
import { createServiceClient } from '@/services/supabase/server';
import { runAiGrading } from '@/lib/ai-grading';

const idSchema = z.string().uuid();
const requestSchema = z.object({
  transcript: z.string().trim().min(1).max(50000),
  is_edited: z.boolean().default(false),
}).strict();
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Chỉ trả đáp án tham khảo khi lượt làm bài đã nộp và giảng viên cho phép (migration 007).
 * Lỗi truy vấn (ví dụ chưa có cột) được coi là ẩn đáp án.
 */
async function visibleReferenceAnswer(db: SupabaseClient, attemptId: string, referenceAnswer: string) {
  const { data: attempt, error: attemptError } = await db
    .from('assignment_submissions')
    .select('status,assignment_id')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError || !attempt || attempt.status === 'in_progress') return null;
  const { data: assignment, error: assignmentError } = await db
    .from('assignments')
    .select('show_reference_answer')
    .eq('id', attempt.assignment_id)
    .maybeSingle();
  if (assignmentError) reportDatabaseError('Unable to load reference answer visibility', assignmentError);
  return assignment?.show_reference_answer && referenceAnswer.trim() ? referenceAnswer : null;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiJson({ error: 'ID câu trả lời không hợp lệ' }, 400);
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return apiJson({ error: 'Transcript không hợp lệ' }, 400);

  const { data: answer, error: answerError } = await auth.value.db
    .from('submissions')
    .select('id,student_id,status,is_final,assignment_submission_id')
    .eq('id', id).eq('student_id', auth.value.user.id).maybeSingle();
  if (answerError || !answer) {
    if (answerError) reportDatabaseError('Unable to load answer for grading', answerError);
    return apiJson({ error: 'Không tìm thấy bài làm' }, answerError ? 500 : 404);
  }
  if (!answer.is_final || !['queued', 'processing', 'failed'].includes(answer.status)) {
    return apiJson({ error: 'Bài làm chưa có transcript hoặc không ở trạng thái chấm điểm' }, 409);
  }
  if (['queued', 'failed', 'processing'].includes(answer.status)) {
    const { data: claimed, error: claimError } = await auth.value.db.rpc('claim_submission_for_ai', { p_submission_id: id });
    if (claimError || !claimed) {
      if (claimError) reportDatabaseError('Unable to reclaim answer for AI grading', claimError);
      return apiJson({ error: 'Không thể thử chấm lại bài làm' }, 409);
    }
  }

  let adminDb;
  try {
    adminDb = createServiceClient();
  } catch (error) {
    console.error('Supabase service client unavailable', error instanceof Error ? error.name : 'unknown');
    return apiJson({ error: 'Máy chủ chưa cấu hình lưu trữ kết quả AI' }, 503);
  }
  try {
    const outcome = await runAiGrading(adminDb, {
      studentId: auth.value.user.id,
      submissionId: id,
      transcript: parsed.data.transcript,
      isEdited: parsed.data.is_edited,
    });
    const referenceAnswer = await visibleReferenceAnswer(auth.value.db, answer.assignment_submission_id, outcome.reference_answer);
    return apiJson({ data: { ...outcome.saved, ...outcome, saved: undefined, reference_answer: referenceAnswer } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'AI grading failed';
    await auth.value.db.rpc('fail_submission_ai_processing', { p_submission_id: id, p_error_message: reason });
    console.error('AI grading failed:', reason);
    return apiJson({ error: `Không thể chấm bài bằng AI: ${reason}` }, 502);
  }
}
