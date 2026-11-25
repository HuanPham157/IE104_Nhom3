import { Module } from '@nestjs/common';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { GradingModule } from './modules/grading/grading.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { StudentModule } from './modules/student/student.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { QueueModule } from './queue/queue.module';

/** HTTP API. Không import IntegrationsModule: API không gọi AI trực tiếp, chỉ gửi job vào hàng đợi. */
@Module({
  imports: [
    SupabaseModule,
    QueueModule,
    AuthModule,
    ClassesModule,
    AssignmentsModule,
    SubmissionsModule,
    GradingModule,
    StudentModule,
    ProfilesModule,
    AdminModule,
    NotificationsModule,
    TasksModule,
  ],
})
export class AppModule {}
