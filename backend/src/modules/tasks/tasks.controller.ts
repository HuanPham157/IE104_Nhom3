import { Controller, Delete, Get, Patch, Post, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { TasksService } from './tasks.service';
import { TaskDetailService } from './task-detail.service';

/** Việc cá nhân của sinh viên (service tự kiểm tra vai trò để giữ thông báo lỗi riêng). */
@Controller()
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly taskDetail: TaskDetailService,
  ) {}

  @Get('tasks')
  async tasksList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.tasks.list(auth, { id }, body, query));
  }

  @Post('tasks')
  async tasksCreate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.tasks.create(auth, { id }, body, query));
  }

  @Patch('tasks/:id')
  async taskDetailUpdate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.taskDetail.update(auth, { id }, body, query));
  }

  @Delete('tasks/:id')
  async taskDetailRemove(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.taskDetail.remove(auth, { id }, body, query));
  }
}
