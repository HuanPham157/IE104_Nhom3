import { z } from 'zod';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Sinh viên bắt đầu lượt làm lại (migration 009). Máy chủ kiểm tra: còn lượt, bài còn trong hạn nộp,
 * lượt trước đã có điểm (AI chấm xong hoặc giảng viên đã duyệt/công bố).
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;
  const { id: assignmentId } = await context.params;
  if (!idSchema.safeParse(assignmentId).success) return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);

  const { data: attemptId, error } = await auth.value.db.rpc('start_assignment_retake', { p_assignment_id: assignmentId });
  if (error) {
    reportDatabaseError('Unable to start assignment retake', error);
    if (error.code === 'PGRST202') return apiJson({ error: 'Máy chủ chưa chạy migration 009 để cho làm lại bài.' }, 503);
    if (error.message.includes('Attempt limit reached')) return apiJson({ error: 'Bạn đã dùng hết số lần làm bài này.' }, 409);
    if (error.message.includes('no score yet')) {
      return apiJson({ error: 'Lượt trước chưa có điểm. Hãy chờ AI chấm xong hoặc giảng viên công bố điểm rồi làm lại.' }, 409);
    }
    if (error.message.includes('No previous attempt')) return apiJson({ error: 'Bạn chưa làm bài này lần nào.' }, 409);
    return apiJson({ error: 'Bài tập đã hết hạn nộp hoặc bạn không còn thuộc lớp này.' }, 403);
  }

  const { data: attempt, error: loadError } = await auth.value.db
    .from('assignment_submissions')
    .select('id,status,started_at,deadline_at')
    .eq('id', attemptId)
    .eq('student_id', auth.value.user.id)
    .single();
  if (loadError) {
    reportDatabaseError('Unable to load retake attempt', loadError);
    return apiJson({ error: 'Đã bắt đầu lượt mới nhưng không tải được thời gian làm bài' }, 500);
  }
  return apiJson({ data: { attempt_id: attempt.id, status: attempt.status, started_at: attempt.started_at, deadline_at: attempt.deadline_at } }, 201);
}
