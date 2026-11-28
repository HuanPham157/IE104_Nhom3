import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

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

/** Chuyển từ frontend/src/app/api/admin/approval-requests/[id]/route.ts. */
@Injectable()
export class ApprovalRequestReviewService {
  async review(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID yêu cầu không hợp lệ' }, 400);
    }

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Quyết định duyệt không hợp lệ', details: parsed.error.flatten() }, 400);
    }

    const { data: existing, error: lookupError } = await auth.db
      .from('approval_requests')
      .select('request_type')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) {
      reportDatabaseError('Unable to load approval request', lookupError);
      return apiJson({ error: 'Không thể tải yêu cầu duyệt' }, 500);
    }
    if (!existing) return apiJson({ error: 'Không tìm thấy yêu cầu đang chờ duyệt' }, 404);
    const isAcademic = existing.request_type === 'academic_info_update';

    const { data, error } = await auth.db.rpc(isAcademic ? 'review_academic_request' : 'review_class_request', {
      p_request_id: id,
      p_decision: parsed.data.decision,
      p_reject_reason: parsed.data.reject_reason ?? null,
    });

    if (error) {
      reportDatabaseError('Unable to review class request', error);
      if (isAcademic && error.code === 'PGRST202') {
        return apiJson({ error: 'Máy chủ chưa chạy 10_profiles_admin.sql để duyệt học hàm / học vị.' }, 503);
      }
      if (error.message.includes('request not found')) {
        return apiJson({ error: 'Không tìm thấy yêu cầu đang chờ duyệt' }, 404);
      }
      return apiJson({ error: 'Không thể xử lý yêu cầu duyệt' }, 500);
    }
    return apiJson({ data });
  }
}
