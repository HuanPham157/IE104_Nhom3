import { Module } from '@nestjs/common';
import { SupabaseModule } from './common/supabase/supabase.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { QueueModule } from './queue/queue.module';
import { GradingWorker } from './workers/grading.worker';

/** Process worker: không mở cổng HTTP, chỉ lấy job từ hàng đợi và gọi ai-service. */
@Module({
  imports: [SupabaseModule, QueueModule, IntegrationsModule],
  providers: [GradingWorker],
})
export class WorkerModule {}
