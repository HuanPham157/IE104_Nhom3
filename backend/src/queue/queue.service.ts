import { Injectable, Logger, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import PgBoss from 'pg-boss';
import { env } from '../config/env';
import { ANSWER_PROCESSING_QUEUE, type AnswerJob } from './jobs';

/**
 * Bọc pg-boss: hàng đợi job nằm ngay trong Postgres của Supabase (schema pgboss), không cần Redis.
 * API chỉ gửi job; worker (src/worker.ts) mới gọi AI.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private boss: PgBoss | null = null;
  private starting: Promise<PgBoss> | null = null;

  async getBoss(): Promise<PgBoss> {
    if (this.boss) return this.boss;
    this.starting ??= (async () => {
      const boss = new PgBoss({ connectionString: env().DATABASE_URL, max: 4, application_name: 'oralcheck-queue' });
      boss.on('error', (error: Error) => this.logger.error(`pg-boss: ${error.message}`));
      await boss.start();
      await boss.createQueue(ANSWER_PROCESSING_QUEUE, {
        name: ANSWER_PROCESSING_QUEUE,
        // Whisper + chấm có thể mất vài phút; quá 15 phút coi như treo.
        expireInSeconds: 15 * 60,
        // Lỗi đã được ghi vào submissions.error_message; người dùng tự bấm thử lại khi cần.
        retryLimit: 0,
        retentionMinutes: 24 * 60,
      });
      this.boss = boss;
      return boss;
    })().catch((error: unknown) => {
      this.starting = null;
      throw error;
    });
    return this.starting;
  }

  /** Gửi job xử lý câu trả lời. Cùng submission + loại job đang chờ thì không tạo trùng (singletonKey). */
  async enqueueAnswer(job: AnswerJob): Promise<string | null> {
    let boss: PgBoss;
    try {
      boss = await this.getBoss();
    } catch (error) {
      this.logger.error(`Không kết nối được hàng đợi: ${error instanceof Error ? error.message : 'unknown'}`);
      throw new ServiceUnavailableException('Hàng đợi xử lý chưa sẵn sàng. Kiểm tra DATABASE_URL của backend.');
    }
    return boss.send(ANSWER_PROCESSING_QUEUE, job, {
      singletonKey: `${job.submissionId}:${job.grade ? 'grade' : 'asr'}`,
    });
  }

  async onModuleDestroy() {
    await this.boss?.stop({ graceful: true, wait: true }).catch(() => undefined);
  }
}
