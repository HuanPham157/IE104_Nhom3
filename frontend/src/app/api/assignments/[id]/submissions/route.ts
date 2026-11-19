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

  // Làm lại nhiều lần (migration 009): số thứ tự lượt theo thời điểm bắt đầu, và lượt được tính điểm chính thức
  // (điểm đã duyệt cao nhất của mỗi sinh viên; bằng nhau thì lượt sớm hơn).
  const attemptsByStudent = new Map<string, typeof attempts>();
  for (const attempt of [...attempts].sort((a, b) => a.started_at.localeCompare(b.started_at))) {
    attemptsByStudent.set(attempt.student_id, [...(attemptsByStudent.get(attempt.student_id) ?? []), attempt]);
  }
  const attemptMeta = new Map<string, { attempt_index: number; attempt_count: number; is_best: boolean }>();
  for (const list of attemptsByStudent.values()) {
    const best = list
      .filter((attempt) => attempt.status === 'graded')
      .reduce<(typeof list)[number] | null>((top, attempt) => (!top || Number(attempt.total_score) > Number(top.total_score) ? attempt : top), null);
    list.forEach((attempt, index) => attemptMeta.set(attempt.id, { attempt_index: index + 1, attempt_count: list.length, is_best: attempt.id === best?.id }));
  }

  return apiJson({
    data: attempts.map((attempt) => ({
      ...attempt,
      ...attemptMeta.get(attempt.id),
      student_name: studentNameById.get(attempt.student_id) ?? null,
      answers: answersByAttempt.get(attempt.id) ?? [],
    })),
  });
}
