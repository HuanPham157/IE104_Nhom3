import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();
const bodySchema = z.object({ max_attempts: z.number().int().min(1).max(5) }).strict();

/** Chuyển từ frontend/src/app/api/assignments/[id]/max-attempts/route.ts. */
@Injectable()
export class AssignmentMaxAttemptsService {
  /** Giảng viên đổi số lần làm tối đa (dùng được cả khi bài đã công bố — ví dụ cho thêm một lượt làm lại). */
  async update(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Số lần làm phải từ 1 đến 5' }, 400);
    }

    const { data, error } = await auth.db.rpc('set_assignment_max_attempts', {
      p_assignment_id: id,
      p_max_attempts: parsed.data.max_attempts,
    });
    if (error) {
      reportDatabaseError('Unable to update attempt limit', error);
      if (error.code === 'PGRST202') return apiJson({ error: 'Máy chủ chưa chạy 07_assignments.sql / 08_submissions.sql để cho làm lại bài.' }, 503);
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền sửa' }, 404);
    }
    return apiJson({ data: { max_attempts: Number(data) } });
  }
}
