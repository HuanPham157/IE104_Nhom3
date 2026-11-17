import type { SupabaseClient } from '@supabase/supabase-js';
import { reportDatabaseError } from '@/lib/oralcheck-api';
import { gradingNotesForQuestion } from '@/lib/exam-text';

export type AiCriterion = { criterion_id: string; awarded_points: number; assessment: string; evidence_excerpt: string; explanation: string };
export type AiGradeOutcome = {
  saved: Record<string, unknown> | null;
  suggested_score: number;
  feedback_summary: string;
  criteria: AiCriterion[];
  needs_teacher_review: boolean;
  reference_answer: string;
};

/**
 * Gọi AI service chấm một câu trả lời đã được "claim" (status = processing) rồi lưu đánh giá.
 * `adminDb` phải là service client vì get_submission_grading_context / save_ai_evaluation chỉ cấp cho service_role.
 * Ném Error (thông điệp tiếng Việt) khi thất bại; bên gọi chịu trách nhiệm đánh dấu failed.
 */
export async function runAiGrading(
  adminDb: SupabaseClient,
  input: { studentId: string; submissionId: string; transcript: string; isEdited: boolean },
): Promise<AiGradeOutcome> {
  const { data: context, error: contextError } = await adminDb.rpc('get_submission_grading_context', {
    p_student_id: input.studentId, p_submission_id: input.submissionId,
  });
  if (contextError || !context) {
    if (contextError) reportDatabaseError('Unable to load restricted grading context', contextError);
    throw new Error('Không thể tải rubric để chấm bài');
  }

  const aiUrl = process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8001';
  const aiToken = process.env.AI_SERVICE_TOKEN;
  if (!aiToken) throw new Error('Thiếu AI_SERVICE_TOKEN trong frontend/.env.local');

  let response: Response;
  try {
    response = await fetch(`${aiUrl.replace(/\/$/, '')}/api/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AI-Service-Token': aiToken },
      body: JSON.stringify({
        question: context.question,
        reference_answer: context.reference_answer,
        max_score: context.max_score,
        transcript: input.transcript,
        criteria: context.criteria,
        grading_notes: gradingNotesForQuestion(context.grading_guide, Number(context.position)),
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error('Không kết nối được AI service. Kiểm tra AI_SERVICE_URL và bảo đảm dịch vụ đang chạy.');
  }
  const result = await response.json().catch(() => null) as Partial<AiGradeOutcome> & { detail?: string } | null;
  if (!response.ok || !result || !Array.isArray(result.criteria) || typeof result.suggested_score !== 'number') {
    throw new Error(result?.detail ?? 'Dịch vụ chấm AI không trả kết quả hợp lệ');
  }

  const { data: saved, error: saveError } = await adminDb.rpc('save_ai_evaluation', {
    p_student_id: input.studentId,
    p_submission_id: input.submissionId,
    p_transcript_text: input.transcript,
    p_engine_name: `whisper-${process.env.WHISPER_MODEL ?? 'base'}`,
    p_language_code: 'vi',
    p_model_name: process.env.OPENAI_GRADING_MODEL ?? 'gpt-4o-mini',
    p_suggested_score: result.suggested_score,
    p_feedback_summary: result.feedback_summary ?? '',
    p_criteria: result.criteria,
    p_is_transcript_edited: input.isEdited,
    p_needs_teacher_review: result.needs_teacher_review ?? true,
  });
  if (saveError) {
    reportDatabaseError('Unable to save AI evaluation', saveError);
    throw new Error('Không thể lưu kết quả chấm AI');
  }
  return {
    saved: saved as Record<string, unknown> | null,
    suggested_score: result.suggested_score,
    feedback_summary: result.feedback_summary ?? '',
    criteria: result.criteria,
    needs_teacher_review: result.needs_teacher_review ?? true,
    reference_answer: String(context.reference_answer ?? ''),
  };
}
