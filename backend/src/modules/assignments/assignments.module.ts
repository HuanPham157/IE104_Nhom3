import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { ClassAssignmentsService } from './class-assignments.service';
import { AssignmentsService } from './assignments.service';
import { AssignmentPublishService } from './assignment-publish.service';
import { AssignmentMaxAttemptsService } from './assignment-max-attempts.service';
import { AssignmentReferenceAnswerService } from './assignment-reference-answer.service';
import { AssignmentResultsService } from './assignment-results.service';

@Module({
  controllers: [AssignmentsController],
  providers: [ClassAssignmentsService, AssignmentsService, AssignmentPublishService, AssignmentMaxAttemptsService, AssignmentReferenceAnswerService, AssignmentResultsService],
})
export class AssignmentsModule {}
