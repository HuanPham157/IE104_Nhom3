import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { isMissingFunction, reportDatabaseError } from '../../common/http/validation';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { QueueService } from '../../queue/queue.service';

export const AUDIO_BUCKET = 'oral-answers';
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

export type UploadedAudio = { buffer: Buffer; mimetype: string; size: number };
export type TranscriptEdit = { submission_id: string; transcript_text: string };

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly queue: QueueService,
  ) {}

  private async loadAttemptTimer(auth: AuthContext, attemptId: string) {
    const { data, error } = await auth.db
      .from('assignment_submissions')
      .select('id,status,started_at,deadline_at')
      .eq('id', attemptId)
      .eq('student_id', auth.userId)
      .single();
    if (error) {
      reportDatabaseError('Unable to load attempt timer', error);
      throw new InternalServerErrorException('Không tải được thời gian làm bài');
    }
    return data as { id: string; status: string; started_at: string; deadline_at: string | null };
  }

  /** Sinh viên bấm "Bắt đầu làm bài": tạo lượt làm (nếu chưa có) và trả về thời điểm hết giờ. */
  async start(auth: AuthContext, assignmentId: string) {
    const { data: attemptId, error } = await auth.db.rpc('start_assignment_submission', { p_assignment_id: assignmentId });
    if (error) {
      reportDatabaseError('Unable to start assignment', error);
      if (error.message.includes('already been finalized')) throw new ConflictException('Bạn đã nộp bài tập này');
      throw new ForbiddenException('Bài tập chưa mở, đã đóng hoặc bạn không thuộc lớp này');
    }
    const attempt = await this.loadAttemptTimer(auth, String(attemptId));
    return { attempt_id: attempt.id, status: attempt.status, started_at: attempt.started_at, deadline_at: attempt.deadline_at };
  }

  /** Lượt làm lại: còn lượt, còn hạn nộp, lượt trước đã có điểm. */
  async retake(auth: AuthContext, assignmentId: string) {
    const { data: attemptId, error } = await auth.db.rpc('start_assignment_retake', { p_assignment_id: assignmentId });
    if (error) {
      reportDatabaseError('Unable to start assignment retake', error);
      if (isMissingFunction(error)) throw new ServiceUnavailableException('Máy chủ chưa chạy 07_assignments.sql / 08_submissions.sql để cho làm lại bài.');
      if (error.message.includes('Attempt limit reached')) throw new ConflictException('Bạn đã dùng hết số lần làm bài này.');
      if (error.message.includes('no score yet')) {
        throw new ConflictException('Lượt trước chưa có điểm. Hãy chờ AI chấm xong hoặc giảng viên công bố điểm rồi làm lại.');
      }
      if (error.message.includes('No previous attempt')) throw new ConflictException('Bạn chưa làm bài này lần nào.');
      throw new ForbiddenException('Bài tập đã hết hạn nộp hoặc bạn không còn thuộc lớp này.');
    }
    const attempt = await this.loadAttemptTimer(auth, String(attemptId));
    return { attempt_id: attempt.id, status: attempt.status, started_at: attempt.started_at, deadline_at: attempt.deadline_at };
  }

  /**
   * Lưu một bản ghi âm: tải lên Storage, ghi nhận vào DB, rồi gửi job ASR vào hàng đợi.
   * Trả về ngay (status "queued"); frontend theo dõi qua GET /submissions/:id/status.
   */
  async uploadAnswer(auth: AuthContext, assignmentId: string, questionId: string, audio: UploadedAudio, durationSeconds: number | null) {
    const mimeType = audio.mimetype.split(';', 1)[0].trim().toLowerCase();
    if (!(mimeType in AUDIO_TYPES) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
      throw new BadRequestException('Tệp phải là âm thanh được hỗ trợ và không vượt quá 25 MB');
    }

    const { data: attemptId, error: attemptError } = await auth.db.rpc('start_assignment_submission', { p_assignment_id: assignmentId });
    if (attemptError) {
      reportDatabaseError('Unable to start assignment submission', attemptError);
      throw new ForbiddenException('Bài tập chưa mở, đã đóng hoặc bạn không thuộc lớp này');
    }

    const storagePath = `${auth.userId}/${assignmentId}/${questionId}/${randomUUID()}.${AUDIO_TYPES[mimeType]}`;
    const { error: uploadError } = await auth.db.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, audio.buffer, { contentType: mimeType, upsert: false });
    if (uploadError) {
      reportDatabaseError('Unable to store student audio', uploadError);
      throw new InternalServerErrorException('Không thể lưu tệp ghi âm');
    }

    const { data: submissionId, error: recordError } = await auth.db.rpc('record_submission_answer', {
      p_assignment_submission_id: attemptId,
      p_question_id: questionId,
      p_audio_storage_path: storagePath,
      p_audio_mime_type: mimeType,
      p_audio_size_bytes: audio.size,
      p_audio_duration_seconds: durationSeconds,
    });
    if (recordError) {
      reportDatabaseError('Unable to record uploaded student answer', recordError);
      const { error: cleanupError } = await auth.db.storage.from(AUDIO_BUCKET).remove([storagePath]);
      if (cleanupError) reportDatabaseError('Unable to remove unrecorded student audio', cleanupError);
      if (recordError.message.includes('Version limit reached')) throw new ConflictException('Mỗi câu chỉ được lưu tối đa 5 phiên bản ghi âm');
      if (recordError.message.includes('Exam time is over')) throw new ConflictException('Đã hết thời gian làm bài, không thể tải thêm ghi âm');
      throw new BadRequestException('Không thể ghi nhận câu trả lời cho câu hỏi');
    }

    const attempt = await this.loadAttemptTimer(auth, String(attemptId));
    // Ghi âm đã lưu an toàn; nếu hàng đợi lỗi thì sinh viên vẫn bấm "Tạo transcript" để gửi lại.
    const queued = await this.queue.enqueueAnswer({ submissionId: String(submissionId), grade: false, requestedBy: 'student' })
      .then(() => true)
      .catch(() => false);
    return {
      id: submissionId,
      assignment_submission_id: attempt.id,
      started_at: attempt.started_at,
      deadline_at: attempt.deadline_at,
      transcription_queued: queued,
    };
  }

  /** Chọn một phiên bản ghi âm làm bản nộp chính thức cho câu hỏi. */
  async selectVersion(auth: AuthContext, submissionId: string) {
    const { error } = await auth.db.rpc('select_final_answer_version', { p_submission_id: submissionId });
    if (error) {
      reportDatabaseError('Unable to select final answer version', error);
      if (isMissingFunction(error)) {
        throw new ServiceUnavailableException('Máy chủ chưa chạy 08_submissions.sql để hỗ trợ nhiều phiên bản ghi âm.');
      }
      throw new ConflictException('Không thể chọn phiên bản này: bài đã nộp hoặc đã hết giờ');
    }
    return { id: submissionId, is_final: true };
  }

  /** Gửi job ASR (lần đầu lỗi, hoặc sinh viên bấm "Thử nhận dạng lại"). */
  async requestTranscription(auth: AuthContext, submissionId: string) {
    await this.assertCanEnqueue(auth, submissionId, 'transcribe');
    await this.queue.enqueueAnswer({ submissionId, grade: false, requestedBy: 'student' });
    return { id: submissionId, status: 'queued' };
  }

  /**
   * Nộp bài: lưu các transcript sinh viên đã sửa, khóa lượt làm, rồi gửi job chấm cho từng câu đã chọn.
   * Không chờ AI — điểm xuất hiện dần khi worker chấm xong.
   */
  async submit(auth: AuthContext, assignmentId: string, attemptId: string, edits: TranscriptEdit[]) {
    const { data: attempt, error: attemptError } = await auth.db
      .from('assignment_submissions')
      .select('id')
      .eq('id', attemptId)
      .eq('assignment_id', assignmentId)
      .eq('student_id', auth.userId)
      .maybeSingle();
    if (attemptError) {
      reportDatabaseError('Unable to validate assignment submission', attemptError);
      throw new InternalServerErrorException('Không thể xác minh bài nộp');
    }
    if (!attempt) throw new NotFoundException('Không tìm thấy bài nộp');

    for (const edit of edits) {
      const { error } = await auth.db.rpc('save_student_transcript_edit', {
        p_submission_id: edit.submission_id,
        p_transcript_text: edit.transcript_text,
      });
      if (error) {
        reportDatabaseError('Unable to save student transcript edit', error);
        if (isMissingFunction(error)) throw new ServiceUnavailableException('Máy chủ chưa chạy 08_submissions.sql.');
        throw new ConflictException('Không lưu được transcript đã sửa. Câu trả lời có thể đang được nhận dạng, hãy thử lại sau giây lát.');
      }
    }

    const { data, error } = await auth.db.rpc('finalize_assignment_submission', { p_assignment_submission_id: attempt.id });
    if (error) {
      reportDatabaseError('Unable to finalize assignment submission', error);
      throw new BadRequestException('Cần ghi âm đầy đủ tất cả câu hỏi trước khi nộp');
    }

    const { data: finals, error: finalsError } = await auth.db
      .from('submissions')
      .select('id')
      .eq('assignment_submission_id', attempt.id)
      .eq('is_final', true);
    if (finalsError) reportDatabaseError('Unable to list final answers for grading', finalsError);

    let queued = 0;
    for (const answer of finals ?? []) {
      const ok = await this.queue.enqueueAnswer({ submissionId: answer.id as string, grade: true, requestedBy: 'student' })
        .then(() => true)
        .catch(() => false);
      if (ok) queued += 1;
    }
    return { submission_id: data, status: 'submitted', grading_queued: queued };
  }

  /** Trạng thái xử lý của một câu trả lời (frontend gọi định kỳ khi đang chờ ASR / chấm). */
  async status(auth: AuthContext, submissionId: string) {
    // Truy vấn bằng client của người gọi: RLS quyết định ai được xem câu trả lời này.
    const { data: answer, error } = await auth.db
      .from('submissions')
      .select('id,status,error_message')
      .eq('id', submissionId)
      .maybeSingle();
    if (error) {
      reportDatabaseError('Unable to load answer status', error);
      throw new InternalServerErrorException('Không thể tải trạng thái bài làm');
    }
    if (!answer) throw new NotFoundException('Không tìm thấy câu trả lời');

    const service = this.supabase.service();
    const [{ data: transcripts }, { count }] = await Promise.all([
      service
        .from('transcriptions')
        .select('transcript_text,created_at')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true }),
      service.from('evaluations').select('id', { count: 'exact', head: true }).eq('submission_id', submissionId),
    ]);
    const list = transcripts ?? [];
    return {
      id: answer.id,
      status: answer.status as string,
      error_message: (answer.error_message as string | null) ?? null,
      transcript: (list.at(-1)?.transcript_text as string | undefined) ?? null,
      original_transcript: (list[0]?.transcript_text as string | undefined) ?? null,
      graded: (count ?? 0) > 0,
    };
  }

  async assertCanEnqueue(auth: AuthContext, submissionId: string, kind: 'transcribe' | 'grade') {
    const { data: allowed, error } = await auth.db.rpc('can_enqueue_answer_job', { p_submission_id: submissionId, p_kind: kind });
    if (error) {
      reportDatabaseError('Unable to check job permission', error);
      if (isMissingFunction(error)) throw new ServiceUnavailableException('Máy chủ chưa chạy 09_grading.sql cho hàng đợi xử lý.');
      throw new InternalServerErrorException('Không thể kiểm tra quyền xử lý bài làm');
    }
    if (!allowed) {
      throw new ConflictException(kind === 'transcribe'
        ? 'Bài làm đang được nhận dạng hoặc không còn ở trạng thái cho phép.'
        : 'Câu trả lời đang được chấm, đã công bố điểm hoặc chưa được nộp.');
    }
  }
}
