import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const requestSchema = z
  .object({
    academic_title: z.string().trim().min(1).max(40),
    academic_degree: z.string().trim().max(80).optional().nullable(),
    major: z.string().trim().min(1).max(160),
    institution: z.string().trim().min(1).max(200),
    graduation_year: z.string().trim().regex(/^(19|20)\d{2}$/),
    decision_number: z.string().trim().min(1).max(80),
  })
  .strict();

/** Chuyển từ frontend/src/app/api/lecturer/academic-requests/route.ts. */
@Injectable()
export class AcademicRequestsService {
  /** Lịch sử yêu cầu cập nhật học hàm / học vị của chính giảng viên. */
  async list(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { data, error } = await auth.db
      .from('approval_requests')
      .select('id,request_data,status,reject_reason,created_at,reviewed_at')
      .eq('requester_id', auth.userId)
      .eq('request_type', 'academic_info_update')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      reportDatabaseError('Unable to load academic requests', error);
      return apiJson({ error: 'Không thể tải yêu cầu học hàm / học vị' }, 500);
    }
    return apiJson({ data });
  }

  async create(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Thông tin văn bằng chưa hợp lệ. Năm tốt nghiệp gồm 4 chữ số.', details: parsed.error.flatten() }, 400);
    }

    const { data, error } = await auth.db.rpc('request_academic_info_update', {
      p_academic_title: parsed.data.academic_title,
      p_academic_degree: parsed.data.academic_degree ?? null,
      p_major: parsed.data.major,
      p_institution: parsed.data.institution,
      p_graduation_year: parsed.data.graduation_year,
      p_decision_number: parsed.data.decision_number,
    });
    if (error) {
      reportDatabaseError('Unable to create academic request', error);
      if (error.code === 'PGRST202') {
        return apiJson({ error: 'Máy chủ chưa chạy 10_profiles_admin.sql để gửi yêu cầu học hàm / học vị.' }, 503);
      }
      if (error.message.includes('already pending')) {
        return apiJson({ error: 'Bạn đã có một yêu cầu đang chờ duyệt.' }, 409);
      }
      return apiJson({ error: 'Không thể gửi yêu cầu' }, 400);
    }
    return apiJson({ data }, 201);
  }
}
