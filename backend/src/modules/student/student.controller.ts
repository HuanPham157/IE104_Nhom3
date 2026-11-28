import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { StudentAssignmentsService } from './student-assignments.service';
import { StudentHistoryService } from './student-history.service';

/** Sinh viên: bài tập của các lớp đang tham gia và lịch sử bài nộp. */
@Controller()
export class StudentController {
  constructor(
    private readonly assignments: StudentAssignmentsService,
    private readonly history: StudentHistoryService,
  ) {}

  @Get('student/assignments')
  @Roles('student')
  async assignmentsList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.assignments.list(auth, { id }, body, query));
  }

  @Get('student/history')
  @Roles('student')
  async historyHistory(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.history.history(auth, { id }, body, query));
  }
}
