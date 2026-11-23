import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { SupabaseService } from '../common/supabase/supabase.service';
import { AiServiceError } from '../integrations/ai-service.client';
import { AsrService } from '../integrations/asr.service';
import { GraderService, type GradingContext } from '../integrations/grader.service';
import { ANSWER_PROCESSING_QUEUE, type AnswerJob } from '../queue/jobs';
import { QueueService } from '../queue/queue.service';

const AUDIO_BUCKET = 'oral-answers';

type AnswerRow = { id: string; question_id: string; audio_storage_path: string; status: string };
type TranscriptRow = { transcript_text: string; is_edited: boolean };

/** Thông điệp an toàn để lưu vào submissions.error_message (người dùng sẽ đọc). */
const userMessage = (error: unknown) =>
  error instanceof AiServiceError ? error.message : 'Lỗi hệ thống khi xử lý bài làm. Vui lòng thử lại.';

/**
 * Worker xử lý queue "answer-processing": ASR (Whisper) → chấm theo rubric → lưu điểm.
 * Chạy trong process riêng (npm run worker), dùng service role nên mọi bước ghi đi qua RPC worker_* / save_ai_evaluation.
 * Trạng thái được giữ trong bảng submissions (queued → processing → queued/ready/failed) để frontend theo dõi.
 */
@Injectable()
export class GradingWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(GradingWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly supabase: SupabaseService,
    private readonly asr: AsrService,
    private readonly grader: GraderService,
  ) {}

  async onApplicationBootstrap() {
    const boss = await this.queue.getBoss();
    const concurrency = env().WORKER_CONCURRENCY;
    for (let index = 0; index < concurrency; index += 1) {
      await boss.work<AnswerJob>(ANSWER_PROCESSING_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 }, async ([job]) => {
        if (job) await this.process(job.data);
      });
    }
    this.logger.log(`Đang lắng nghe queue "${ANSWER_PROCESSING_QUEUE}" với ${concurrency} luồng xử lý`);
  }

  /** Không ném lỗi ra ngoài: lỗi được ghi vào câu trả lời, job vẫn coi là xong (không retry tự động). */
  async process(job: AnswerJob) {
    const db = this.supabase.service();
    const started = Date.now();

    const { data: answer, error: answerError } = await db
      .from('submissions')
      .select('id,question_id,audio_storage_path,status')
      .eq('id', job.submissionId)
      .maybeSingle<AnswerRow>();
    if (answerError || !answer) {
      this.logger.warn(`Bỏ qua job: không tìm thấy câu trả lời ${job.submissionId}`);
      return;
    }

    let transcript = await this.latestTranscript(db, answer.id);

    if (!transcript) {
      const claimed = await this.claim(db, answer.id);
      if (!claimed) return;
      try {
        transcript = await this.runAsr(db, answer);
      } catch (error) {
        await this.fail(db, answer.id, error, 'ASR');
        return;
      }
    }
    if (!job.grade) {
      this.logger.log(`ASR xong ${answer.id} trong ${Date.now() - started} ms`);
      return;
    }

    const studentId = await this.claim(db, answer.id);
    if (!studentId) return;
    try {
      await this.runGrading(db, studentId, answer.id, transcript);
      this.logger.log(`Chấm xong ${answer.id} (${job.requestedBy}) trong ${Date.now() - started} ms`);
    } catch (error) {
      await this.fail(db, answer.id, error, 'chấm điểm');
    }
  }

  private async latestTranscript(db: SupabaseClient, submissionId: string): Promise<TranscriptRow | null> {
    const { data } = await db
      .from('transcriptions')
      .select('transcript_text,is_edited')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<TranscriptRow>();
    return data?.transcript_text?.trim() ? data : null;
  }

  /** Giành quyền xử lý (status → processing). Trả student_id, hoặc null nếu job khác đang xử lý câu này. */
  private async claim(db: SupabaseClient, submissionId: string): Promise<string | null> {
    const { data, error } = await db.rpc('worker_claim_answer', { p_submission_id: submissionId });
    if (error) {
      this.logger.error(`Không claim được ${submissionId} (code ${error.code ?? 'unknown'}). Đã chạy migration 012?`);
      return null;
    }
    if (!data) this.logger.warn(`Bỏ qua ${submissionId}: đang được xử lý hoặc không ở trạng thái chờ`);
    return data ? String(data) : null;
  }

  private async runAsr(db: SupabaseClient, answer: AnswerRow): Promise<TranscriptRow> {
    const { data: audio, error: audioError } = await db.storage.from(AUDIO_BUCKET).download(answer.audio_storage_path);
    if (audioError || !audio) throw new AiServiceError('Không thể tải audio bài nộp từ kho lưu trữ');

    const { data: question } = await db.from('questions').select('content').eq('id', answer.question_id).maybeSingle();
    const result = await this.asr.transcribe(audio, answer.audio_storage_path.split('/').pop() ?? 'answer.webm', {
      language: 'vi',
      prompt: question?.content ? String(question.content) : undefined,
    });

    const { error } = await db.rpc('worker_save_transcription', {
      p_submission_id: answer.id,
      p_transcript_text: result.transcript,
      p_engine_name: result.engine,
      p_language_code: 'vi',
    });
    if (error) {
      this.logger.error(`Không lưu được transcript ${answer.id} (code ${error.code ?? 'unknown'})`);
      throw new AiServiceError('Không thể lưu transcript');
    }
    return { transcript_text: result.transcript, is_edited: false };
  }

  private async runGrading(db: SupabaseClient, studentId: string, submissionId: string, transcript: TranscriptRow) {
    const { data: context, error: contextError } = await db.rpc('get_submission_grading_context', {
      p_student_id: studentId,
      p_submission_id: submissionId,
    });
    if (contextError || !context) throw new AiServiceError('Không thể tải rubric để chấm bài');

    const result = await this.grader.grade(context as GradingContext, transcript.transcript_text);

    const { error: saveError } = await db.rpc('save_ai_evaluation', {
      p_student_id: studentId,
      p_submission_id: submissionId,
      p_transcript_text: transcript.transcript_text,
      p_engine_name: `faster-whisper-${env().WHISPER_MODEL}`,
      p_language_code: 'vi',
      p_model_name: result.engine,
      p_suggested_score: result.suggested_score,
      p_feedback_summary: result.feedback_summary,
      p_criteria: result.criteria,
      p_is_transcript_edited: transcript.is_edited,
      p_needs_teacher_review: result.needs_teacher_review,
    });
    if (saveError) {
      this.logger.error(`Không lưu được kết quả AI ${submissionId} (code ${saveError.code ?? 'unknown'})`);
      throw new AiServiceError('Không thể lưu kết quả chấm AI');
    }
  }

  private async fail(db: SupabaseClient, submissionId: string, error: unknown, step: string) {
    const message = userMessage(error);
    this.logger.warn(`Lỗi ${step} ${submissionId}: ${error instanceof Error ? error.message : 'unknown'}`);
    const { error: failError } = await db.rpc('worker_fail_answer', { p_submission_id: submissionId, p_error_message: message });
    if (failError) this.logger.error(`Không đánh dấu lỗi được ${submissionId} (code ${failError.code ?? 'unknown'})`);
  }
}
