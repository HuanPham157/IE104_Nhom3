import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();
const requestSchema = z.object({ reason: z.string().trim().max(1000).optional() }).strict();

/** Chuyển từ frontend/src/app/api/classes/[id]/cancel/route.ts. */
@Injectable()
export class ClassCancelService {
  async pending(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
    }

    if (auth.role === 'admin') return apiJson({ data: null });

    const { data, error } = await auth.db
      .from('approval_requests')
      .select('id,status')
      .eq('requester_id', auth.userId)
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

  async request(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Lý do yêu cầu không hợp lệ', details: parsed.error.flatten() }, 400);
    }

    const { data, error } = await auth.db.rpc('request_class_cancellation', {
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
}
