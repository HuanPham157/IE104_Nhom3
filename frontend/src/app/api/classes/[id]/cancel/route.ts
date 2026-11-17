import { z } from 'zod';
import { apiJson, authenticateRole, readJson, reportDatabaseError } from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const requestSchema = z.object({ reason: z.string().trim().max(1000).optional() }).strict();
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
  }

  if (auth.value.role === 'admin') return apiJson({ data: null });

  const { data, error } = await auth.value.db
    .from('approval_requests')
    .select('id,status')
    .eq('requester_id', auth.value.user.id)
    .eq('request_type', 'class_cancellation')
    .eq('target_id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    reportDatabaseError('Unable to load class cancellation request', error);
    return apiJson({ error: 'Không thể tải trạng thái yêu cầu hủy lớp' }, 500);
  }
  return apiJson({ data });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
  }

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Lý do yêu cầu không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const { data, error } = await auth.value.db.rpc('request_class_cancellation', {
    p_class_id: id,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) {
    reportDatabaseError('Unable to request class cancellation', error);
    if (error.message.includes('Active class owned by lecturer required')) {
      return apiJson({ error: 'Không tìm thấy lớp đang hoạt động do bạn phụ trách' }, 404);
    }
    if (error.message.includes('Pending cancellation request already exists')) {
      return apiJson({ error: 'Đã có yêu cầu hủy lớp đang chờ xử lý' }, 409);
    }
    return apiJson({ error: 'Không thể gửi yêu cầu hủy lớp' }, 400);
  }

  return apiJson({ data }, 201);
}
