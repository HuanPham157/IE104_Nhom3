import type { ParsedGuide } from '@/lib/exam-text';

export const TOTAL_POINTS = 10;
export const MIN_SECONDS_PER_QUESTION = 30;
export const MAX_SECONDS_PER_QUESTION = 1800;

export interface QuestionDraft {
  key: number;
  content: string;
  referenceAnswer: string;
  maxScore: number;
  expanded: boolean;
  /** Câu do barem tạo ra (bị bỏ khi barem không còn khối "Câu N" tương ứng). */
  fromGuide?: boolean;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const fix2 = (value: number) => Number(value.toFixed(2));

/** Chia đều 10 điểm cho n câu theo bước 0,25; phần dư dồn cho các câu cuối (vd. 3 câu → 3,25 / 3,25 / 3,5). */
export function evenScores(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(TOTAL_POINTS / count / 0.25) * 0.25 || 0.25;
  const scores = Array.from({ length: count }, () => base);
  let remainder = fix2(TOTAL_POINTS - base * count);
  for (let index = count - 1; remainder > 0.001 && index >= 0; index = index === 0 ? count - 1 : index - 1) {
    const step = Math.min(0.25, remainder);
    scores[index] = fix2(scores[index] + step);
    remainder = fix2(remainder - step);
  }
  return scores;
}

export const withEvenScores = (questions: QuestionDraft[]) => {
  const scores = evenScores(questions.length);
  return questions.map((question, index) => ({ ...question, maxScore: scores[index] }));
};

export const totalScore = (questions: QuestionDraft[]) => fix2(questions.reduce((sum, question) => sum + (Number(question.maxScore) || 0), 0));

/** Thời gian ghi âm tối đa của mỗi câu = thời lượng bài chia đều cho số câu (giới hạn 30 giây – 30 phút). */
export function secondsPerQuestion(durationMinutes: number, count: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || count <= 0) return MIN_SECONDS_PER_QUESTION;
  const raw = Math.floor((durationMinutes * 60) / count);
  return Math.min(MAX_SECONDS_PER_QUESTION, Math.max(MIN_SECONDS_PER_QUESTION, roundTo(raw, 5)));
}

// ---------- Thời gian (input datetime-local dùng giờ máy) ----------

export function toLocalInput(value: Date | string | null | undefined) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const fromLocalInput = (value: string) => (value ? new Date(value) : null);

/** Mặc định giờ mở bài: mốc 5 phút kế tiếp. */
export function defaultStartInput(now = new Date()) {
  const next = new Date(now.getTime() + 5 * 60_000);
  next.setMinutes(Math.ceil(next.getMinutes() / 5) * 5, 0, 0);
  return toLocalInput(next);
}

export function computeEnd(startInput: string, durationMinutes: number, autoEnd: boolean, endInput: string): Date | null {
  const start = fromLocalInput(startInput);
  if (autoEnd) {
    if (!start || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
    return new Date(start.getTime() + durationMinutes * 60_000);
  }
  return fromLocalInput(endInput);
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (!minutes) return `${rest} giây`;
  return rest ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
}

// ---------- Barem theo câu ----------

export type QuestionGuideStatus = {
  position: number;
  criteriaCount: number;
  criteriaTotal: number;
  /** Điểm câu theo barem: tổng tiêu chí, nếu không có tiêu chí thì lấy điểm ghi trên tiêu đề "Câu N (x điểm)". */
  guidePoints?: number;
  /** Tổng tiêu chí khác điểm câu hỏi → không lưu được (AI không thể chấm đủ điểm). */
  mismatch: boolean;
};

export function guideStatusByQuestion(guide: ParsedGuide, questions: QuestionDraft[]): QuestionGuideStatus[] {
  return questions.map((question, index) => {
    const block = guide.questions.find((item) => item.position === index + 1);
    const criteriaTotal = fix2(block?.criteria.reduce((sum, criterion) => sum + criterion.points, 0) ?? 0);
    const criteriaCount = block?.criteria.length ?? 0;
    return {
      position: index + 1,
      criteriaCount,
      criteriaTotal,
      guidePoints: criteriaCount ? criteriaTotal : block?.points,
      mismatch: criteriaCount > 0 && Math.abs(criteriaTotal - question.maxScore) > 0.01,
    };
  });
}

// ---------- Kiểm tra trước khi lưu / công bố ----------

export type CheckItem = { id: string; label: string; ok: boolean; level: 'error' | 'warning'; detail?: string };

export function buildChecklist(input: {
  classSelected: boolean;
  title: string;
  questions: QuestionDraft[];
  durationMinutes: number;
  start: Date | null;
  end: Date | null;
  guide: ParsedGuide;
  guideStatus: QuestionGuideStatus[];
  now: number;
}): CheckItem[] {
  const { questions, durationMinutes, start, end, guide, guideStatus } = input;
  const total = totalScore(questions);
  const durationValid = Number.isInteger(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 600;
  const rawPerQuestion = durationValid && questions.length ? (durationMinutes * 60) / questions.length : 0;
  const strayPositions = guide.questions.map((item) => item.position).filter((position) => position < 1 || position > questions.length);
  const mismatched = guideStatus.filter((item) => item.mismatch);
  const emptyQuestions = questions.map((question, index) => (question.content.trim() ? 0 : index + 1)).filter(Boolean);
  const windowMinutes = start && end ? (end.getTime() - start.getTime()) / 60_000 : null;

  return [
    { id: 'class', label: 'Đã chọn lớp', ok: input.classSelected, level: 'error' },
    { id: 'title', label: 'Có tên bài tập', ok: Boolean(input.title.trim()), level: 'error' },
    { id: 'content', label: 'Mọi câu đều có nội dung', ok: questions.length > 0 && emptyQuestions.length === 0, level: 'error', detail: emptyQuestions.length ? `Câu trống: ${emptyQuestions.join(', ')}` : undefined },
    { id: 'points', label: `Tổng điểm bằng ${TOTAL_POINTS}`, ok: Math.abs(total - TOTAL_POINTS) < 0.01, level: 'error', detail: `Hiện tại ${total}` },
    { id: 'duration', label: 'Thời lượng làm bài 1–600 phút', ok: durationValid, level: 'error' },
    { id: 'start', label: 'Có thời gian bắt đầu', ok: Boolean(start), level: 'error' },
    { id: 'window', label: 'Kết thúc sau thời gian bắt đầu', ok: !start || !end || end.getTime() > start.getTime(), level: 'error' },
    { id: 'future', label: 'Hạn chót chưa trôi qua', ok: !end || end.getTime() > input.now, level: 'error' },
    {
      id: 'window-length', label: 'Khoảng mở bài đủ dài cho thời lượng', level: 'warning',
      ok: windowMinutes === null || windowMinutes + 0.01 >= durationMinutes,
      detail: windowMinutes !== null ? `Mở ${Math.round(windowMinutes)} phút cho bài ${durationMinutes} phút` : undefined,
    },
    {
      id: 'per-question', label: `Mỗi câu có ít nhất ${MIN_SECONDS_PER_QUESTION} giây`, level: 'warning',
      ok: !durationValid || rawPerQuestion >= MIN_SECONDS_PER_QUESTION,
    },
    { id: 'answers', label: 'Câu nào cũng có đáp án tham khảo', ok: questions.every((question) => question.referenceAnswer.trim()), level: 'warning', detail: 'AI chấm chính xác hơn khi có đáp án' },
    { id: 'guide-points', label: 'Điểm tiêu chí barem khớp điểm câu', ok: mismatched.length === 0, level: 'error', detail: mismatched.length ? mismatched.map((item) => `Câu ${item.position}: barem ${item.criteriaTotal}đ`).join(', ') : undefined },
    { id: 'guide-stray', label: 'Barem không nhắc tới câu không tồn tại', ok: strayPositions.length === 0, level: 'warning', detail: strayPositions.length ? `Câu ${strayPositions.join(', ')} trong barem không có trong đề` : undefined },
    { id: 'guide-limit', label: 'Mỗi câu tối đa 30 tiêu chí', ok: guideStatus.every((item) => item.criteriaCount <= 30), level: 'error' },
  ];
}

// ---------- Tạo câu hỏi từ barem ----------

/** Barem có chứa đề bài (ít nhất một "Câu N" có nội dung câu hỏi) thì barem quyết định danh sách câu hỏi. */
export const guideDefinesQuestions = (guide: ParsedGuide) => guide.questions.some((block) => block.content);

/**
 * Tạo/cập nhật câu hỏi theo các khối "Câu N" có nội dung trong barem: câu N lấy nội dung, đáp án tham khảo và điểm
 * (điểm ghi trên tiêu đề, nếu không có thì tổng tiêu chí). Câu thêm tay được giữ; câu do barem tạo mà
 * barem đã bỏ thì bị xóa (nếu nằm sau) hoặc chuyển thành câu thường để giảng viên tự sửa (nếu nằm giữa).
 */
export function syncQuestionsFromGuide(
  current: QuestionDraft[],
  guide: ParsedGuide,
  createQuestion: (patch?: Partial<QuestionDraft>) => QuestionDraft,
  maxQuestions: number,
): QuestionDraft[] {
  const blocks = new Map(guide.questions.filter((block) => block.content).map((block) => [block.position, block]));
  if (!blocks.size) return current;
  const count = Math.min(maxQuestions, Math.max(...blocks.keys()));
  const synced = Array.from({ length: count }, (_, index) => {
    const existing = current[index] ?? createQuestion({ expanded: false });
    const block = blocks.get(index + 1);
    if (!block) return { ...existing, fromGuide: false };
    const criteriaTotal = fix2(block.criteria.reduce((sum, criterion) => sum + criterion.points, 0));
    return {
      ...existing,
      content: block.content,
      referenceAnswer: block.referenceAnswer,
      maxScore: block.points ?? (criteriaTotal || existing.maxScore),
      fromGuide: true,
    };
  });
  const manualTail = current.slice(count).filter((question) => !question.fromGuide && question.content.trim());
  const next = [...synced, ...manualTail].slice(0, maxQuestions);
  return next.some((question) => question.expanded) ? next : next.map((question, index) => ({ ...question, expanded: index === 0 }));
}
