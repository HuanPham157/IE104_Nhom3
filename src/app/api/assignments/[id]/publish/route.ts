import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('publish_assignment_results', {
    p_assignment_id: id,
  });
  if (error) {
    reportDatabaseError('Unable to publish assignment results', error);
    if (error.message.includes('Assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền công bố' }, 404);
    }
    return apiJson({ error: 'Chỉ có thể công bố sau khi chấm xong tất cả bài đã nộp' }, 409);
  }

  return apiJson({ data: { results_published_at: data } });
}
