import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';
import { signAudioPaths } from '../../common/lib/audio-urls';

type OwnAnswer = {
  id: string;
  question_id: string;
  status: string;
  transcript: string | null;
  reference_answer: string | null;
  evaluation: null | {
    score: number;
    feedback: string;
    needs_teacher_review: boolean;
    criteria: Array<{ criterion_id: string; awarded_points: number; assessment: string; evidence_excerpt: string | null; explanation: string | null }>;
  };
};

/** Chuyển từ frontend/src/app/api/student/history/route.ts. */
@Injectable()
export class StudentHistoryService {
  /**
   * Lịch sử bài nộp của sinh viên đang đăng nhập: mọi lượt làm bài kèm audio (signed URL),
   * transcript, điểm AI và điểm/nhận xét giảng viên khi kết quả đã được công bố.
   * Mọi truy vấn chạy bằng client của sinh viên nên RLS quyết định dữ liệu được thấy.
   */
  async history(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {
    const { db } = auth;
    const user = { id: auth.userId };

    const { data: attempts, error: attemptError } = await db
      .from('assignment_submissions')
      .select('id,assignment_id,status,started_at,submitted_at,graded_at')
      .eq('student_id', user.id)
      .order('started_at', { ascending: false });
    if (attemptError) {
      reportDatabaseError('Unable to load student submission history', attemptError);
      return apiJson({ error: 'Không thể tải lịch sử bài nộp' }, 500);
    }
    if (attempts.length === 0) return apiJson({ data: [] });

    const assignmentIds = [...new Set(attempts.map((attempt) => attempt.assignment_id))];
    const attemptIds = attempts.map((attempt) => attempt.id);

    const [assignmentsResult, questionsResult, answersResult, resultsResult] = await Promise.all([
      db.from('assignments').select('id,title,class_id,ends_at,results_published_at').in('id', assignmentIds),
      db.from('questions').select('id,assignment_id,content,position,max_score').in('assignment_id', assignmentIds).order('position'),
      db.from('submissions')
        .select('id,assignment_submission_id,question_id,audio_storage_path,audio_duration_seconds,status,submitted_at')
        .in('assignment_submission_id', attemptIds)
        .eq('is_final', true),
      db.from('student_assignment_results').select('id,total_score').in('id', attemptIds),
    ]);
    const firstError = assignmentsResult.error ?? questionsResult.error ?? answersResult.error ?? resultsResult.error;
    if (firstError) {
      reportDatabaseError('Unable to load submission history details', firstError);
      return apiJson({ error: 'Không thể tải chi tiết lịch sử bài nộp' }, 500);
    }
    const assignments = assignmentsResult.data ?? [];
    const questions = questionsResult.data ?? [];
    const answers = answersResult.data ?? [];
    const publishedResults = resultsResult.data ?? [];

    const classIds = [...new Set(assignments.map((assignment) => assignment.class_id))];
    const answerIds = answers.map((answer) => answer.id);
    const [classesResult, reviewsResult, audioUrls, ownProgress] = await Promise.all([
      db.from('classes').select('id,class_name,class_code').in('id', classIds),
      answerIds.length
        ? db.from('grade_reviews').select('submission_id,final_score,reviewer_feedback,reviewed_at').in('submission_id', answerIds)
        : Promise.resolve({ data: [], error: null }),
      signAudioPaths(db, answers.map((answer) => answer.audio_storage_path)),
      // Transcript và điểm AI của sinh viên đi qua RPC security definer (migration 004), giống trang làm bài.
      Promise.all(assignmentIds.map(async (assignmentId) => {
        const { data, error } = await db.rpc('get_own_assignment_submission', { p_assignment_id: assignmentId });
        if (error) reportDatabaseError('Unable to load own submission progress for history', error);
        return (data as { answers?: OwnAnswer[] } | null)?.answers ?? [];
      })),
    ]);
    if (classesResult.error || reviewsResult.error) {
      reportDatabaseError('Unable to load classes or reviews for history', (classesResult.error ?? reviewsResult.error)!);
      return apiJson({ error: 'Không thể tải lớp học hoặc điểm đã công bố' }, 500);
    }

    const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    const classById = new Map(classesResult.data.map((item) => [item.id, item]));
    const reviewByAnswer = new Map(reviewsResult.data.map((review) => [review.submission_id, review]));
    const totalByAttempt = new Map(publishedResults.map((result) => [result.id, result.total_score]));
    const progressByAnswer = new Map(ownProgress.flat().map((answer) => [answer.id, answer]));

    // Làm lại nhiều lần (migration 009): số thứ tự lượt theo thời điểm bắt đầu, và lượt có điểm đã công bố cao nhất.
    const attemptMeta = new Map<string, { attempt_index: number; attempt_count: number; is_best: boolean }>();
    for (const assignmentId of assignmentIds) {
      const list = attempts.filter((attempt) => attempt.assignment_id === assignmentId).sort((a, b) => a.started_at.localeCompare(b.started_at));
      const best = list
        .filter((attempt) => totalByAttempt.get(attempt.id) !== undefined && totalByAttempt.get(attempt.id) !== null)
        .reduce<(typeof list)[number] | null>((top, attempt) => (!top || Number(totalByAttempt.get(attempt.id)) > Number(totalByAttempt.get(top.id)) ? attempt : top), null);
      list.forEach((attempt, index) => attemptMeta.set(attempt.id, { attempt_index: index + 1, attempt_count: list.length, is_best: attempt.id === best?.id }));
    }

    const data = attempts.map((attempt) => {
      const assignment = assignmentById.get(attempt.assignment_id);
      const attemptAnswers = answers.filter((answer) => answer.assignment_submission_id === attempt.id);
      const attemptQuestions = questions.filter((question) => question.assignment_id === attempt.assignment_id);
      return {
        id: attempt.id,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        graded_at: attempt.graded_at,
        results_published: Boolean(assignment?.results_published_at),
        ...attemptMeta.get(attempt.id),
        total_score: totalByAttempt.get(attempt.id) ?? null,
        max_total: attemptQuestions.reduce((sum, question) => sum + Number(question.max_score), 0),
        assignment: assignment ? { id: assignment.id, title: assignment.title, ends_at: assignment.ends_at } : null,
        class: assignment ? classById.get(assignment.class_id) ?? null : null,
        answers: attemptQuestions.map((question) => {
          const answer = attemptAnswers.find((item) => item.question_id === question.id);
          const progress = answer ? progressByAnswer.get(answer.id) : undefined;
          const review = answer ? reviewByAnswer.get(answer.id) : undefined;
          return {
            question: { id: question.id, content: question.content, position: question.position, max_score: Number(question.max_score) },
            answer: answer ? {
              id: answer.id,
              status: answer.status,
              submitted_at: answer.submitted_at,
              audio_duration_seconds: answer.audio_duration_seconds,
              audio_url: audioUrls.get(answer.audio_storage_path) ?? null,
              transcript: progress?.transcript ?? null,
              reference_answer: progress?.reference_answer ?? null,
              evaluation: progress?.evaluation ?? null,
              grade_review: review ? {
                final_score: Number(review.final_score),
                reviewer_feedback: review.reviewer_feedback,
                reviewed_at: review.reviewed_at,
              } : null,
            } : null,
          };
        }),
      };
    });

    return apiJson({ data });
  }
}
