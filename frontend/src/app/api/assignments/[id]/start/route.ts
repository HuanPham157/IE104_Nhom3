import { z } from 'zod';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

/** Sinh viên bấm "Bắt đầu làm bài": tạo lượt làm (nếu chưa có) và trả về thời điểm hết giờ. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;

  const { id: assignmentId } = await context.params;
  if (!idSchema.safeParse(assignmentId).success) return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);

  const { data: attemptId, error } = await auth.value.db.rpc('start_assignment_submission', { p_assignment_id: assignmentId });
  if (error) {
    reportDatabaseError('Unable to start assignment', error);
    if (error.message.includes('already been finalized')) return apiJson({ error: 'Bạn đã nộp bài tập này' }, 409);
    return apiJson({ error: 'Bài tập chưa mở, đã đóng hoặc bạn không thuộc lớp này' }, 403);
  }

  const { data: attempt, error: loadError } = await auth.value.db
    .from('assignment_submissions')
    .select('id,status,started_at,deadline_at')
    .eq('id', attemptId)
    .eq('student_id', auth.value.user.id)
    .single();
  if (loadError) {
    reportDatabaseError('Unable to load started attempt', loadError);
    return apiJson({ error: 'Đã bắt đầu nhưng không tải được thời gian làm bài' }, 500);
  }
  return apiJson({ data: { attempt_id: attempt.id, status: attempt.status, started_at: attempt.started_at, deadline_at: attempt.deadline_at } }, 201);
}
