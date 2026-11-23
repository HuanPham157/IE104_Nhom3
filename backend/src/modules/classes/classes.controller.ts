import { Controller, Delete, Get, Patch, Post, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { ClassesService } from './classes.service';
import { ClassJoinService } from './class-join.service';
import { ClassDetailService } from './class-detail.service';
import { ClassCancelService } from './class-cancel.service';
import { ClassMembersService } from './class-members.service';
import { ClassStatsService } from './class-stats.service';

/** Lớp học: danh sách, tạo, tham gia bằng mã, sửa/xóa, yêu cầu hủy, thành viên, thống kê. */
@Controller()
export class ClassesController {
  constructor(
    private readonly classes: ClassesService,
    private readonly join: ClassJoinService,
    private readonly detail: ClassDetailService,
    private readonly cancel: ClassCancelService,
    private readonly members: ClassMembersService,
    private readonly stats: ClassStatsService,
  ) {}

  @Get('classes')
  async classesList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.classes.list(auth, { id }, body, query));
  }

  @Post('classes')
  @Roles('lecturer', 'admin')
  async classesCreate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.classes.create(auth, { id }, body, query));
  }

  @Post('classes/join')
  @Roles('student')
  async joinJoin(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.join.join(auth, { id }, body, query));
  }

  @Patch('classes/:id')
  @Roles('lecturer', 'admin')
  async detailUpdate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.detail.update(auth, { id }, body, query));
  }

  @Delete('classes/:id')
  @Roles('admin')
  async detailRemove(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.detail.remove(auth, { id }, body, query));
  }

  @Get('classes/:id/cancel')
  @Roles('lecturer', 'admin')
  async cancelPending(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.cancel.pending(auth, { id }, body, query));
  }

  @Post('classes/:id/cancel')
  @Roles('lecturer')
  async cancelRequest(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.cancel.request(auth, { id }, body, query));
  }

  @Get('classes/:id/members')
  @Roles('lecturer', 'admin')
  async membersList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.members.list(auth, { id }, body, query));
  }

  @Delete('classes/:id/members')
  @Roles('lecturer', 'admin')
  async membersRemove(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.members.remove(auth, { id }, body, query));
  }

  @Get('classes/:id/stats')
  @Roles('lecturer', 'admin')
  async statsStats(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.stats.stats(auth, { id }, body, query));
  }
}
