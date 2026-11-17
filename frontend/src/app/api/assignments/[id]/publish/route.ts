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
    if (error.message.includes('must be published')) {
      return apiJson({ error: 'Bài tập phải được công bố cho sinh viên trước khi công bố điểm' }, 409);
    }
    return apiJson({ error: 'Không thể công bố điểm' }, 500);
  }

  // Bản cũ (migration 002) trả về timestamptz; bản mới (006) trả về jsonb kèm lý do khi chưa công bố được.
  const result = (typeof data === 'object' && data !== null ? data : { published: true, results_published_at: data }) as {
    published: boolean; results_published_at?: string; auto_submitted?: number; ungraded?: number; in_progress?: number; notified?: number;
  };
  if (!result.published) {
    const reasons = [
      result.ungraded ? `${result.ungraded} bài đã nộp chưa duyệt đủ điểm từng câu` : '',
      result.in_progress ? `${result.in_progress} sinh viên đang làm bài (chưa hết giờ)` : '',
    ].filter(Boolean).join('; ');
    const autoNote = result.auto_submitted ? ` Hệ thống vừa tự nộp ${result.auto_submitted} bài đã hết giờ — hãy chấm các bài này.` : '';
    return apiJson({ error: `Chưa thể công bố: ${reasons}.${autoNote}`, data: result }, 409);
  }
  return apiJson({ data: result });
}
