export const MAX_VERSIONS_PER_QUESTION = 5;

export interface AssignmentQuestion {
  id: string;
  content: string;
  position: number;
  max_score: number;
  time_limit_seconds: number;
}

export type Criterion = {
  criterion_id: string;
  awarded_points: number;
  assessment: string;
  evidence_excerpt: string | null;
  explanation: string | null;
};

export type VersionStatus = 'uploading' | 'uploaded' | 'transcribing' | 'transcribed' | 'failed';

/** Một lần ghi âm/tải audio của sinh viên cho một câu hỏi. */
export interface AnswerVersion {
  /** Khóa phía client; với phiên bản đã có trên server thì bằng id. */
  key: string;
  id?: string;
  attemptNumber: number;
  status: VersionStatus;
  audioUrl?: string;
  durationSeconds?: number;
  createdAt: string;
  transcript?: string;
  originalTranscript?: string;
  transcriptEdited?: boolean;
  error?: string;
}

export interface QuestionGrade {
  status: 'grading' | 'graded' | 'failed';
  score?: number;
  feedback?: string;
  criteria?: Criterion[];
  needsTeacherReview?: boolean;
  referenceAnswer?: string;
  error?: string;
}

export interface QuestionProgress {
  versions: AnswerVersion[];
  /** Khóa của phiên bản được chọn để nộp. */
  finalKey?: string;
  grade?: QuestionGrade;
  /** Điểm chính thức của giảng viên (chỉ có sau khi công bố). */
  official?: { score: number; feedback: string | null };
}

export const finalVersionOf = (progress?: QuestionProgress) =>
  progress?.versions.find((version) => version.key === progress.finalKey);

/**
 * Bản nộp hợp lệ khi đã lưu trên server và có transcript (từ Whisper, nhận dạng trực tiếp
 * trên trình duyệt hoặc sinh viên tự gõ). Bước chấm AI lưu lại chính transcript này,
 * nên không bắt buộc Whisper phải thành công.
 */
export const isVersionReady = (version?: AnswerVersion) =>
  Boolean(version?.id && version.status !== 'uploading' && version.status !== 'transcribing' && version.transcript?.trim());

/** Lý do bản đang chọn của một câu chưa nộp được (null = đã sẵn sàng). */
export function notReadyReason(progress?: QuestionProgress): string | null {
  if (!progress?.versions.length) return 'chưa ghi âm';
  const final = finalVersionOf(progress);
  if (!final) return 'chưa chọn bản nộp';
  if (final.status === 'uploading') return 'đang tải lên';
  if (final.status === 'transcribing') return 'đang nhận dạng giọng nói';
  if (!final.id) return 'tải lên thất bại, hãy ghi lại';
  if (!final.transcript?.trim()) return 'bản đã chọn chưa có transcript — bấm “Thử nhận dạng lại” hoặc tự gõ nội dung';
  return null;
}

// ----- Ma trận tiến độ / kết quả -----

export type WorkTileState = 'empty' | 'processing' | 'ready' | 'attention';
export type ResultLevel = 'correct' | 'partial' | 'incorrect' | 'grading' | 'ungraded';

/**
 * Phân loại kết quả một câu: ≥80% đúng, ≥50% đúng một phần, còn lại chưa đạt.
 * Ưu tiên điểm chính thức của giảng viên; chưa công bố thì dùng điểm AI đề xuất.
 */
export function resultLevelOf(progress: QuestionProgress | undefined, maxScore: number): ResultLevel {
  const official = progress?.official;
  const grade = progress?.grade;
  if (!official && grade?.status === 'grading') return 'grading';
  const score = official ? official.score : grade?.status === 'graded' ? grade.score : undefined;
  if (score === undefined || maxScore <= 0) return 'ungraded';
  const ratio = score / maxScore;
  if (ratio >= 0.8) return 'correct';
  if (ratio >= 0.5) return 'partial';
  return 'incorrect';
}

export const WORK_TILE_META: Record<WorkTileState, { label: string; icon: string; className: string }> = {
  empty: { label: 'Chưa làm', icon: '○', className: 'border-gray-300 bg-white text-gray-500' },
  processing: { label: 'Đang xử lý', icon: '…', className: 'border-sky-300 bg-sky-50 text-sky-800' },
  ready: { label: 'Đã chọn bản nộp', icon: '✓', className: 'border-gray-900 bg-gray-900 text-white' },
  attention: { label: 'Cần xử lý', icon: '!', className: 'border-amber-400 bg-amber-50 text-amber-900' },
};

export const RESULT_META: Record<ResultLevel, { label: string; icon: string; className: string; badgeClass: string }> = {
  correct: { label: 'Đúng (≥ 80%)', icon: '✓', className: 'border-emerald-600 bg-emerald-600 text-white', badgeClass: 'bg-emerald-50 text-emerald-800' },
  partial: { label: 'Đúng một phần (50–79%)', icon: '◐', className: 'border-amber-500 bg-amber-100 text-amber-900', badgeClass: 'bg-amber-50 text-amber-900' },
  incorrect: { label: 'Chưa đạt (< 50%)', icon: '✗', className: 'border-red-600 bg-red-600 text-white', badgeClass: 'bg-red-50 text-red-700' },
  grading: { label: 'Đang chấm', icon: '…', className: 'border-indigo-300 bg-indigo-50 text-indigo-800', badgeClass: 'bg-indigo-50 text-indigo-800' },
  ungraded: { label: 'Chưa có điểm', icon: '—', className: 'border-gray-300 bg-gray-50 text-gray-500', badgeClass: 'bg-gray-100 text-gray-600' },
};


export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return hours ? `${String(hours).padStart(2, '0')}:${mmss}` : mmss;
}
