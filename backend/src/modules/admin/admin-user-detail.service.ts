import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();
const updateSchema = z
  .object({
    account_status: z.enum(['active', 'suspended']).optional(),
    academic_title: z.string().trim().max(40).nullable().optional(),
  })
  .strict()
  .refine((value) => value.account_status !== undefined || value.academic_title !== undefined, 'Không có thay đổi');

/** Chuyển từ frontend/src/app/api/admin/users/[id]/route.ts. */
@Injectable()
export class AdminUserDetailService {
  /** Admin khóa / mở khóa / kích hoạt tài khoản hoặc chỉnh học hàm / học vị của giảng viên. */
  async update(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id } = params;
    if (!idSchema.safeParse(id).success) return apiJson({ error: 'ID tài khoản không hợp lệ' }, 400);

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiJson({ error: 'Dữ liệu cập nhật không hợp lệ' }, 400);
    const { db } = auth;

    if (parsed.data.academic_title !== undefined) {
      const { error } = await db.rpc('admin_set_academic_title', {
        p_user_id: id,
        p_academic_title: parsed.data.academic_title ?? '',
      });
      if (error) {
        reportDatabaseError('Unable to set academic title', error);
        if (error.code === 'PGRST202') return apiJson({ error: 'Máy chủ chưa chạy 10_profiles_admin.sql.' }, 503);
        if (error.message.includes('Lecturer not found')) return apiJson({ error: 'Tài khoản không phải giảng viên' }, 404);
        return apiJson({ error: 'Không thể cập nhật học hàm / học vị' }, 400);
      }
    }

    if (parsed.data.account_status) {
      const { error } = await db.rpc('admin_set_account_status', {
        p_user_id: id,
        p_status: parsed.data.account_status,
      });
      if (error) {
        reportDatabaseError('Unable to set account status', error);
        if (error.code === 'PGRST202') return apiJson({ error: 'Máy chủ chưa chạy 10_profiles_admin.sql.' }, 503);
        if (error.message.includes('own account')) return apiJson({ error: 'Không thể tự khóa tài khoản của chính mình' }, 400);
        if (error.message.includes('another admin')) return apiJson({ error: 'Không thể thay đổi tài khoản quản trị viên khác' }, 400);
        if (error.message.includes('User not found')) return apiJson({ error: 'Không tìm thấy tài khoản' }, 404);
        return apiJson({ error: 'Không thể cập nhật trạng thái tài khoản' }, 400);
      }
    }

    return apiJson({ data: { id, ...parsed.data } });
  }
}
