import { oralcheckFetch } from '@/lib/oralcheck-client';

export type AnswerStatus = {
  id: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | string;
  error_message: string | null;
  transcript: string | null;
  original_transcript: string | null;
  graded: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Theo dõi một câu trả lời đang được worker xử lý (ASR / chấm) cho tới khi `isDone` đúng.
 * ASR + chấm có thể mất vài phút nên hỏi lại định kỳ, giãn dần tới 5 giây.
 */
export async function waitForAnswer(
  submissionId: string,
  isDone: (status: AnswerStatus) => boolean,
  options: { shouldStop?: () => boolean; timeoutMs?: number } = {},
): Promise<AnswerStatus> {
  const deadline = Date.now() + (options.timeoutMs ?? 10 * 60_000);
  let delay = 1500;
  while (true) {
    const { data } = await oralcheckFetch<{ data: AnswerStatus }>(`/api/submissions/${submissionId}/status`);
    if (isDone(data)) return data;
    if (options.shouldStop?.()) throw new Error('Đã dừng theo dõi.');
    if (Date.now() > deadline) throw new Error('Hệ thống đang bận, kết quả sẽ có sau. Hãy tải lại trang sau ít phút.');
    await sleep(delay);
    delay = Math.min(5000, delay + 500);
  }
}

/** Đã có transcript (hoặc lỗi) — dùng khi chờ ASR. */
export const transcriptSettled = (status: AnswerStatus) =>
  status.status === 'failed' || (Boolean(status.transcript) && status.status !== 'processing');

/** Đã chấm xong (hoặc lỗi) — dùng khi chờ chấm điểm. */
export const gradingSettled = (status: AnswerStatus) =>
  status.status === 'failed' || (status.graded && status.status !== 'queued' && status.status !== 'processing');
