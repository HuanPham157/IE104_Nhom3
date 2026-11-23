import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();
const bodySchema = z.object({ visible: z.boolean() }).strict();

/** Chuyển từ frontend/src/app/api/assignments/[id]/reference-answer/route.ts. */
@Injectable()
export class AssignmentReferenceAnswerService {
  /** Giảng viên bật/tắt cho sinh viên xem đáp án tham khảo sau khi nộp bài (dùng được cả khi bài đã công bố). */
  async update(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Giá trị hiển thị đáp án không hợp lệ' }, 400);
    }

    const { data, error } = await auth.db.rpc('set_assignment_reference_visibility', {
      p_assignment_id: id,
      p_visible: parsed.data.visible,
    });
    if (error) {
      reportDatabaseError('Unable to update reference answer visibility', error);
      if (error.code === 'PGRST202') {
        return apiJson({ error: 'Máy chủ chưa chạy 07_assignments.sql để bật hiển thị đáp án.' }, 503);
      }
      if (error.message.includes('Assignment not found or forbidden')) {
        return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền sửa' }, 404);
      }
      return apiJson({ error: 'Không thể cập nhật hiển thị đáp án' }, 400);
    }
    return apiJson({ data: { show_reference_answer: Boolean(data) } });
  }
}
