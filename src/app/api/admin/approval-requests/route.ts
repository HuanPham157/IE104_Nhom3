import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const statusSchema = z.enum(['pending', 'approved', 'rejected']);

export async function GET(request: Request) {
  const auth = await authenticateRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'pending';
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return apiJson({ error: 'Trạng thái yêu cầu không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db
    .from('approval_requests')
    .select('id,requester_id,request_type,target_id,request_data,status,reject_reason,created_at,reviewed_at')
    .in('request_type', ['class_creation', 'class_cancellation'])
    .eq('status', parsedStatus.data)
    .order('created_at', { ascending: true });

  if (error) {
    reportDatabaseError('Unable to load approval requests', error);
    return apiJson({ error: 'Không thể tải yêu cầu duyệt' }, 500);
  }
  if (data.length === 0) return apiJson({ data: [] });

  const requesterIds = [...new Set(data.map((item) => item.requester_id))];
  const { data: requesters, error: requesterError } = await auth.value.db
    .from('users')
    .select('id,full_name')
    .in('id', requesterIds);
  if (requesterError) {
    reportDatabaseError('Unable to load approval requesters', requesterError);
    return apiJson({ error: 'Không thể tải thông tin người gửi yêu cầu' }, 500);
  }

  const nameById = new Map(requesters.map((item) => [item.id, item.full_name]));
  return apiJson({
    data: data.map((item) => ({
      ...item,
      requester_name: nameById.get(item.requester_id) ?? 'Giảng viên',
    })),
  });
}
