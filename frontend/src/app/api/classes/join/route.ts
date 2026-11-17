import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const joinSchema = z
  .object({
    class_code: z.string().trim().min(6).max(10).regex(/^[A-Za-z0-9]+$/),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;

  const parsed = joinSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Mã lớp không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('join_class_by_code', {
    p_class_code: parsed.data.class_code.toUpperCase(),
  });

  if (error) {
    if (error.message.includes('Active class code not found')) {
      return apiJson({
        error: 'Không tìm thấy lớp đang hoạt động với mã này',
        code: 'CLASS_NOT_FOUND',
      }, 404);
    }
    if (error.message.includes('Student already joined this class')) {
      return apiJson({
        error: 'Bạn đã tham gia lớp này trước đó',
        code: 'ALREADY_JOINED',
      }, 409);
    }
    reportDatabaseError('Unable to join class', error);
    return apiJson({ error: 'Không thể tham gia lớp học' }, 500);
  }

  return apiJson({ data: { class_id: data } }, 201);
}
