import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();

/** Chuyển từ frontend/src/app/api/assignments/[id]/results/route.ts. */
@Injectable()
export class AssignmentResultsService {
  async results(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id: assignmentId } = params;
    if (!idSchema.safeParse(assignmentId).success) {
      return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
    }

    const { data: assignment, error: assignmentError } = await auth.db
      .from('assignments')
      .select('id,title,class_id,results_published_at')
      .eq('id', assignmentId)
      .maybeSingle();

    if (assignmentError) {
      reportDatabaseError('Unable to load published assignment result', assignmentError);
      return apiJson({ error: 'Không thể tải kết quả' }, 500);
    }
    if (!assignment || !assignment.results_published_at) {
      return apiJson({ error: 'Kết quả chưa được công bố' }, 404);
    }

    const { data: attempt, error: attemptError } = await auth.db
      .from('student_assignment_results')
      .select('id,status,total_score,submitted_at,graded_at')
      .eq('assignment_id', assignmentId)
      // Làm lại nhiều lần (migration 009): kết quả chính thức là lượt cao nhất.
      .order('total_score', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (attemptError) {
      reportDatabaseError('Unable to load student assignment result', attemptError);
      return apiJson({ error: 'Không thể tải kết quả của bạn' }, 500);
    }
    if (!attempt) return apiJson({ error: 'Bạn chưa nộp bài tập này' }, 404);

    const { data: answers, error: answerError } = await auth.db
      .from('submissions')
      .select('id,question_id,submitted_at')
      .eq('assignment_submission_id', attempt.id)
      .eq('is_final', true)
      .order('submitted_at');

    if (answerError) {
      reportDatabaseError('Unable to load student answer results', answerError);
      return apiJson({ error: 'Không thể tải điểm từng câu' }, 500);
    }

    const answerIds = answers.map((answer) => answer.id);
    const { data: reviews, error: reviewError } = answerIds.length
      ? await auth.db
          .from('grade_reviews')
          .select('submission_id,final_score,reviewer_feedback,reviewed_at')
          .in('submission_id', answerIds)
      : { data: [], error: null };

    if (reviewError) {
      reportDatabaseError('Unable to load published grade reviews', reviewError);
      return apiJson({ error: 'Không thể tải điểm đã công bố' }, 500);
    }

    const reviewBySubmission = new Map(reviews.map((review) => [review.submission_id, review]));
    const { data: questions, error: questionError } = await auth.db
      .from('questions')
      .select('id,content,position,max_score')
      .eq('assignment_id', assignmentId)
      .order('position');

    if (questionError) {
      reportDatabaseError('Unable to load questions for result', questionError);
      return apiJson({ error: 'Không thể tải câu hỏi của bài tập' }, 500);
    }
    const questionById = new Map(questions.map((question) => [question.id, question]));

    return apiJson({
      data: {
        assignment,
        attempt,
        answers: answers.map((answer) => ({
          ...answer,
          question: questionById.get(answer.question_id) ?? null,
          grade_review: reviewBySubmission.get(answer.id) ?? null,
        })),
      },
    });
  }
}
