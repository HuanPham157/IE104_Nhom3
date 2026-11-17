import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';
import { analyzeAnswer } from '@/lib/answer-analysis';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };
type Assessment = 'correct' | 'partial' | 'incorrect' | 'missing';

/** PostgREST đặt danh sách `in` lên URL; chia nhỏ để lớp đông sinh viên không vượt giới hạn độ dài URL. */
async function selectIn<T>(
  db: SupabaseClient,
  table: string,
  columns: string,
  column: string,
  values: string[],
  options: { finalOnly?: boolean; newestFirst?: boolean } = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < values.length; index += 150) {
    let query = db.from(table).select(columns).in(column, values.slice(index, index + 150));
    if (options.finalOnly) query = query.eq('is_final', true);
    if (options.newestFirst) query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw Object.assign(new Error(`Query ${table} failed`), { dbError: error });
    rows.push(...(data as T[]));
  }
  return rows;
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

/**
 * Dashboard thống kê lớp cho giảng viên/quản trị viên.
 * Điểm mỗi câu = điểm giảng viên đã duyệt, nếu chưa duyệt thì lấy điểm AI đề xuất.
 * Điểm lượt làm được quy về thang 10 để so sánh giữa các bài tập.
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;
  const { db } = auth.value;

  const { id: classId } = await context.params;
  if (!idSchema.safeParse(classId).success) return apiJson({ error: 'ID lớp không hợp lệ' }, 400);

  const { data: classRecord, error: classError } = await db
    .from('classes').select('id,class_name,class_code,status,lecturer_id').eq('id', classId).maybeSingle();
  if (classError) {
    reportDatabaseError('Unable to load class for stats', classError);
    return apiJson({ error: 'Không thể tải lớp học' }, 500);
  }
  if (!classRecord || (auth.value.role === 'lecturer' && classRecord.lecturer_id !== auth.value.user.id)) {
    return apiJson({ error: 'Không tìm thấy lớp học hoặc bạn không có quyền xem thống kê' }, 404);
  }

  try {
    const [{ data: members, error: memberError }, { data: assignmentRows, error: assignmentError }] = await Promise.all([
      db.from('class_members').select('student_id').eq('class_id', classId).eq('status', 'active'),
      db.from('assignments').select('id,title,status,ends_at,results_published_at,created_at')
        .eq('class_id', classId).in('status', ['published', 'closed']).order('created_at'),
    ]);
    if (memberError || assignmentError) throw Object.assign(new Error('base'), { dbError: memberError ?? assignmentError });

    const studentIds = members.map((member) => member.student_id);
    const assignmentIds = assignmentRows.map((assignment) => assignment.id);

    const [users, profiles, questions, attempts] = await Promise.all([
      selectIn<{ id: string; full_name: string }>(db, 'users', 'id,full_name', 'id', studentIds),
      selectIn<{ user_id: string; student_code: string | null }>(db, 'student_profiles', 'user_id,student_code', 'user_id', studentIds),
      selectIn<{ id: string; assignment_id: string; content: string; position: number; max_score: number; reference_answer: string | null }>(
        db, 'lecturer_questions', 'id,assignment_id,content,position,max_score,reference_answer', 'assignment_id', assignmentIds),
      selectIn<{ id: string; assignment_id: string; student_id: string; status: string; submitted_at: string | null }>(
        db, 'lecturer_assignment_submissions', 'id,assignment_id,student_id,status,submitted_at', 'assignment_id', assignmentIds),
    ]);

    const attemptIds = attempts.map((attempt) => attempt.id);
    const answers = await selectIn<{ id: string; assignment_submission_id: string; question_id: string; student_id: string; audio_duration_seconds: number | null }>(
      db, 'submissions', 'id,assignment_submission_id,question_id,student_id,audio_duration_seconds', 'assignment_submission_id', attemptIds,
      { finalOnly: true },
    );
    const answerIds = answers.map((answer) => answer.id);
    const [evaluations, reviews, transcriptions] = await Promise.all([
      selectIn<{ id: string; submission_id: string; suggested_score: number; needs_teacher_review: boolean; created_at: string }>(
        db, 'evaluations', 'id,submission_id,suggested_score,needs_teacher_review,created_at', 'submission_id', answerIds,
        { newestFirst: true }),
      selectIn<{ submission_id: string; final_score: number }>(db, 'grade_reviews', 'submission_id,final_score', 'submission_id', answerIds),
      selectIn<{ submission_id: string; transcript_text: string; created_at: string }>(
        db, 'transcriptions', 'submission_id,transcript_text,created_at', 'submission_id', answerIds,
        { newestFirst: true }),
    ]);

    // Chỉ giữ bản đánh giá/transcript mới nhất của mỗi câu trả lời (dữ liệu đã sắp xếp giảm dần).
    const latestEvaluation = new Map<string, (typeof evaluations)[number]>();
    for (const evaluation of evaluations) if (!latestEvaluation.has(evaluation.submission_id)) latestEvaluation.set(evaluation.submission_id, evaluation);
    const latestTranscript = new Map<string, string>();
    for (const row of transcriptions) if (!latestTranscript.has(row.submission_id)) latestTranscript.set(row.submission_id, row.transcript_text);
    const reviewByAnswer = new Map(reviews.map((review) => [review.submission_id, Number(review.final_score)]));

    const criterionScores = await selectIn<{ assessment: Assessment }>(
      db, 'evaluation_criterion_scores', 'assessment', 'evaluation_id', [...latestEvaluation.values()].map((evaluation) => evaluation.id));
    const assessmentCounts: Record<Assessment, number> = { correct: 0, partial: 0, incorrect: 0, missing: 0 };
    for (const row of criterionScores) if (row.assessment in assessmentCounts) assessmentCounts[row.assessment] += 1;

    const questionById = new Map(questions.map((question) => [question.id, question]));
    const maxByAssignment = new Map<string, number>();
    for (const question of questions) maxByAssignment.set(question.assignment_id, (maxByAssignment.get(question.assignment_id) ?? 0) + Number(question.max_score));

    const scoreOf = (answerId: string) => reviewByAnswer.get(answerId) ?? (latestEvaluation.has(answerId) ? Number(latestEvaluation.get(answerId)!.suggested_score) : null);
    const answersByAttempt = new Map<string, typeof answers>();
    for (const answer of answers) {
      const list = answersByAttempt.get(answer.assignment_submission_id) ?? [];
      list.push(answer);
      answersByAttempt.set(answer.assignment_submission_id, list);
    }

    const submittedAttempts = attempts.filter((attempt) => attempt.status !== 'in_progress' && studentIds.includes(attempt.student_id));
    // Điểm thang 10 của từng lượt làm đã có ít nhất một câu được chấm.
    const attemptScore10 = new Map<string, number>();
    for (const attempt of submittedAttempts) {
      const scores = (answersByAttempt.get(attempt.id) ?? []).map((answer) => scoreOf(answer.id)).filter((score): score is number => score !== null);
      const max = maxByAssignment.get(attempt.assignment_id) ?? 0;
      if (scores.length && max > 0) attemptScore10.set(attempt.id, (scores.reduce((sum, score) => sum + score, 0) / max) * 10);
    }

    const now = Date.now();
    const assignmentStats = assignmentRows.map((assignment) => {
      const submitted = submittedAttempts.filter((attempt) => attempt.assignment_id === assignment.id);
      const scored = submitted.map((attempt) => attemptScore10.get(attempt.id)).filter((score): score is number => score !== undefined);
      const assignmentAnswers = submitted.flatMap((attempt) => answersByAttempt.get(attempt.id) ?? []);
      const aiScores: number[] = [];
      const teacherScores: number[] = [];
      for (const answer of assignmentAnswers) {
        const evaluation = latestEvaluation.get(answer.id);
        const review = reviewByAnswer.get(answer.id);
        if (evaluation && review !== undefined) { aiScores.push(Number(evaluation.suggested_score)); teacherScores.push(review); }
      }
      const aiAvg = average(aiScores);
      const teacherAvg = average(teacherScores);
      return {
        id: assignment.id,
        title: assignment.title,
        status: assignment.status,
        ends_at: assignment.ends_at,
        overdue: Boolean(assignment.ends_at && new Date(assignment.ends_at).getTime() < now),
        results_published: Boolean(assignment.results_published_at),
        submitted_count: submitted.length,
        submission_rate: studentIds.length ? submitted.length / studentIds.length : 0,
        average_score10: scored.length ? round(average(scored)!) : null,
        pending_review: assignmentAnswers.filter((answer) => latestEvaluation.has(answer.id) && !reviewByAnswer.has(answer.id)).length,
        ungraded: assignmentAnswers.filter((answer) => !latestEvaluation.has(answer.id) && !reviewByAnswer.has(answer.id)).length,
        // Trung bình (GV − AI) trên các câu đã được duyệt: dương = GV chấm cao hơn AI.
        teacher_ai_delta: aiAvg !== null && teacherAvg !== null ? round(teacherAvg - aiAvg) : null,
        reviewed_answers: teacherScores.length,
      };
    });

    // Câu hỏi khó: tỉ lệ điểm trung bình thấp nhất.
    const questionStats = questions.map((question) => {
      const scores = answers
        .filter((answer) => answer.question_id === question.id && studentIds.includes(answer.student_id))
        .map((answer) => scoreOf(answer.id))
        .filter((score): score is number => score !== null);
      const assignment = assignmentRows.find((item) => item.id === question.assignment_id);
      return {
        id: question.id,
        assignment_id: question.assignment_id,
        assignment_title: assignment?.title ?? '',
        position: question.position,
        content: question.content.length > 140 ? `${question.content.slice(0, 140)}…` : question.content,
        graded_count: scores.length,
        average_ratio: scores.length ? round(average(scores)! / Number(question.max_score), 4) : null,
      };
    }).filter((question) => question.average_ratio !== null)
      .sort((a, b) => a.average_ratio! - b.average_ratio!)
      .slice(0, 5);

    // Bài nộp thiếu nội dung (phân tích transcript, không cần AI).
    const thinAnswers = answers
      .filter((answer) => studentIds.includes(answer.student_id) && latestTranscript.has(answer.id))
      .map((answer) => {
        const question = questionById.get(answer.question_id);
        const analysis = analyzeAnswer(latestTranscript.get(answer.id), question?.reference_answer, answer.audio_duration_seconds);
        return { answer, question, analysis };
      })
      .filter((item) => item.analysis.isThin);

    const userById = new Map(users.map((user) => [user.id, user.full_name]));
    const codeById = new Map(profiles.map((profile) => [profile.user_id, profile.student_code]));
    const dueAssignments = assignmentRows.filter((assignment) => assignment.ends_at && new Date(assignment.ends_at).getTime() < now);

    const studentStats = studentIds.map((studentId) => {
      const mine = submittedAttempts.filter((attempt) => attempt.student_id === studentId);
      const scores = mine.map((attempt) => attemptScore10.get(attempt.id)).filter((score): score is number => score !== undefined);
      const missed = dueAssignments.filter((assignment) => !mine.some((attempt) => attempt.assignment_id === assignment.id)).length;
      const avg = average(scores);
      return {
        id: studentId,
        full_name: userById.get(studentId) ?? 'Sinh viên',
        student_code: codeById.get(studentId) ?? null,
        submitted_count: mine.length,
        missed_count: missed,
        average_score10: avg === null ? null : round(avg),
        thin_answers: thinAnswers.filter((item) => item.answer.student_id === studentId).length,
        at_risk: missed > 0 || (avg !== null && avg < 5),
      };
    }).sort((a, b) => Number(b.at_risk) - Number(a.at_risk) || (a.average_score10 ?? -1) - (b.average_score10 ?? -1));

    // Phân bố điểm lượt làm theo 5 khoảng trên thang 10.
    const distribution = [0, 2, 4, 6, 8].map((from) => ({
      from,
      to: from + 2,
      count: [...attemptScore10.values()].filter((score) => (from === 8 ? score >= 8 : score >= from && score < from + 2)).length,
    }));

    const expected = studentIds.length * assignmentRows.length;
    const allScores = [...attemptScore10.values()];
    return apiJson({
      data: {
        class: { id: classRecord.id, class_name: classRecord.class_name, class_code: classRecord.class_code },
        overview: {
          student_count: studentIds.length,
          assignment_count: assignmentRows.length,
          submitted_count: submittedAttempts.length,
          submission_rate: expected ? submittedAttempts.length / expected : null,
          average_score10: allScores.length ? round(average(allScores)!) : null,
          pending_review: assignmentStats.reduce((sum, item) => sum + item.pending_review, 0),
          thin_answer_count: thinAnswers.length,
          at_risk_count: studentStats.filter((student) => student.at_risk).length,
        },
        distribution,
        assessment_counts: assessmentCounts,
        assignments: assignmentStats,
        hardest_questions: questionStats,
        students: studentStats,
        thin_answers: thinAnswers.slice(0, 20).map(({ answer, question, analysis }) => ({
          answer_id: answer.id,
          assignment_id: question?.assignment_id ?? null,
          student_name: userById.get(answer.student_id) ?? 'Sinh viên',
          question_position: question?.position ?? null,
          word_count: analysis.wordCount,
          coverage: analysis.coverage,
          warnings: analysis.warnings.map((warning) => warning.message),
        })),
      },
    });
  } catch (error) {
    const dbError = (error as { dbError?: { code?: string; message?: string } }).dbError;
    reportDatabaseError('Unable to build class stats', dbError ?? { message: error instanceof Error ? error.message : 'unknown' });
    return apiJson({ error: 'Không thể tổng hợp thống kê lớp' }, 500);
  }
}
