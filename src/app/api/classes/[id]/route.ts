import { z } from 'zod';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('delete_or_archive_class', {
    p_class_id: id,
  });
  if (error) {
    reportDatabaseError('Unable to delete class', error);
    if (error.message.includes('Class not found')) {
      return apiJson({ error: 'Không tìm thấy lớp học' }, 404);
    }
    return apiJson({ error: 'Không thể xóa lớp học' }, 400);
  }

  return apiJson({ data: { id, archived: data } });
}
