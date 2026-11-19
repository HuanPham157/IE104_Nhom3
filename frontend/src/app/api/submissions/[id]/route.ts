import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID câu trả lời không hợp lệ' }, 400);
  }

  const { data: answer, error: answerError } = await auth.value.db
    .from('submissions')
    .select('id,assignment_submission_id,question_id,student_id,audio_storage_path,audio_mime_type,audio_duration_seconds,audio_size_bytes,attempt_number,status,submitted_at')
    .eq('id', id)
    .maybeSingle();

  if (answerError) {
    reportDatabaseError('Unable to load answer', answerError);
    return apiJson({ error: 'Không thể tải bài làm' }, 500);
  }
  if (!answer) return apiJson({ error: 'Không tìm thấy câu trả lời' }, 404);

  const [
    { data: attempt, error: attemptError },
    { data: question, error: questionError },
    { data: student, error: studentError },
  ] = await Promise.all([
    auth.value.db
      .from('lecturer_assignment_submissions')
      .select('id,assignment_id,student_id,status,started_at,submitted_at,graded_at,total_score')
      .eq('id', answer.assignment_submission_id)
      .maybeSingle(),
    auth.value.db
      .from('lecturer_questions')
      .select('id,assignment_id,content,reference_answer,position,max_score,time_limit_seconds')
      .eq('id', answer.question_id)
      .maybeSingle(),
    auth.value.db
      .from('users')
      .select('id,full_name')
      .eq('id', answer.student_id)
      .maybeSingle(),
  ]);

  if (attemptError || questionError || studentError) {
    if (attemptError) reportDatabaseError('Unable to load answer attempt', attemptError);
    if (questionError) reportDatabaseError('Unable to load answer question', questionError);
    if (studentError) reportDatabaseError('Unable to load answer student', studentError);
    return apiJson({ error: 'Không thể tải chi tiết bài làm' }, 500);
  }
  if (!attempt || !question) return apiJson({ error: 'Dữ liệu bài làm không đầy đủ' }, 404);

  const [{ data: assignment, error: assignmentError }, { data: rubrics, error: rubricError }] =
    await Promise.all([
      auth.value.db
        .from('assignments')
        .select('id,title,class_id,results_published_at')
        .eq('id', attempt.assignment_id)
        .maybeSingle(),
      auth.value.db
        .from('lecturer_rubric_criteria')
        .select('id,criterion_text,max_points,position')
        .eq('question_id', question.id)
        .order('position'),
    ]);

  if (assignmentError || rubricError) {
    if (assignmentError) reportDatabaseError('Unable to load answer assignment', assignmentError);
    if (rubricError) reportDatabaseError('Unable to load answer rubric', rubricError);
    return apiJson({ error: 'Không thể tải thông tin bài tập' }, 500);
  }

  const { data: signedAudio, error: audioError } = await auth.value.db.storage
    .from('oral-answers')
    .createSignedUrl(answer.audio_storage_path, 1800);
  if (audioError) {
    reportDatabaseError('Unable to create signed audio URL', audioError);
    return apiJson({ error: 'Không thể mở tệp ghi âm' }, 500);
  }

  const { data: gradeReview, error: reviewError } = await auth.value.db
    .from('grade_reviews')
    .select('id,final_score,reviewer_feedback,score_modified,reviewed_at,updated_at')
    .eq('submission_id', id)
    .maybeSingle();

  if (reviewError) {
    reportDatabaseError('Unable to load grade review', reviewError);
    return apiJson({ error: 'Không thể tải điểm đã duyệt' }, 500);
  }

  const { data: transcriptions, error: transcriptionError } = await auth.value.db
    .from('transcriptions')
    .select('id,transcript_text,engine_name,language_code,is_edited,created_at')
    .eq('submission_id', id)
    .order('created_at', { ascending: false })
    .limit(1);
  const { data: evaluations, error: evaluationError } = await auth.value.db
    .from('evaluations')
    .select('id,transcription_id,model_name,suggested_score,feedback_summary,needs_teacher_review,created_at')
    .eq('submission_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (transcriptionError || evaluationError) {
    if (transcriptionError) reportDatabaseError('Unable to load answer transcript', transcriptionError);
    if (evaluationError) reportDatabaseError('Unable to load AI evaluation', evaluationError);
    return apiJson({ error: 'Không thể tải transcript hoặc đánh giá AI' }, 500);
  }
  const evaluation = evaluations[0] ?? null;
  const { data: criterionScores, error: criterionError } = evaluation
    ? await auth.value.db
        .from('evaluation_criterion_scores')
        .select('criterion_id,awarded_points,assessment,evidence_excerpt,explanation')
        .eq('evaluation_id', evaluation.id)
    : { data: [], error: null };
  if (criterionError) {
    reportDatabaseError('Unable to load AI criterion scores', criterionError);
    return apiJson({ error: 'Không thể tải điểm theo rubric' }, 500);
  }

  return apiJson({
    data: {
      answer: { ...answer, audio_storage_path: undefined },
      attempt,
      assignment,
      question: { ...question, rubric: rubrics },
      student,
      audio_url: signedAudio.signedUrl,
      grade_review: gradeReview,
      transcription: transcriptions[0] ?? null,
      evaluation: evaluation ? { ...evaluation, criteria: criterionScores } : null,
    },
  });
}
