import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { AcademicRequestsService } from './academic-requests.service';

@Module({
  controllers: [ProfilesController],
  providers: [AcademicRequestsService],
})
export class ProfilesModule {}
