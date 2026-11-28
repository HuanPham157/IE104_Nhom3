import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { LEGACY_TASK_FIELDS, MISSING_COLUMN, TASK_FIELDS, updateTaskSchema, definedOnly, withTaskDefaults } from '../../common/lib/personal-tasks';

const idSchema = z.string().uuid();

/** Chuyển từ frontend/src/app/api/tasks/[id]/route.ts. */
@Injectable()
export class TaskDetailService {
  // PATCH /api/tasks/:id : Cập nhật tên, ghi chú, hạn chót, ưu tiên hoặc trạng thái hoàn thành
  async update(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {
    try {
      if (auth.role !== 'student') return apiJson({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

      const { id } = params;
      const idParsed = idSchema.safeParse(id);
      if (!idParsed.success) {
        return apiJson({ error: 'ID công việc không hợp lệ' }, 400);
      }

      const parsed = updateTaskSchema.safeParse(body);
      if (!parsed.success) {
        return apiJson({ error: 'Dữ liệu cập nhật không hợp lệ' }, 400);
      }

      const updateData = definedOnly(parsed.data);
      // Chỉ update dòng vừa khớp ID vừa khớp user_id của chính người gọi
      const update = (row: Record<string, unknown>, select: string) => auth.db
        .from('tasks')
        .update(row)
        .eq('id', idParsed.data)
        .eq('user_id', auth.userId)
        .select(select)
        .maybeSingle();

      let { data, error } = await update(updateData, TASK_FIELDS);
      if (error?.code === MISSING_COLUMN) {
        // Chưa có migration 008: chỉ sửa được tên và trạng thái như trước.
        if (Object.keys(updateData).some((key) => key !== 'title' && key !== 'is_done')) {
          return apiJson({ error: 'Database chưa có cột mở rộng của bảng tasks (chạy lại 01_tables.sql) nên chưa lưu được hạn chót, ưu tiên và ghi chú.' }, 503);
        }
        const legacy = await update(updateData, LEGACY_TASK_FIELDS);
        error = legacy.error;
        data = legacy.data ? withTaskDefaults(legacy.data as unknown as Parameters<typeof withTaskDefaults>[0]) as unknown as typeof data : null;
      }

      if (error) {
        return apiJson({ error: 'Không thể cập nhật công việc' }, 500);
      }

      if (!data) {
        return apiJson({ error: 'Không tìm thấy công việc hoặc không có quyền' }, 404);
      }

      return apiJson({ data });
    } catch {
      return apiJson({ error: 'Lỗi hệ thống máy chủ' }, 500);
    }
  }

  // DELETE /api/tasks/:id : Xóa công việc
  async remove(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {
    try {
      if (auth.role !== 'student') return apiJson({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

      const { id } = params;
      const idParsed = idSchema.safeParse(id);
      if (!idParsed.success) {
        return apiJson({ error: 'ID công việc không hợp lệ' }, 400);
      }

      // Chỉ delete dòng thuộc sở hữu của user
      const { data, error } = await auth.db
        .from('tasks')
        .delete()
        .eq('id', idParsed.data)
        .eq('user_id', auth.userId)
        .select('id');

      if (error) {
        return apiJson({ error: 'Không thể xóa công việc' }, 500);
      }

      if (!data || data.length === 0) {
        return apiJson({ error: 'Không tìm thấy công việc hoặc không có quyền' }, 404);
      }

      return apiJson({ data: { id: idParsed.data } });
    } catch {
      return apiJson({ error: 'Lỗi hệ thống máy chủ' }, 500);
    }
  }
}
