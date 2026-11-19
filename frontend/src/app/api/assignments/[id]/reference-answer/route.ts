import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const bodySchema = z.object({ visible: z.boolean() }).strict();

type RouteContext = { params: Promise<{ id: string }> };

/** Giảng viên bật/tắt cho sinh viên xem đáp án tham khảo sau khi nộp bài (dùng được cả khi bài đã công bố). */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Giá trị hiển thị đáp án không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('set_assignment_reference_visibility', {
    p_assignment_id: id,
    p_visible: parsed.data.visible,
  });
  if (error) {
    reportDatabaseError('Unable to update reference answer visibility', error);
    if (error.code === 'PGRST202') {
      return apiJson({ error: 'Máy chủ chưa chạy migration 007 để bật hiển thị đáp án.' }, 503);
    }
    if (error.message.includes('Assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền sửa' }, 404);
    }
    return apiJson({ error: 'Không thể cập nhật hiển thị đáp án' }, 400);
  }
  return apiJson({ data: { show_reference_answer: Boolean(data) } });
}
