import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const bodySchema = z.object({ max_attempts: z.number().int().min(1).max(5) }).strict();

type RouteContext = { params: Promise<{ id: string }> };

/** Giảng viên đổi số lần làm tối đa (dùng được cả khi bài đã công bố — ví dụ cho thêm một lượt làm lại). */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Số lần làm phải từ 1 đến 5' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('set_assignment_max_attempts', {
    p_assignment_id: id,
    p_max_attempts: parsed.data.max_attempts,
  });
  if (error) {
    reportDatabaseError('Unable to update attempt limit', error);
    if (error.code === 'PGRST202') return apiJson({ error: 'Máy chủ chưa chạy migration 009 để cho làm lại bài.' }, 503);
    return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền sửa' }, 404);
  }
  return apiJson({ data: { max_attempts: Number(data) } });
}
