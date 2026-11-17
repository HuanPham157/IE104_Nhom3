import { z } from 'zod';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiJson({ error: 'ID câu trả lời không hợp lệ' }, 400);

  const { data: answer, error: answerError } = await auth.value.db
    .from('submissions')
    .select('id,student_id,question_id,audio_storage_path,audio_mime_type,status,is_final,assignment_submission_id')
    .eq('id', id)
    .eq('student_id', auth.value.user.id)
    .maybeSingle();
  if (answerError || !answer) {
    if (answerError) reportDatabaseError('Unable to load student answer for transcription', answerError);
    return apiJson({ error: 'Không tìm thấy bài ghi âm' }, answerError ? 500 : 404);
  }
  if (!['queued', 'failed'].includes(answer.status)) {
    return apiJson({ error: 'Bài làm chưa sẵn sàng để nhận diện hoặc đã được xử lý' }, 409);
  }

  const { data: attempt, error: attemptError } = await auth.value.db
    .from('assignment_submissions')
    .select('status')
    .eq('id', answer.assignment_submission_id)
    .eq('student_id', auth.value.user.id)
    .maybeSingle();
  if (attemptError || !attempt || !['in_progress', 'submitted', 'processing'].includes(attempt.status)) {
    if (attemptError) reportDatabaseError('Unable to load assignment attempt for transcription', attemptError);
    return apiJson({ error: 'Bài làm chưa sẵn sàng để tạo transcript' }, attemptError ? 500 : 409);
  }

  const { data: claimed, error: claimError } = await auth.value.db.rpc('claim_submission_for_ai', {
    p_submission_id: id,
  });
  if (claimError || !claimed) {
    if (claimError) reportDatabaseError('Unable to claim answer for AI processing', claimError);
    return apiJson({ error: 'Không thể bắt đầu xử lý bài làm' }, 409);
  }

  try {
    const aiUrl = process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8001';
    const aiToken = process.env.AI_SERVICE_TOKEN;
    if (!aiToken) throw new Error('AI_SERVICE_TOKEN chưa được cấu hình');

    const { data: audio, error: audioError } = await auth.value.db.storage
      .from('oral-answers').download(answer.audio_storage_path);
    if (audioError || !audio) throw new Error('Không thể tải audio bài nộp từ kho lưu trữ');

    const form = new FormData();
    form.append('audio', audio, answer.audio_storage_path.split('/').pop() ?? 'answer.webm');
    form.append('language', 'vi');
    // Gợi ý ngữ cảnh cho Whisper bằng nội dung câu hỏi (sinh viên được phép đọc cột content).
    const { data: question } = await auth.value.db.from('questions').select('content').eq('id', answer.question_id).maybeSingle();
    if (question?.content) form.append('prompt', String(question.content).slice(0, 500));
    const response = await fetch(`${aiUrl.replace(/\/$/, '')}/api/transcribe`, {
      method: 'POST',
      headers: { 'X-AI-Service-Token': aiToken },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    const result = await response.json().catch(() => null) as { transcript?: unknown; detail?: string } | null;
    if (!response.ok || typeof result?.transcript !== 'string') {
      throw new Error(result?.detail ?? 'Dịch vụ Speech-to-Text không xử lý được audio');
    }
    if (!result.transcript.trim()) {
      throw new Error('Không nghe thấy lời nói trong bản ghi. Kiểm tra micro rồi ghi lại, hoặc tự gõ nội dung.');
    }

    const { error: transcriptError } = await auth.value.db.rpc('save_submission_transcription', {
      p_submission_id: id,
      p_transcript_text: result.transcript,
      p_engine_name: `whisper-${process.env.WHISPER_MODEL ?? 'base'}`,
      p_language_code: 'vi',
      p_is_edited: false,
    });
    if (transcriptError) {
      reportDatabaseError('Unable to save transcript', transcriptError);
      throw new Error('Không thể lưu transcript');
    }
    return apiJson({ data: { transcript: result.transcript, status: 'transcribed' } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Không thể nhận diện giọng nói';
    await auth.value.db.rpc('fail_submission_ai_processing', {
      p_submission_id: id,
      p_error_message: reason,
    });
    console.error('Speech-to-text failed:', reason);
    const message = reason.includes('AI_SERVICE_TOKEN')
      ? 'Thiếu AI_SERVICE_TOKEN trong frontend/.env.local.'
      : reason.includes('fetch failed') || reason.includes('ECONNREFUSED')
        ? 'Không kết nối được AI service. Kiểm tra AI_SERVICE_URL và bảo đảm Whisper đang chạy.'
        : reason;
    return apiJson({ error: `Không thể tạo transcript: ${message}` }, 502);
  }
}
