import { z } from 'zod';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';
import { createServiceClient } from '@/services/supabase/server';
import { runAiGrading } from '@/lib/ai-grading';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

/** Giảng viên yêu cầu AI chấm một câu trả lời đã nộp nhưng chưa có đánh giá AI (dùng transcript mới nhất). */
export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiJson({ error: 'ID câu trả lời không hợp lệ' }, 400);

  const { data: transcripts, error: transcriptError } = await auth.value.db
    .from('transcriptions')
    .select('transcript_text,is_edited')
    .eq('submission_id', id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (transcriptError) {
    reportDatabaseError('Unable to load transcript for lecturer AI grading', transcriptError);
    return apiJson({ error: 'Không thể tải transcript' }, 500);
  }
  const transcript = transcripts[0];
  if (!transcript?.transcript_text?.trim()) {
    return apiJson({ error: 'Câu trả lời chưa có transcript nên AI không chấm được. Hãy chấm thủ công.' }, 409);
  }

  const { data: studentId, error: claimError } = await auth.value.db.rpc('claim_submission_for_lecturer_ai', { p_submission_id: id });
  if (claimError || !studentId) {
    if (claimError) reportDatabaseError('Unable to claim answer for lecturer AI grading', claimError);
    if (claimError?.code === 'PGRST202') return apiJson({ error: 'Máy chủ chưa chạy supabase/seed.sql và migration 006 để giảng viên chấm AI.' }, 503);
    return apiJson({ error: 'Câu trả lời đang được chấm, đã công bố điểm hoặc sinh viên chưa nộp bài.' }, 409);
  }

  let adminDb;
  try {
    adminDb = createServiceClient();
  } catch {
    await auth.value.db.rpc('fail_lecturer_ai_processing', { p_submission_id: id, p_error_message: 'Service client unavailable' });
    return apiJson({ error: 'Máy chủ chưa cấu hình SUPABASE_SECRET_KEY để lưu kết quả AI' }, 503);
  }

  try {
    const outcome = await runAiGrading(adminDb, {
      studentId: String(studentId),
      submissionId: id,
      transcript: transcript.transcript_text,
      isEdited: Boolean(transcript.is_edited),
    });
    return apiJson({ data: { suggested_score: outcome.suggested_score, feedback_summary: outcome.feedback_summary, criteria: outcome.criteria, needs_teacher_review: outcome.needs_teacher_review } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'AI grading failed';
    await auth.value.db.rpc('fail_lecturer_ai_processing', { p_submission_id: id, p_error_message: reason });
    console.error('Lecturer AI grading failed:', reason);
    return apiJson({ error: `Không thể chấm bằng AI: ${reason}` }, 502);
  }
}
