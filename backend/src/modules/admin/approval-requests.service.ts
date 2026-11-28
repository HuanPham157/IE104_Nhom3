import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const statusSchema = z.enum(['pending', 'approved', 'rejected']);

/** Chuyển từ frontend/src/app/api/admin/approval-requests/route.ts. */
@Injectable()
export class ApprovalRequestsService {
  async list(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const status = searchParams.status ?? 'pending';
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) {
      return apiJson({ error: 'Trạng thái yêu cầu không hợp lệ' }, 400);
    }

    const { data, error } = await auth.db
      .from('approval_requests')
      .select('id,requester_id,request_type,target_id,request_data,status,reject_reason,created_at,reviewed_at')
      .in('request_type', ['class_creation', 'class_cancellation', 'academic_info_update'])
      .eq('status', parsedStatus.data)
      .order('created_at', { ascending: true });

    if (error) {
      reportDatabaseError('Unable to load approval requests', error);
      return apiJson({ error: 'Không thể tải yêu cầu duyệt' }, 500);
    }
    if (data.length === 0) return apiJson({ data: [] });

    const requesterIds = [...new Set(data.map((item) => item.requester_id))];
    const [{ data: requesters, error: requesterError }, { data: lecturerProfiles }] = await Promise.all([
      auth.db.from('users').select('id,full_name').in('id', requesterIds),
      auth.db.from('lecturer_profiles').select('user_id,department,academic_title,academic_degree').in('user_id', requesterIds),
    ]);
    if (requesterError) {
      reportDatabaseError('Unable to load approval requesters', requesterError);
      return apiJson({ error: 'Không thể tải thông tin người gửi yêu cầu' }, 500);
    }

    const nameById = new Map(requesters.map((item) => [item.id, item.full_name]));
    const profileById = new Map((lecturerProfiles ?? []).map((item) => [item.user_id, item]));
    return apiJson({
      data: data.map((item) => {
        const profile = profileById.get(item.requester_id);
        return {
          ...item,
          requester_name: nameById.get(item.requester_id) ?? 'Giảng viên',
          requester_department: profile?.department ?? null,
          requester_current_title: profile?.academic_title ?? profile?.academic_degree ?? null,
        };
      }),
    });
  }
}
