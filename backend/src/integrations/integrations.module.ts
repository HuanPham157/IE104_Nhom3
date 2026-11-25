import { Module } from '@nestjs/common';
import { AiServiceClient } from './ai-service.client';
import { AsrService } from './asr.service';
import { GraderService } from './grader.service';

@Module({
  providers: [AiServiceClient, AsrService, GraderService],
  exports: [AsrService, GraderService],
})
export class IntegrationsModule {}
