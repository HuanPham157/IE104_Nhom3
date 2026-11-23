import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const joinSchema = z
  .object({
    class_code: z.string().trim().min(6).max(10).regex(/^[A-Za-z0-9]+$/),
  })
  .strict();

/** Chuyển từ frontend/src/app/api/classes/join/route.ts. */
@Injectable()
export class ClassJoinService {
  async join(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'Mã lớp không hợp lệ' }, 400);
    }

    const { data, error } = await auth.db.rpc('join_class_by_code', {
      p_class_code: parsed.data.class_code.toUpperCase(),
    });

    if (error) {
      if (error.message.includes('Active class code not found')) {
        return apiJson({
          error: 'Không tìm thấy lớp đang hoạt động với mã này',
          code: 'CLASS_NOT_FOUND',
        }, 404);
      }
      if (error.message.includes('Student already joined this class')) {
        return apiJson({
          error: 'Bạn đã tham gia lớp này trước đó',
          code: 'ALREADY_JOINED',
        }, 409);
      }
      reportDatabaseError('Unable to join class', error);
      return apiJson({ error: 'Không thể tham gia lớp học' }, 500);
    }

    return apiJson({ data: { class_id: data } }, 201);
  }
}
