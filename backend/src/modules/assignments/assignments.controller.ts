import { Controller, Delete, Get, Patch, Post, Put, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthContext } from '../../common/auth/auth.types';
import { JsonBody } from '../../common/http/json-body.decorator';
import { CurrentUser, Roles } from '../../common/auth/roles.decorator';
import { reply } from '../../common/http/api-result';
import type { RouteQuery } from '../../common/http/route-types';
import { ClassAssignmentsService } from './class-assignments.service';
import { AssignmentsService } from './assignments.service';
import { AssignmentPublishService } from './assignment-publish.service';
import { AssignmentMaxAttemptsService } from './assignment-max-attempts.service';
import { AssignmentReferenceAnswerService } from './assignment-reference-answer.service';
import { AssignmentResultsService } from './assignment-results.service';

/** Bài tập: soạn theo lớp, xem đề, đổi trạng thái, sửa nháp, xóa, công bố điểm, cài đặt, kết quả. */
@Controller()
export class AssignmentsController {
  constructor(
    private readonly classAssignments: ClassAssignmentsService,
    private readonly assignments: AssignmentsService,
    private readonly publish: AssignmentPublishService,
    private readonly maxAttempts: AssignmentMaxAttemptsService,
    private readonly referenceAnswer: AssignmentReferenceAnswerService,
    private readonly results: AssignmentResultsService,
  ) {}

  @Get('classes/:id/assignments')
  async classAssignmentsList(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.classAssignments.list(auth, { id }, body, query));
  }

  @Post('classes/:id/assignments')
  @Roles('lecturer', 'admin')
  async classAssignmentsCreate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.classAssignments.create(auth, { id }, body, query));
  }

  @Get('assignments/:id')
  async assignmentsDetail(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.assignments.detail(auth, { id }, body, query));
  }

  @Patch('assignments/:id')
  @Roles('lecturer', 'admin')
  async assignmentsSetStatus(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.assignments.setStatus(auth, { id }, body, query));
  }

  @Put('assignments/:id')
  @Roles('lecturer', 'admin')
  async assignmentsUpdateDraft(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.assignments.updateDraft(auth, { id }, body, query));
  }

  @Delete('assignments/:id')
  @Roles('lecturer', 'admin')
  async assignmentsRemove(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.assignments.remove(auth, { id }, body, query));
  }

  @Post('assignments/:id/publish')
  @Roles('lecturer', 'admin')
  async publishPublish(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.publish.publish(auth, { id }, body, query));
  }

  @Put('assignments/:id/max-attempts')
  @Roles('lecturer', 'admin')
  async maxAttemptsUpdate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.maxAttempts.update(auth, { id }, body, query));
  }

  @Put('assignments/:id/reference-answer')
  @Roles('lecturer', 'admin')
  async referenceAnswerUpdate(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.referenceAnswer.update(auth, { id }, body, query));
  }

  @Get('assignments/:id/results')
  @Roles('student')
  async resultsResults(@CurrentUser() auth: AuthContext, @Param('id') id: string, @JsonBody() body: unknown, @Query() query: RouteQuery, @Res() res: Response) {
    reply(res, await this.results.results(auth, { id }, body, query));
  }
}
