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

  const { id: assignmentId } = await context.params;
  if (!idSchema.safeParse(assignmentId).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const { data: attempts, error: attemptError } = await auth.value.db
    .from('lecturer_assignment_submissions')
    .select('id,assignment_id,student_id,status,started_at,submitted_at,graded_at,total_score')
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (attemptError) {
    reportDatabaseError('Unable to load assignment submissions', attemptError);
    return apiJson({ error: 'Không thể tải danh sách bài nộp' }, 500);
  }

  const attemptIds = attempts.map((attempt) => attempt.id);
  if (attemptIds.length === 0) return apiJson({ data: [] });

  const studentIds = [...new Set(attempts.map((attempt) => attempt.student_id))];
  const [{ data: answers, error: answerError }, { data: students, error: studentError }] =
    await Promise.all([
      auth.value.db
        .from('submissions')
        .select('id,assignment_submission_id,question_id,status,submitted_at')
        .in('assignment_submission_id', attemptIds)
        .eq('is_final', true)
        .order('submitted_at'),
      auth.value.db
        .from('users')
        .select('id,full_name')
        .in('id', studentIds),
    ]);

  if (answerError || studentError) {
    if (answerError) reportDatabaseError('Unable to load submitted answers', answerError);
    if (studentError) reportDatabaseError('Unable to load student names', studentError);
    return apiJson({ error: 'Không thể tải thông tin bài nộp' }, 500);
  }

  const studentNameById = new Map(students.map((student) => [student.id, student.full_name]));
  const answersByAttempt = new Map<string, typeof answers>();
  for (const answer of answers) {
    const list = answersByAttempt.get(answer.assignment_submission_id) ?? [];
    list.push(answer);
    answersByAttempt.set(answer.assignment_submission_id, list);
  }

  return apiJson({
    data: attempts.map((attempt) => ({
      ...attempt,
      student_name: studentNameById.get(attempt.student_id) ?? null,
      answers: answersByAttempt.get(attempt.id) ?? [],
    })),
  });
}
