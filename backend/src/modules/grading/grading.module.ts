import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';

@Module({
  imports: [SubmissionsModule],
  controllers: [GradingController],
  providers: [GradingService],
})
export class GradingModule {}
