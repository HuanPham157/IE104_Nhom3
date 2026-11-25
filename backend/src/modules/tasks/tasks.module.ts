import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskDetailService } from './task-detail.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TaskDetailService],
})
export class TasksModule {}
