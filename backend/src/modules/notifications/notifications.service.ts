import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

/** Chuyển từ frontend/src/app/api/notifications/route.ts. */
@Injectable()
export class NotificationsService {
  async list(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { data, error } = await auth.db
      .from('notifications')
      .select('id,title,message,notification_type,related_entity_type,related_entity_id,is_read,created_at,read_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      reportDatabaseError('Unable to load notifications', error);
      return apiJson({ error: 'Không thể tải thông báo' }, 500);
    }
    return apiJson({ data });
  }
}
