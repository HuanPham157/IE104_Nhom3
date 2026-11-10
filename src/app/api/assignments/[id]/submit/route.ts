import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;

  const { id: assignmentId } = await context.params;
  if (!idSchema.safeParse(assignmentId).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const body = await readJson(request);
  const parsed = z
    .object({ assignment_submission_id: idSchema })
    .strict()
    .safeParse(body);
  if (!parsed.success) {
    return apiJson({ error: 'ID bài nộp không hợp lệ' }, 400);
  }

  const { data: attempt, error: attemptError } = await auth.value.db
    .from('assignment_submissions')
    .select('id,assignment_id')
    .eq('id', parsed.data.assignment_submission_id)
    .eq('assignment_id', assignmentId)
    .eq('student_id', auth.value.user.id)
    .maybeSingle();

  if (attemptError) {
    reportDatabaseError('Unable to validate assignment submission', attemptError);
    return apiJson({ error: 'Không thể xác minh bài nộp' }, 500);
  }
  if (!attempt) return apiJson({ error: 'Không tìm thấy bài nộp' }, 404);

  const { data, error } = await auth.value.db.rpc('finalize_assignment_submission', {
    p_assignment_submission_id: attempt.id,
  });
  if (error) {
    reportDatabaseError('Unable to finalize assignment submission', error);
    return apiJson({ error: 'Cần ghi âm đầy đủ tất cả câu hỏi trước khi nộp' }, 400);
  }

  return apiJson({ data: { submission_id: data, status: 'submitted' } });
}
