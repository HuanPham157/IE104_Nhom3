import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();

const updateSchema = z
  .object({
    class_name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

/** Chuyển từ frontend/src/app/api/classes/[id]/route.ts. */
@Injectable()
export class ClassDetailService {
  async remove(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
    }

    const { data, error } = await auth.db.rpc('delete_or_archive_class', {
      p_class_id: id,
    });
    if (error) {
      reportDatabaseError('Unable to delete class', error);
      if (error.message.includes('Class not found')) {
        return apiJson({ error: 'Không tìm thấy lớp học' }, 404);
      }
      return apiJson({ error: 'Không thể xóa lớp học' }, 400);
    }

    return apiJson({ data: { id, archived: data } });
  }

  /** Giảng viên (chủ lớp) hoặc admin sửa tên và mô tả lớp. */
  async update(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) {
      return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Thông tin lớp không hợp lệ', details: parsed.error.flatten() }, 400);
    }

    const { data, error } = await auth.db.rpc('update_class_info', {
      p_class_id: id,
      p_class_name: parsed.data.class_name,
      p_description: parsed.data.description ?? null,
    });
    if (error) {
      reportDatabaseError('Unable to update class', error);
      if (error.code === 'PGRST202') {
        return apiJson({ error: 'Máy chủ chưa chạy 06_classes.sql để sửa thông tin lớp.' }, 503);
      }
      if (error.message.includes('Class not found')) {
        return apiJson({ error: 'Không tìm thấy lớp hoặc lớp đã lưu trữ' }, 404);
      }
      return apiJson({ error: 'Không thể cập nhật lớp học' }, 400);
    }
    return apiJson({ data });
  }
}
