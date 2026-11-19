import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signAudioPaths } from '@/lib/audio-urls';
import { saveAssignmentDuration, saveGradingGuide, saveMaxAttempts, saveReferenceAnswerVisibility } from '@/lib/assignment-settings';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const rubricSchema = z
  .object({
    criterion_text: z.string().trim().min(1).max(500),
    max_points: z.number().positive().max(999.99),
    position: z.number().int().positive().optional(),
  })
  .strict();
const assignmentContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(10000).optional().nullable(),
    starts_at: z.string().datetime({ offset: true }).optional().nullable(),
    ends_at: z.string().datetime({ offset: true }).optional().nullable(),
    duration_minutes: z.number().int().min(1).max(600).optional().nullable(),
    grading_guide: z.string().max(20000).optional(),
    show_reference_answer: z.boolean().optional(),
    max_attempts: z.number().int().min(1).max(5).optional(),
    questions: z.array(z.object({
      content: z.string().trim().min(1).max(10000),
      reference_answer: z.string().trim().max(10000).optional().default(''),
      position: z.number().int().positive().optional(),
      max_score: z.number().positive().max(999.99).optional().default(10),
      time_limit_seconds: z.number().int().positive().max(7200).optional().default(120),
      rubric: z.array(rubricSchema).max(30).optional().default([]),
    }).strict().refine(
      (question) => question.rubric.reduce((sum, criterion) => sum + criterion.max_points, 0) <= question.max_score,
      'Tổng điểm tiêu chí không được vượt điểm tối đa của câu hỏi',
    )).min(1).max(100),
  })
  .strict()
  .refine(
    (value) => !value.starts_at || !value.ends_at || new Date(value.ends_at).getTime() > new Date(value.starts_at).getTime(),
    'Thời gian kết thúc phải sau thời gian bắt đầu',
  )
  .refine(
    (value) => Math.abs(value.questions.reduce((sum, question) => sum + question.max_score, 0) - 10) < 0.01,
    'Tổng điểm bài tập phải bằng 10',
  );
const statusSchema = z
  .object({ status: z.enum(['draft', 'published', 'closed', 'archived']) })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

type OwnVersionRow = {
  id: string;
  question_id: string;
  attempt_number: number;
  is_final: boolean;
  status: string;
  submitted_at: string;
  audio_duration_seconds: number | null;
  audio_storage_path: string;
  transcript: string | null;
  original_transcript: string | null;
};

/**
 * Gắn mọi phiên bản ghi âm (kèm signed URL để phát lại) vào tiến độ của sinh viên,
 * và signed URL cho bản đang được chọn của từng câu.
 * Nếu database chưa chạy seed.sql + migration 006 thì chỉ lấy các bản is_final như trước.
 */
async function attachOwnVersions(db: SupabaseClient, assignmentId: string, submission: unknown): Promise<unknown> {
  const current = submission as { attempt_id?: string; answers?: Array<Record<string, unknown> & { id: string }> } | null;
  if (!current?.attempt_id) return submission;

  let rows: OwnVersionRow[] = [];
  let versionsSupported = true;
  const { data, error } = await db.rpc('get_own_answer_versions', { p_assignment_id: assignmentId });
  if (error) {
    versionsSupported = false;
    reportDatabaseError('Unable to load own answer versions (seed.sql + migration 006?)', error);
    const fallback = await db
      .from('submissions')
      .select('id,question_id,attempt_number,is_final,status,submitted_at,audio_duration_seconds,audio_storage_path')
      .eq('assignment_submission_id', current.attempt_id)
      .eq('is_final', true);
    if (fallback.error) {
      reportDatabaseError('Unable to load own answer audio paths', fallback.error);
      return submission;
    }
    const transcriptById = new Map((current.answers ?? []).map((answer) => [answer.id, answer]));
    rows = fallback.data.map((row) => ({
      ...row,
      transcript: (transcriptById.get(row.id)?.transcript as string | null) ?? null,
      original_transcript: (transcriptById.get(row.id)?.original_transcript as string | null) ?? null,
    }));
  } else {
    rows = (data as OwnVersionRow[] | null) ?? [];
  }

  const urls = await signAudioPaths(db, rows.map((row) => row.audio_storage_path));
  const versions = rows.map(({ audio_storage_path: path, ...row }) => ({ ...row, audio_url: urls.get(path) ?? null }));
  const versionById = new Map(versions.map((version) => [version.id, version]));
  return {
    ...current,
    versions_supported: versionsSupported,
    versions,
    answers: (current.answers ?? []).map((answer) => ({
      ...answer,
      audio_url: versionById.get(answer.id)?.audio_url ?? null,
      audio_duration_seconds: versionById.get(answer.id)?.audio_duration_seconds ?? null,
    })),
  };
}

/**
 * Điểm chính thức của giảng viên (chỉ có sau khi công bố — RLS của grade_reviews và view
 * student_assignment_results cũng chỉ trả dữ liệu khi results_published_at khác null).
 */
async function attachOfficialResults(db: SupabaseClient, assignmentId: string, submission: unknown): Promise<unknown> {
  const current = submission as { attempt_id?: string; answers?: Array<{ id: string }> } | null;
  if (!current?.attempt_id) return submission;
  const answerIds = (current.answers ?? []).map((answer) => answer.id);
  const [{ data: result, error: resultError }, { data: reviews, error: reviewError }] = await Promise.all([
    // Làm lại nhiều lần: điểm chính thức là lượt cao nhất (view trả mọi lượt đã công bố).
    db.from('student_assignment_results').select('total_score,graded_at').eq('assignment_id', assignmentId)
      .order('total_score', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    answerIds.length
      ? db.from('grade_reviews').select('submission_id,final_score,reviewer_feedback').in('submission_id', answerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (resultError || reviewError) {
    reportDatabaseError('Unable to load official results', (resultError ?? reviewError)!);
    return submission;
  }
  return {
    ...current,
    official: {
      total_score: result?.total_score ?? null,
      graded_at: result?.graded_at ?? null,
      reviews: Object.fromEntries((reviews ?? []).map((review) => [review.submission_id, {
        final_score: Number(review.final_score), reviewer_feedback: review.reviewer_feedback,
      }])),
    },
  };
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const { data: assignment, error: assignmentError } = await auth.value.db
    .from('assignments')
    .select('id,class_id,lecturer_id,title,instructions,starts_at,ends_at,duration_minutes,status,results_published_at,created_at')
    .eq('id', id)
    .maybeSingle();

  if (assignmentError) {
    reportDatabaseError('Unable to load assignment', assignmentError);
    return apiJson({ error: 'Không thể tải bài tập' }, 500);
  }
  if (!assignment) return apiJson({ error: 'Không tìm thấy bài tập' }, 404);

  const questionFields =
    'id,assignment_id,content,position,max_score,time_limit_seconds';
  const { data: questions, error: questionError } =
    auth.value.role === 'student'
      ? await auth.value.db
          .from('questions')
          .select(questionFields)
          .eq('assignment_id', id)
          .order('position')
      : await auth.value.db
          .from('lecturer_questions')
          .select(`${questionFields},reference_answer`)
          .eq('assignment_id', id)
          .order('position');

  if (questionError) {
    reportDatabaseError('Unable to load assignment questions', questionError);
    return apiJson({ error: 'Không thể tải danh sách câu hỏi' }, 500);
  }

  const questionIds = questions.map((question) => question.id);
  if (questionIds.length === 0) {
    return apiJson({ data: { ...assignment, questions: [] } });
  }

  let rubrics: Array<{
    id: string;
    question_id: string;
    criterion_text: string;
    max_points: number;
    position: number;
  }> = [];
  if (auth.value.role !== 'student') {
    const { data, error } = await auth.value.db
      .from('lecturer_rubric_criteria')
      .select('id,question_id,criterion_text,max_points,position')
      .in('question_id', questionIds)
      .order('position');

    if (error) {
      reportDatabaseError('Unable to load assignment rubrics', error);
      return apiJson({ error: 'Không thể tải rubric' }, 500);
    }
    rubrics = data;
  }

  const rubricByQuestion = new Map<string, typeof rubrics>();
  for (const rubric of rubrics) {
    const list = rubricByQuestion.get(rubric.question_id) ?? [];
    list.push(rubric);
    rubricByQuestion.set(rubric.question_id, list);
  }

  let mySubmission: unknown = null;
  let retake: unknown = null;
  let aiWorkflowReady = true;
  if (auth.value.role === 'student') {
    const { data, error } = await auth.value.db.rpc('get_own_assignment_submission', { p_assignment_id: id });
    if (error) {
      reportDatabaseError('Unable to load student assignment progress', error);
      aiWorkflowReady = false;

      // Keep the assignment itself available if migration 004 has not reached this database yet.
      // These owner-scoped tables and policies are part of the existing submission migrations.
      const { data: attempt, error: attemptError } = await auth.value.db
        .from('assignment_submissions')
        .select('id,status')
        .eq('assignment_id', id)
        .eq('student_id', auth.value.user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (attemptError) {
        reportDatabaseError('Unable to load student assignment attempt fallback', attemptError);
        return apiJson({ error: 'Không thể tải tiến độ bài làm' }, 500);
      }
      if (attempt) {
        const { data: answers, error: answersError } = await auth.value.db
          .from('submissions')
          .select('id,question_id,status')
          .eq('assignment_submission_id', attempt.id)
          .eq('is_final', true);
        if (answersError) {
          reportDatabaseError('Unable to load student answers fallback', answersError);
          return apiJson({ error: 'Không thể tải câu trả lời đã lưu' }, 500);
        }
        mySubmission = {
          attempt_id: attempt.id,
          status: attempt.status,
          answers: answers.map((answer) => ({
            ...answer,
            transcript: null,
            original_transcript: null,
            evaluation: null,
          })),
        };
      }
    } else {
      mySubmission = data;
    }
    const currentAttemptId = (mySubmission as { attempt_id?: string } | null)?.attempt_id;
    if (currentAttemptId) {
      const { data: attemptTimer, error: timerError } = await auth.value.db
        .from('assignment_submissions')
        .select('deadline_at,started_at')
        .eq('id', currentAttemptId)
        .maybeSingle();
      if (timerError) {
        reportDatabaseError('Unable to load assignment exam timer', timerError);
        return apiJson({ error: 'Không thể tải thời gian làm bài' }, 500);
      }
      if (attemptTimer) mySubmission = { ...(mySubmission as Record<string, unknown>), ...attemptTimer };
    }
    // Làm lại cả bài (migration 009). Chưa chạy migration thì bỏ qua — bài vẫn làm được một lần như trước.
    const { data: retakeStatus, error: retakeError } = await auth.value.db.rpc('get_retake_status', { p_assignment_id: id });
    if (retakeError) reportDatabaseError('Unable to load retake status (migration 009?)', retakeError);
    else retake = retakeStatus;
    mySubmission = await attachOwnVersions(auth.value.db, id, mySubmission);
    if (assignment.results_published_at) mySubmission = await attachOfficialResults(auth.value.db, id, mySubmission);
  }

  let gradingGuide: string | null = null;
  if (auth.value.role !== 'student') {
    const { data: guide, error: guideError } = await auth.value.db
      .from('assignment_grading_guides')
      .select('guide_text')
      .eq('assignment_id', id)
      .maybeSingle();
    // Bảng chỉ có sau migration 006; thiếu thì coi như chưa có barem.
    if (guideError) reportDatabaseError('Unable to load grading guide', guideError);
    gradingGuide = guide?.guide_text ?? null;
  }

  let showReferenceAnswer: boolean | undefined;
  if (auth.value.role !== 'student') {
    const { data: visibility, error: visibilityError } = await auth.value.db
      .from('assignments')
      .select('show_reference_answer')
      .eq('id', id)
      .maybeSingle();
    // Cột chỉ có sau migration 007; thiếu thì coi như đang ẩn đáp án.
    if (visibilityError) reportDatabaseError('Unable to load reference answer visibility', visibilityError);
    showReferenceAnswer = Boolean(visibility?.show_reference_answer);
  }

  let maxAttempts: number | undefined;
  if (auth.value.role !== 'student') {
    const { data: attemptsSetting, error: attemptsError } = await auth.value.db
      .from('assignments')
      .select('max_attempts')
      .eq('id', id)
      .maybeSingle();
    // Cột chỉ có sau migration 009; thiếu thì coi như 1 lần làm.
    if (attemptsError) reportDatabaseError('Unable to load attempt limit', attemptsError);
    maxAttempts = Number(attemptsSetting?.max_attempts ?? 1);
  }

  return apiJson({
    data: {
      ...assignment,
      grading_guide: gradingGuide,
      show_reference_answer: showReferenceAnswer,
      max_attempts: maxAttempts,
      my_submission: mySubmission,
      retake,
      ai_workflow_ready: aiWorkflowReady,
      questions: questions.map((question) => ({
        ...question,
        rubric:
          auth.value.role === 'student'
            ? undefined
            : rubricByQuestion.get(question.id) ?? [],
      })),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const parsed = statusSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Trạng thái bài tập không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('set_assignment_status', {
    p_assignment_id: id,
    p_status: parsed.data.status,
  });
  if (error) {
    reportDatabaseError('Unable to update assignment status', error);
    if (error.message.includes('Assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền sửa' }, 404);
    }
    if (error.message.includes('cannot return to draft')) {
      return apiJson({ error: 'Đã có sinh viên bắt đầu làm bài nên không thể sửa đề này. Hãy bấm “Tạo bài mới từ đề này” để sửa trên một bài tập mới; bài cũ và bài nộp giữ nguyên.' }, 409);
    }
    if (error.message.includes('Published results cannot be reverted')) {
      return apiJson({ error: 'Bài tập đã công bố điểm nên không thể chuyển về bản nháp.' }, 409);
    }
    if (error.message.includes('Closed assignments cannot be reopened')) {
      return apiJson({ error: 'Bài tập đã đóng nên không thể công bố lại.' }, 409);
    }
    return apiJson({ error: 'Không thể cập nhật trạng thái bài tập' }, 400);
  }
  return apiJson({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const parsed = assignmentContentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Thông tin bài tập không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const {
    duration_minutes: durationMinutes,
    grading_guide: gradingGuide,
    show_reference_answer: showReferenceAnswer,
    max_attempts: maxAttempts,
    ...assignmentContent
  } = parsed.data;
  const { data, error } = await auth.value.db.rpc('update_draft_assignment_with_questions', {
    p_assignment_id: id,
    p_assignment: assignmentContent,
  });
  if (error) {
    reportDatabaseError('Unable to update draft assignment', error);
    if (error.message.includes('Draft assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bản nháp hoặc bạn không có quyền sửa' }, 404);
    }
    return apiJson({ error: 'Không thể cập nhật bản nháp. Bản đã có bài nộp có thể không còn được sửa.' }, 400);
  }
  const settingWarnings = [
    await saveAssignmentDuration(auth.value.db, id, durationMinutes),
    await saveGradingGuide(auth.value.db, id, gradingGuide),
    await saveReferenceAnswerVisibility(auth.value.db, id, showReferenceAnswer),
    await saveMaxAttempts(auth.value.db, id, maxAttempts),
  ].filter(Boolean);
  const warning = settingWarnings.length ? settingWarnings.join(' ') : undefined;
  return apiJson({ data, warning });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('delete_or_archive_assignment', {
    p_assignment_id: id,
  });
  if (error) {
    reportDatabaseError('Unable to delete assignment', error);
    if (error.message.includes('Assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền xóa' }, 404);
    }
    return apiJson({ error: 'Không thể xóa bài tập' }, 400);
  }

  return apiJson({ data: { id, archived: data } });
}
