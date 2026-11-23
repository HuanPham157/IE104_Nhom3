import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentAssignmentsService } from './student-assignments.service';
import { StudentHistoryService } from './student-history.service';

@Module({
  controllers: [StudentController],
  providers: [StudentAssignmentsService, StudentHistoryService],
})
export class StudentModule {}
