import { Controller, Get, Patch, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { AdminUsersService } from './admin-users.service';
import { AdminUserDetailService } from './admin-user-detail.service';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalRequestReviewService } from './approval-request-review.service';

/** Quản trị: tài khoản (khóa/mở khóa, học hàm) và duyệt yêu cầu (mở/hủy lớp, học hàm). */
@Controller()
export class AdminController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly userDetail: AdminUserDetailService,
    private readonly requests: ApprovalRequestsService,
    private readonly review: ApprovalRequestReviewService,
  ) {}

  @Get('admin/users')
  @Roles('admin')
  async usersList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.users.list(auth, { id }, body, query));
  }

  @Patch('admin/users/:id')
  @Roles('admin')
  async userDetailUpdate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.userDetail.update(auth, { id }, body, query));
  }

  @Get('admin/approval-requests')
  @Roles('admin')
  async requestsList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.requests.list(auth, { id }, body, query));
  }

  @Patch('admin/approval-requests/:id')
  @Roles('admin')
  async reviewReview(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.review.review(auth, { id }, body, query));
  }
}
