import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const reviewSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    reject_reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (value) => value.decision !== 'rejected' || Boolean(value.reject_reason),
    'Cần nêu lý do khi từ chối yêu cầu',
  );

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID yêu cầu không hợp lệ' }, 400);
  }

  const parsed = reviewSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Quyết định duyệt không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const { data, error } = await auth.value.db.rpc('review_class_request', {
    p_request_id: id,
    p_decision: parsed.data.decision,
    p_reject_reason: parsed.data.reject_reason ?? null,
  });

  if (error) {
    reportDatabaseError('Unable to review class request', error);
    if (error.message.includes('Pending class request not found')) {
      return apiJson({ error: 'Không tìm thấy yêu cầu đang chờ duyệt' }, 404);
    }
    return apiJson({ error: 'Không thể xử lý yêu cầu duyệt' }, 500);
  }
  return apiJson({ data });
}
