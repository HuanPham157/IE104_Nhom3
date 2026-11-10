import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const durationSchema = z.coerce.number().int().positive().max(7200);
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;

  const { id: assignmentId } = await context.params;
  if (!idSchema.safeParse(assignmentId).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiJson({ error: 'Dữ liệu ghi âm không hợp lệ' }, 400);
  }

  const questionId = idSchema.safeParse(form.get('question_id'));
  const audio = form.get('audio');
  if (!questionId.success || !(audio instanceof File)) {
    return apiJson({ error: 'Cần cung cấp câu hỏi và tệp ghi âm' }, 400);
  }
  const mimeType = audio.type.split(';', 1)[0].trim().toLowerCase();
  if (!(mimeType in AUDIO_TYPES) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return apiJson({ error: 'Tệp phải là âm thanh được hỗ trợ và không vượt quá 25 MB' }, 400);
  }

  const rawDuration = form.get('duration_seconds');
  let durationSeconds: number | null = null;
  if (rawDuration !== null) {
    const parsedDuration = durationSchema.safeParse(rawDuration);
    if (!parsedDuration.success) {
      return apiJson({ error: 'Thời lượng ghi âm không hợp lệ' }, 400);
    }
    durationSeconds = parsedDuration.data;
  }

  const { data: attemptId, error: attemptError } = await auth.value.db.rpc(
    'start_assignment_submission',
    { p_assignment_id: assignmentId },
  );
  if (attemptError) {
    reportDatabaseError('Unable to start assignment submission', attemptError);
    return apiJson({ error: 'Bài tập chưa mở, đã đóng hoặc bạn không thuộc lớp này' }, 403);
  }

  const storagePath = `${auth.value.user.id}/${assignmentId}/${questionId.data}/${randomUUID()}.${AUDIO_TYPES[mimeType]}`;
  const { error: uploadError } = await auth.value.db.storage
    .from('oral-answers')
    .upload(storagePath, audio, { contentType: mimeType, upsert: false });

  if (uploadError) {
    reportDatabaseError('Unable to store student audio', uploadError);
    return apiJson({ error: 'Không thể lưu tệp ghi âm' }, 500);
  }

  const { data: submissionId, error: recordError } = await auth.value.db.rpc(
    'record_submission_answer',
    {
      p_assignment_submission_id: attemptId,
      p_question_id: questionId.data,
      p_audio_storage_path: storagePath,
      p_audio_mime_type: mimeType,
      p_audio_size_bytes: audio.size,
      p_audio_duration_seconds: durationSeconds,
    },
  );

  if (recordError) {
    reportDatabaseError('Unable to record uploaded student answer', recordError);
    const { error: cleanupError } = await auth.value.db.storage
      .from('oral-answers')
      .remove([storagePath]);
    if (cleanupError) {
      reportDatabaseError('Unable to remove unrecorded student audio', cleanupError);
    }
    return apiJson({ error: 'Không thể ghi nhận câu trả lời cho câu hỏi' }, 400);
  }

  return apiJson({ data: { id: submissionId, assignment_submission_id: attemptId } }, 201);
}
