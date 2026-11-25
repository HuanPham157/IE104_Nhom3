import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassJoinService } from './class-join.service';
import { ClassDetailService } from './class-detail.service';
import { ClassCancelService } from './class-cancel.service';
import { ClassMembersService } from './class-members.service';
import { ClassStatsService } from './class-stats.service';

@Module({
  controllers: [ClassesController],
  providers: [ClassesService, ClassJoinService, ClassDetailService, ClassCancelService, ClassMembersService, ClassStatsService],
})
export class ClassesModule {}
