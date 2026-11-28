import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminUserDetailService } from './admin-user-detail.service';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalRequestReviewService } from './approval-request-review.service';

@Module({
  controllers: [AdminController],
  providers: [AdminUsersService, AdminUserDetailService, ApprovalRequestsService, ApprovalRequestReviewService],
})
export class AdminModule {}
