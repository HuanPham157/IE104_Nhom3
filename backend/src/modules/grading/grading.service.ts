import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { isMissingFunction, reportDatabaseError } from '../../common/http/validation';
import { QueueService } from '../../queue/queue.service';
import { AUDIO_BUCKET, SubmissionsService } from '../submissions/submissions.service';

/** Kiểm tra lỗi của một loạt truy vấn; lỗi đầu tiên được ghi log và trả 500 với thông điệp chung. */
function assertNoErrors(message: string, results: Array<{ context: string; error: { code?: string; message?: string } | null }>) {
  const failed = results.filter((item) => item.error);
  if (failed.length === 0) return;
  for (const item of failed) reportDatabaseError(item.context, item.error!);
  throw new InternalServerErrorException(message);
}

export type ReviewInput = { final_score: number; reviewer_feedback?: string | null; score_modified: boolean };

@Injectable()
export class GradingService {
  constructor(
    private readonly queue: QueueService,
    private readonly submissions: SubmissionsService,
  ) {}

  /** Sinh viên (sau khi nộp) hoặc giảng viên yêu cầu AI chấm / chấm lại một câu trả lời — chỉ gửi job. */
  async requestGrading(auth: AuthContext, submissionId: string) {
    await this.submissions.assertCanEnqueue(auth, submissionId, 'grade');
    await this.queue.enqueueAnswer({ submissionId, grade: true, requestedBy: auth.role });
    return { id: submissionId, status: 'queued' };
  }

  /** Giảng viên sửa hoặc tải lên transcript (trước khi công bố điểm). */
  async saveLecturerTranscript(auth: AuthContext, submissionId: string, transcript: string) {
    const { data, error } = await auth.db.rpc('save_lecturer_transcription', {
      p_submission_id: submissionId,
      p_transcript_text: transcript,
    });
    if (error) {
      reportDatabaseError('Unable to save lecturer transcript', error);
      if (isMissingFunction(error)) throw new ServiceUnavailableException('Máy chủ chưa chạy migration để giảng viên sửa transcript.');
      if (error.message.includes('not available')) throw new ConflictException('Không thể sửa transcript: bài chưa nộp hoặc điểm đã được công bố.');
      throw new BadRequestException('Không thể lưu transcript');
    }
    return { id: data };
  }

  /** Giảng viên duyệt / sửa điểm một câu trả lời. */
  async review(auth: AuthContext, submissionId: string, input: ReviewInput) {
    const { data, error } = await auth.db.rpc('review_submission', {
      p_submission_id: submissionId,
      p_final_score: input.final_score,
      p_reviewer_feedback: input.reviewer_feedback ?? null,
      p_score_modified: input.score_modified,
    });
    if (error) {
      reportDatabaseError('Unable to save lecturer grade review', error);
      if (error.message.includes('Submitted answer not found or forbidden')) {
        throw new NotFoundException('Bài làm chưa được nộp hoặc bạn không phụ trách lớp này');
      }
      throw new BadRequestException('Không thể lưu điểm; hãy kiểm tra giới hạn điểm và nhận xét');
    }
    return data;
  }

  /** Chi tiết một câu trả lời cho giảng viên: audio (signed URL), rubric, transcript, đánh giá AI, điểm đã duyệt. */
  async answerDetail(auth: AuthContext, submissionId: string) {
    const db = auth.db;
    const { data: answer, error: answerError } = await db
      .from('submissions')
      .select('id,assignment_submission_id,question_id,student_id,audio_storage_path,audio_mime_type,audio_duration_seconds,audio_size_bytes,attempt_number,status,submitted_at,error_message')
      .eq('id', submissionId)
      .maybeSingle();
    assertNoErrors('Không thể tải bài làm', [{ context: 'Unable to load answer', error: answerError }]);
    if (!answer) throw new NotFoundException('Không tìm thấy câu trả lời');

    const [attemptResult, questionResult, studentResult] = await Promise.all([
      db.from('lecturer_assignment_submissions')
        .select('id,assignment_id,student_id,status,started_at,submitted_at,graded_at,total_score')
        .eq('id', answer.assignment_submission_id).maybeSingle(),
      db.from('lecturer_questions')
        .select('id,assignment_id,content,reference_answer,position,max_score,time_limit_seconds')
        .eq('id', answer.question_id).maybeSingle(),
      db.from('users').select('id,full_name').eq('id', answer.student_id).maybeSingle(),
    ]);
    assertNoErrors('Không thể tải chi tiết bài làm', [
      { context: 'Unable to load answer attempt', error: attemptResult.error },
      { context: 'Unable to load answer question', error: questionResult.error },
      { context: 'Unable to load answer student', error: studentResult.error },
    ]);
    const attempt = attemptResult.data;
    const question = questionResult.data;
    if (!attempt || !question) throw new NotFoundException('Dữ liệu bài làm không đầy đủ');

    const [assignmentResult, rubricResult, signedResult, reviewResult, transcriptResult, evaluationResult] = await Promise.all([
      db.from('assignments').select('id,title,class_id,results_published_at').eq('id', attempt.assignment_id).maybeSingle(),
      db.from('lecturer_rubric_criteria').select('id,criterion_text,max_points,position').eq('question_id', question.id).order('position'),
      db.storage.from(AUDIO_BUCKET).createSignedUrl(answer.audio_storage_path, 1800),
      db.from('grade_reviews')
        .select('id,final_score,reviewer_feedback,score_modified,reviewed_at,updated_at')
        .eq('submission_id', submissionId).maybeSingle(),
      db.from('transcriptions')
        .select('id,transcript_text,engine_name,language_code,is_edited,created_at')
        .eq('submission_id', submissionId).order('created_at', { ascending: false }).limit(1),
      db.from('evaluations')
        .select('id,transcription_id,model_name,suggested_score,feedback_summary,needs_teacher_review,created_at')
        .eq('submission_id', submissionId).order('created_at', { ascending: false }).limit(1),
    ]);
    assertNoErrors('Không thể tải thông tin chấm bài', [
      { context: 'Unable to load answer assignment', error: assignmentResult.error },
      { context: 'Unable to load answer rubric', error: rubricResult.error },
      { context: 'Unable to create signed audio URL', error: signedResult.error },
      { context: 'Unable to load grade review', error: reviewResult.error },
      { context: 'Unable to load answer transcript', error: transcriptResult.error },
      { context: 'Unable to load AI evaluation', error: evaluationResult.error },
    ]);

    const evaluation = evaluationResult.data?.[0] ?? null;
    let criteria: unknown[] = [];
    if (evaluation) {
      const { data, error } = await db
        .from('evaluation_criterion_scores')
        .select('criterion_id,awarded_points,assessment,evidence_excerpt,explanation')
        .eq('evaluation_id', evaluation.id);
      assertNoErrors('Không thể tải điểm theo rubric', [{ context: 'Unable to load AI criterion scores', error }]);
      criteria = data ?? [];
    }

    return {
      answer: { ...answer, audio_storage_path: undefined },
      attempt,
      assignment: assignmentResult.data,
      question: { ...question, rubric: rubricResult.data },
      student: studentResult.data,
      audio_url: signedResult.data?.signedUrl ?? null,
      grade_review: reviewResult.data,
      transcription: transcriptResult.data?.[0] ?? null,
      evaluation: evaluation ? { ...evaluation, criteria } : null,
    };
  }

  /** Danh sách lượt nộp của một bài tập cho giảng viên, kèm số thứ tự lượt và lượt được tính điểm chính thức. */
  async assignmentSubmissions(auth: AuthContext, assignmentId: string) {
    const db = auth.db;
    const { data: attempts, error: attemptError } = await db
      .from('lecturer_assignment_submissions')
      .select('id,assignment_id,student_id,status,started_at,submitted_at,graded_at,total_score')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });
    assertNoErrors('Không thể tải danh sách bài nộp', [{ context: 'Unable to load assignment submissions', error: attemptError }]);
    if (!attempts?.length) return [];

    type Attempt = (typeof attempts)[number];
    const attemptIds = attempts.map((attempt) => attempt.id as string);
    const studentIds = [...new Set(attempts.map((attempt) => attempt.student_id as string))];
    const [answerResult, studentResult] = await Promise.all([
      db.from('submissions')
        .select('id,assignment_submission_id,question_id,status,submitted_at')
        .in('assignment_submission_id', attemptIds)
        .eq('is_final', true)
        .order('submitted_at'),
      db.from('users').select('id,full_name').in('id', studentIds),
    ]);
    assertNoErrors('Không thể tải thông tin bài nộp', [
      { context: 'Unable to load submitted answers', error: answerResult.error },
      { context: 'Unable to load student names', error: studentResult.error },
    ]);

    const studentNameById = new Map((studentResult.data ?? []).map((student) => [student.id, student.full_name]));
    const answersByAttempt = new Map<string, unknown[]>();
    for (const answer of answerResult.data ?? []) {
      const key = answer.assignment_submission_id as string;
      answersByAttempt.set(key, [...(answersByAttempt.get(key) ?? []), answer]);
    }

    // Số thứ tự lượt theo thời điểm bắt đầu; lượt chính thức = điểm đã duyệt cao nhất (bằng nhau thì lượt sớm hơn).
    const attemptsByStudent = new Map<string, Attempt[]>();
    for (const attempt of [...attempts].sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)))) {
      const key = attempt.student_id as string;
      attemptsByStudent.set(key, [...(attemptsByStudent.get(key) ?? []), attempt]);
    }
    const meta = new Map<string, { attempt_index: number; attempt_count: number; is_best: boolean }>();
    for (const list of attemptsByStudent.values()) {
      const best = list
        .filter((attempt) => attempt.status === 'graded')
        .reduce<Attempt | null>((top, attempt) => (!top || Number(attempt.total_score) > Number(top.total_score) ? attempt : top), null);
      list.forEach((attempt, index) => meta.set(attempt.id as string, {
        attempt_index: index + 1,
        attempt_count: list.length,
        is_best: attempt.id === best?.id,
      }));
    }

    return attempts.map((attempt) => ({
      ...attempt,
      ...meta.get(attempt.id as string),
      student_name: studentNameById.get(attempt.student_id) ?? null,
      answers: answersByAttempt.get(attempt.id as string) ?? [],
    }));
  }
}
