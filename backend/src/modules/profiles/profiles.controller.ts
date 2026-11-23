import { Controller, Get, Post, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { AcademicRequestsService } from './academic-requests.service';

/** Hồ sơ giảng viên: yêu cầu cập nhật học hàm / học vị. */
@Controller()
export class ProfilesController {
  constructor(
    private readonly academic: AcademicRequestsService,
  ) {}

  @Get('lecturer/academic-requests')
  @Roles('lecturer')
  async academicList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.academic.list(auth, { id }, body, query));
  }

  @Post('lecturer/academic-requests')
  @Roles('lecturer')
  async academicCreate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.academic.create(auth, { id }, body, query));
  }
}
