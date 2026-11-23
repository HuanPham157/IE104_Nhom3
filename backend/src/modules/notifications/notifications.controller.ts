import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { NotificationsService } from './notifications.service';

/** Thông báo của người dùng đang đăng nhập. */
@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
  ) {}

  @Get('notifications')
  async notificationsList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.notifications.list(auth, { id }, body, query));
  }
}
