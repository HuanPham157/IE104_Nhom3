'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';

export type TeacherEvaluationCriterion = {
  id: string;
  title: string;
  description?: string;
  maxPoints: number;
  aiPoints?: number;
  teacherPoints?: number;
  evidence?: string;
  feedbackSuggestion?: string;
};

export type TeacherTranscriptEvidence = {
  criterionId: string;
  excerpt: string;
  timestamp?: string;
  start?: number;
  end?: number;
  needsReview?: boolean;
};

export type TeacherQuestionReviewStatus = 'published' | 'draft' | 'ungraded';

export type TeacherQuestionReviewItem = {
  number: number;
  status: TeacherQuestionReviewStatus;
};

export type TeacherQuestionReviewProgress = {
  currentQuestion: number;
  questions: TeacherQuestionReviewItem[];
};

export type TeacherClassReviewProgress = {
  reviewedSubmissions: number;
  totalSubmissions: number;
};

export type TeacherEvaluationAnalysis = {
  conceptAccuracy?: number;
  clarity?: number;
  errorAnalysis?: number;
  speakingRateWpm?: number;
  hesitationSeconds?: number;
  speechConfidence?: number;
  strengths?: string[];
  misconceptions?: string[];
  missingPoints?: string[];
  feedback?: string;
};

export type TeacherEvaluationDraft = {
  criterionScores: Record<string, number>;
  feedback: string;
  syncToGradebook: boolean;
};

export type TeacherEvaluationProps = {
  submissionId?: string;
  examId?: string;
  courseTitle?: string;
  examTitle?: string;
  assignmentTitle?: string;
  studentName?: string;
  studentCode?: string;
  studentClass?: string;
  submittedAt?: string;
  audioUrl?: string;
  audioFileName?: string;
  transcript?: string;
  rubricCriteria?: TeacherEvaluationCriterion[];
  transcriptEvidence?: TeacherTranscriptEvidence[];
  suggestedFeedback?: string;
  currentQuestionText?: string;
  reviewProgress?: TeacherQuestionReviewProgress;
  onSelectQuestion?: (questionNumber: number) => void;
  classReviewProgress?: TeacherClassReviewProgress;
  aiAnalysis?: TeacherEvaluationAnalysis;
  onReevaluateTranscript?: (transcript: string) => void | Promise<void>;
  onSaveReview?: (review: TeacherEvaluationDraft) => void | Promise<void>;
  onPublishReview?: (review: TeacherEvaluationDraft) => void | Promise<void>;
  onPreviousSubmission?: () => void;
  onNextSubmission?: () => void;
};

const evidencePalette = [
  { background: '#dbeafe', foreground: '#1e3a8a' },
  { background: '#f3e8ff', foreground: '#581c87' },
  { background: '#dcfce7', foreground: '#14532d' },
  { background: '#fef3c7', foreground: '#78350f' },
];

const EMPTY_RUBRIC_CRITERIA: TeacherEvaluationCriterion[] = [];
const EMPTY_TRANSCRIPT_EVIDENCE: TeacherTranscriptEvidence[] = [];
const EMPTY_QUESTION_ITEMS: TeacherQuestionReviewItem[] = [];

type QuestionProgressSummary = {
  questions: TeacherQuestionReviewItem[];
  total: number;
  published: number;
  draft: number;
  ungraded: number;
  completed: number;
  isComplete: boolean;
};

function getQuestionProgressSummary(progress?: TeacherQuestionReviewProgress): QuestionProgressSummary {
  const questions = progress?.questions ?? EMPTY_QUESTION_ITEMS;
  const published = questions.filter((question) => question.status === 'published').length;
  const draft = questions.filter((question) => question.status === 'draft').length;
  const ungraded = questions.filter((question) => question.status === 'ungraded').length;
  const total = questions.length;
  const completed = published + draft;

  return {
    questions,
    total,
    published,
    draft,
    ungraded,
    completed,
    isComplete: total > 0 && ungraded === 0,
  };
}

function splitTranscriptByEvidence(
  transcript: string,
  evidence: TeacherTranscriptEvidence[],
  criteria: TeacherEvaluationCriterion[]
) {
  const groupedMatches = new Map<string, { start: number; end: number; evidence: TeacherTranscriptEvidence[] }>();
  const criterionIds = new Set(criteria.map((criterion) => criterion.id));

  for (const item of evidence) {
    if (!item.excerpt.trim() || !criterionIds.has(item.criterionId)) continue;

    let start = transcript.indexOf(item.excerpt);
    if (
      typeof item.start === 'number' &&
      typeof item.end === 'number' &&
      Number.isInteger(item.start) &&
      Number.isInteger(item.end) &&
      item.start >= 0 &&
      item.end > item.start &&
      transcript.slice(item.start, item.end) === item.excerpt
    ) {
      start = item.start;
    }
    if (start < 0) continue;

    const end = start + item.excerpt.length;
    const key = `${start}:${end}`;
    const match = groupedMatches.get(key);
    if (match) match.evidence.push(item);
    else groupedMatches.set(key, { start, end, evidence: [item] });
  }

  const matches = [...groupedMatches.values()].sort((left, right) => left.start - right.start);
  const chunks: Array<{ text: string; evidence?: TeacherTranscriptEvidence[] }> = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) chunks.push({ text: transcript.slice(cursor, match.start) });
    chunks.push({ text: transcript.slice(match.start, match.end), evidence: match.evidence });
    cursor = match.end;
  }

  if (cursor < transcript.length) chunks.push({ text: transcript.slice(cursor) });
  return chunks;
}

function countProgress(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function CurrentQuestionAndProgress({
  questionText,
  progress,
  onSelectQuestion,
  onNextSubmission,
}: {
  questionText?: string;
  progress?: TeacherQuestionReviewProgress;
  onSelectQuestion?: (questionNumber: number) => void;
  onNextSubmission?: () => void;
}) {
  const summary = getQuestionProgressSummary(progress);
  const current = countProgress(progress?.currentQuestion);
  const percent = summary.total > 0 ? (summary.completed / summary.total) * 100 : 0;
  const statusStyles: Record<TeacherQuestionReviewStatus, string> = {
    published: 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    draft: 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200',
    ungraded: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  };
  const statusLabels: Record<TeacherQuestionReviewStatus, string> = {
    published: 'đã công bố điểm',
    draft: 'đã lưu tạm',
    ungraded: 'chưa chấm',
  };

  return (
    <section
      aria-label="Câu hỏi hiện tại và tiến độ chấm"
      className="mx-6 mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]"
    >
      <div role="group" aria-label="Câu hỏi đang chấm" className="rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
            Nội dung câu hỏi đang chấm
          </h2>
          {current > 0 && summary.total > 0 && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">
              Câu {current} / {summary.total}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-700">
          {questionText?.trim() || 'Nội dung câu hỏi sẽ hiển thị tại đây khi được cung cấp.'}
        </p>
      </div>

      <div role="group" aria-label="Tiến độ chấm các câu hỏi" className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-gray-700">Tiến độ chấm câu hỏi</h2>
          <span className="text-[10px] font-semibold tabular-nums text-gray-800">
            {summary.total > 0 ? `${summary.completed} / ${summary.total} câu` : 'Chưa có dữ liệu'}
          </span>
        </div>

        {summary.total > 0 ? (
          <>
            <div
              role="progressbar"
              aria-label="Số câu đã lưu tạm hoặc công bố điểm"
              aria-valuemin={0}
              aria-valuemax={summary.total}
              aria-valuenow={summary.completed}
              className="mt-2.5 h-2 overflow-hidden rounded-full bg-gray-100"
            >
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1.5 text-[9px] text-gray-600">
              {summary.published} đã công bố · {summary.draft} lưu tạm · {summary.ungraded} chưa chấm
            </p>

            <div role="group" aria-label="Lưới câu hỏi cần chấm" className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {summary.questions.map((question) => (
                <button
                  key={question.number}
                  type="button"
                  aria-label={`Câu ${question.number}, ${statusLabels[question.status]}`}
                  aria-pressed={question.number === current}
                  disabled={!onSelectQuestion}
                  onClick={() => onSelectQuestion?.(question.number)}
                  className={`aspect-square rounded-lg border text-[10px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-default ${
                    statusStyles[question.status]
                  } ${question.number === current ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}`}
                >
                  {question.number}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-gray-600">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-100" />Đã công bố</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" />Lưu tạm</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-gray-200 bg-white" />Chưa chấm</span>
            </div>

            {summary.isComplete && (
              <button
                type="button"
                onClick={onNextSubmission}
                disabled={!onNextSubmission}
                title={!onNextSubmission ? 'Chưa kết nối thao tác chuyển sinh viên' : undefined}
                className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Qua sinh viên tiếp theo →
              </button>
            )}
          </>
        ) : (
          <p className="mt-2 text-[10px] text-gray-500">Chưa có danh sách câu hỏi cần chấm.</p>
        )}
      </div>
    </section>
  );
}

function TeacherEvaluationContent({
  examId,
  courseTitle,
  examTitle,
  assignmentTitle,
  studentName,
  studentCode,
  studentClass,
  submittedAt,
  audioUrl,
  audioFileName,
  transcript = '',
  rubricCriteria = EMPTY_RUBRIC_CRITERIA,
  transcriptEvidence = EMPTY_TRANSCRIPT_EVIDENCE,
  suggestedFeedback = '',
  currentQuestionText,
  reviewProgress,
  onSelectQuestion,
  classReviewProgress,
  aiAnalysis,
  onReevaluateTranscript,
  onSaveReview,
  onPublishReview,
  onPreviousSubmission,
  onNextSubmission,
}: TeacherEvaluationProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<'1.0x' | '1.2x' | '1.5x'>('1.0x');
  const [teacherCriterionScores, setTeacherCriterionScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [syncCanvas, setSyncCanvas] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [reviewActionMessage, setReviewActionMessage] = useState('');
  const [reviewActionError, setReviewActionError] = useState('');
  const [pendingReviewAction, setPendingReviewAction] = useState<'save' | 'publish' | null>(null);
  const [transcriptOverride, setTranscriptOverride] = useState<{ source: string; text: string } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ source: string; name: string } | null>(null);
  const transcriptText = transcriptOverride?.source === transcript ? transcriptOverride.text : transcript;
  const isManualTranscript = transcriptText !== transcript;
  const uploadedFileName = uploadedFile?.source === transcript ? uploadedFile.name : '';
  const setTranscriptText = (text: string) => setTranscriptOverride({ source: transcript, text });
  const setUploadedFileName = (name: string) =>
    setUploadedFile(name ? { source: transcript, name } : null);
  const maxScore = rubricCriteria.reduce(
    (total, criterion) => total + (Number.isFinite(criterion.maxPoints) && criterion.maxPoints > 0 ? criterion.maxPoints : 0),
    0
  );
  const isValidCriterion = (criterion: TeacherEvaluationCriterion) =>
    Number.isFinite(criterion.maxPoints) && criterion.maxPoints > 0;
  const isValidScore = (score: number, criterion: TeacherEvaluationCriterion) =>
    isValidCriterion(criterion) && Number.isFinite(score) && score >= 0 && score <= criterion.maxPoints;
  const hasAiScores =
    rubricCriteria.length > 0 &&
    rubricCriteria.every((criterion) => isValidScore(criterion.aiPoints ?? Number.NaN, criterion));
  const getTeacherScoreInput = (criterion: TeacherEvaluationCriterion) =>
    teacherCriterionScores[criterion.id] ?? String(criterion.teacherPoints ?? criterion.aiPoints ?? '');
  const hasTeacherScores =
    rubricCriteria.length > 0 &&
    rubricCriteria.every((criterion) => {
      const rawScore = getTeacherScoreInput(criterion);
      return rawScore.trim() !== '' && isValidScore(Number(rawScore), criterion);
    });
  const getTeacherScore = (criterion: TeacherEvaluationCriterion) => {
    const rawScore = getTeacherScoreInput(criterion);
    const parsedScore = Number(rawScore);
    return rawScore.trim() && isValidScore(parsedScore, criterion) ? parsedScore : 0;
  };
  const aiScore = rubricCriteria.reduce((total, criterion) => total + (criterion.aiPoints ?? 0), 0);
  const teacherScore = rubricCriteria.reduce((total, criterion) => total + getTeacherScore(criterion), 0);

  // Chức năng chỉnh sửa và tải transcript
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcriptBeforeEdit, setTranscriptBeforeEdit] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [reevalSuccess, setReevalSuccess] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const aiScoresNeedReview = isManualTranscript;
  const transcriptChunks = useMemo(
    () => splitTranscriptByEvidence(transcriptText, isManualTranscript ? [] : transcriptEvidence, rubricCriteria),
    [transcriptText, isManualTranscript, transcriptEvidence, rubricCriteria]
  );
  const hasMatchedEvidence = transcriptChunks.some((chunk) => chunk.evidence?.length);
  const analysisMetrics = [
    { label: 'Đúng khái niệm', value: aiAnalysis?.conceptAccuracy, color: 'bg-emerald-600', textColor: 'text-emerald-700' },
    { label: 'Tính mạch lạc', value: aiAnalysis?.clarity, color: 'bg-indigo-600', textColor: 'text-indigo-700' },
    { label: 'Phân tích lỗi', value: aiAnalysis?.errorAnalysis, color: 'bg-blue-600', textColor: 'text-blue-700' },
  ];
  const speechMetrics = [
    { label: 'Tốc độ nói', value: aiAnalysis?.speakingRateWpm, unit: 'từ/phút' },
    { label: 'Thời gian ngập ngừng', value: aiAnalysis?.hesitationSeconds, unit: 'giây' },
    { label: 'Độ tự tin khẩu ngữ', value: aiAnalysis?.speechConfidence, unit: '%' },
  ];
  const classTotal = countProgress(classReviewProgress?.totalSubmissions);
  const classReviewed = Math.min(classTotal, countProgress(classReviewProgress?.reviewedSubmissions));
  const classProgressPercent = classTotal > 0 ? (classReviewed / classTotal) * 100 : 0;
  const questionProgressSummary = getQuestionProgressSummary(reviewProgress);

  const handleReevaluate = async () => {
    if (!onReevaluateTranscript) {
      setTranscriptError('Chức năng chấm lại chưa được kết nối.');
      return;
    }

    setIsReevaluating(true);
    setReevalSuccess(false);
    setTranscriptError('');
    try {
      await onReevaluateTranscript(transcriptText);
      setReevalSuccess(true);
    } catch (error) {
      setTranscriptError(
        error instanceof Error ? `Không thể chấm lại: ${error.message}` : 'Không thể chấm lại transcript.'
      );
    } finally {
      setIsReevaluating(false);
    }
  };

  const insertAiFeedback = () => {
    if (!suggestedFeedback) return;
    setFeedback((current) =>
      current.includes(suggestedFeedback)
        ? current
        : current.trim()
          ? `${current.trim()}\n${suggestedFeedback}`
          : suggestedFeedback
    );
  };

  const getReviewDraft = (): TeacherEvaluationDraft | undefined => {
    if (!hasTeacherScores || maxScore <= 0) return undefined;
    return {
      criterionScores: Object.fromEntries(rubricCriteria.map((criterion) => [criterion.id, getTeacherScore(criterion)])),
      feedback: feedback.trim(),
      syncToGradebook: syncCanvas,
    };
  };

  const handleReviewAction = async (action: 'save' | 'publish') => {
    if (pendingReviewAction) return;
    setReviewActionMessage('');
    setReviewActionError('');
    const review = getReviewDraft();
    if (!review) {
      setReviewActionError('Vui lòng nhập điểm hợp lệ cho tất cả tiêu chí trước khi lưu hoặc công bố.');
      return;
    }

    const callback = action === 'save' ? onSaveReview : onPublishReview;
    if (!callback) {
      setReviewActionError(`Chức năng ${action === 'save' ? 'lưu' : 'công bố'} kết quả chưa được kết nối.`);
      return;
    }

    setPendingReviewAction(action);
    try {
      await callback(review);
      setReviewActionMessage(action === 'save' ? 'Đã lưu tạm kết quả.' : 'Đã công bố kết quả.');
      if (action === 'publish') setIsPublished(true);
    } catch (error) {
      setReviewActionError(
        error instanceof Error ? `Không thể ${action === 'save' ? 'lưu' : 'công bố'}: ${error.message}` : 'Có lỗi khi xử lý kết quả.'
      );
    } finally {
      setPendingReviewAction(null);
    }

  };

  const handlePlaybackSpeed = (speed: '1.0x' | '1.2x' | '1.5x') => {
    setPlaybackSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = Number.parseFloat(speed);
  };

  // Tải file transcript từ máy (.txt, .srt, .vtt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['txt', 'srt', 'vtt'].includes(extension)) {
      setTranscriptError('Chỉ hỗ trợ file .txt, .srt hoặc .vtt.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setTranscriptError('File transcript vượt quá dung lượng tối đa 10MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setTranscriptError('Không thể đọc nội dung file transcript.');
        return;
      }
      setTranscriptText(reader.result);
      setUploadedFileName(file.name);
      setTranscriptError('');
      setReevalSuccess(false);
      setShowUploadModal(false);
    };
    reader.onerror = () => setTranscriptError('Đã xảy ra lỗi khi đọc file transcript.');
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-[#111827] font-sans text-xs antialiased flex flex-col justify-between">
      <div className="flex flex-1">
        {/* ========================================================= */}
        {/* 1. SIDEBAR GIẢNG VIÊN (BÊN TRÁI)                          */}
        {/* ========================================================= */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col justify-between shrink-0 hidden lg:flex sticky top-0 h-screen">
          <div className="space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
                🎙️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight text-gray-900">AIOralCheck</span>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                    STUDIO
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">Hệ thống khảo thí âm học AI</span>
              </div>
            </div>
            {aiScoresNeedReview && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10px] text-amber-900">
                Điểm AI bên dưới được tạo từ transcript trước đó; hãy chấm lại trước khi sử dụng.
              </p>
            )}

            {/* Nút hành động nổi bật */}
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🎙️</span>
              <span>Chấm bài thi vấn đáp</span>
            </button>

            {/* Menu điều hướng */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                ĐIỀU HƯỚNG CHÍNH
              </span>
              <nav className="space-y-0.5 pt-1 text-[11px] font-medium text-gray-600">
                <Link href="/teacher" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>📊</span> Tổng quan
                </Link>
                <Link href="/teacher/classes" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>👥</span> Lớp của tôi
                </Link>
                <Link href="/tasks" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>📝</span> Bài tập oral
                </Link>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  <span className="flex items-center gap-3">
                    <span>💡</span> Đánh giá AI &amp; Chấm điểm
                  </span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                </div>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>🎙️</span> Phòng thu âm AI
                </a>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>🏆</span> Lịch sử &amp; Bảng xếp hạng
                </a>
              </nav>
            </div>
          </div>

          {/* User profile & Settings */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <a href="#" className="flex items-center gap-3 px-3 py-1.5 text-gray-600 hover:text-black text-[11px]">
              <span>⚙️</span> Cài đặt
            </a>

            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                GV
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-gray-900 truncate text-[11px]">Giảng viên</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold text-[8px]">
                  GIẢNG VIÊN
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <span>❓</span> Trợ giúp &amp; Hướng dẫn
              </span>
              <span className="text-emerald-600 font-bold">● Sẵn sàng</span>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH (MAIN WORKSPACE)             */}
        {/* ========================================================= */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* TOPBAR NGỮ CẢNH */}
          <header className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-20 shadow-xs gap-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span>{courseTitle || 'Môn học'}</span>
              {examTitle && (
                <>
                  <span>/</span>
                  <span className="font-bold text-gray-900">{examTitle}</span>
                </>
              )}
              {assignmentTitle && (
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {assignmentTitle}
                </span>
              )}
              {examId && <span className="font-mono text-[10px] text-gray-400">Mã bài: {examId}</span>}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  isManualTranscript
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : hasAiScores
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isManualTranscript ? 'bg-amber-600' : hasAiScores ? 'bg-emerald-600' : 'bg-gray-400'
                  }`}
                />
                {isManualTranscript
                  ? 'TRANSCRIPT ĐÃ ĐƯỢC SỬA'
                  : hasAiScores
                    ? 'AI ĐÃ HOÀN TẤT CHẤM ĐIỂM'
                    : 'CHƯA CÓ KẾT QUẢ AI'}
              </span>

              {submittedAt && <span className="text-[10px] text-gray-400">Thời gian nộp: {submittedAt}</span>}

              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-[11px] flex items-center gap-1.5"
              >
                <span>📄</span> Xem chi tiết bài nộp
              </button>

              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-black text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-gray-800"
              >
                <span>⚡</span> Bắt đầu đánh giá
              </button>
            </div>
          </header>

          <CurrentQuestionAndProgress
            questionText={currentQuestionText}
            progress={reviewProgress}
            onSelectQuestion={onSelectQuestion}
            onNextSubmission={onNextSubmission}
          />

          {/* MAIN 2 CỘT CHẤM ĐIỂM (BENTO LAYOUT) */}
          <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pb-24">
            {/* ---------------------------------------------------- */}
            {/* CỘT TRÁI (5 COLS): AUDIO PLAYER & SPEECH-TO-TEXT     */}
            {/* ---------------------------------------------------- */}
            <div className="xl:col-span-5 space-y-6">
              {/* CARD 1: TRÌNH PHÁT BẢN GHI ÂM (AUDIO PLAYER) */}
              <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                      🎙️
                    </div>
                    <div>
                      <h2 className="font-bold text-xs text-gray-900">Bản ghi âm bài trả lời vấn đáp</h2>
                      <p className="text-[10px] text-gray-500">
                        Sinh viên: <strong className="text-gray-900">{studentName || 'Chưa có thông tin'}</strong>
                        {studentCode && <> • MSSV: <strong className="font-mono">{studentCode}</strong></>}
                        {studentClass && <> • Lớp: <strong>{studentClass}</strong></>}
                      </p>
                    </div>
                  </div>
                </div>

                {audioUrl ? (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    {audioFileName && <p className="truncate text-[10px] font-medium text-gray-700">{audioFileName}</p>}
                    <audio ref={audioRef} controls preload="metadata" src={audioUrl} className="w-full">
                      Trình duyệt không hỗ trợ phát audio.
                    </audio>
                    <div className="flex w-fit items-center gap-1 rounded-lg bg-gray-100 p-1">
                      {(['1.0x', '1.2x', '1.5x'] as const).map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          aria-pressed={playbackSpeed === speed}
                          onClick={() => handlePlaybackSpeed(speed)}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            playbackSpeed === speed ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
                          }`}
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-[10px] text-gray-500">
                    Chưa có file audio cho bài nộp này.
                  </div>
                )}
              </section>

              {/* CARD 2: BẢN PHIÊN ÂM GIỌNG NÓI (SPEECH-TO-TEXT & TRANSCRIPT EDIT/UPLOAD) */}
              <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span>💬</span> Bản phiên âm giọng nói (Speech-to-Text)
                    </h2>
                    {isManualTranscript && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[9px]">
                        Đã chỉnh sửa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingTranscript) {
                          setTranscriptText(transcriptBeforeEdit);
                        } else {
                          setTranscriptBeforeEdit(transcriptText);
                        }
                        setIsEditingTranscript(!isEditingTranscript);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[10px] font-bold text-gray-700 flex items-center gap-1 transition shadow-2xs"
                    >
                      <span>✏️</span>
                      <span>{isEditingTranscript ? 'Xem bản gốc' : 'Chỉnh sửa'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTranscriptError('');
                        setShowUploadModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-700 flex items-center gap-1 transition shadow-2xs"
                    >
                      <span>📤</span>
                      <span>Tải transcript lên</span>
                    </button>
                  </div>
                </div>

                {/* Chế độ Chỉnh sửa Transcript thủ công */}
                {isEditingTranscript ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span className="font-semibold text-gray-700">
                        Chỉnh sửa lại nội dung văn bản khi nhận dạng giọng nói bị nhiễu:
                      </span>
                      <span className="font-mono">
                        {transcriptText.length} ký tự • {transcriptText.trim() ? transcriptText.trim().split(/\s+/).length : 0} từ
                      </span>
                    </div>

                    <textarea
                      rows={8}
                      value={transcriptText}
                      onChange={(e) => {
                        setTranscriptText(e.target.value);
                        setTranscriptError('');
                        setReevalSuccess(false);
                      }}
                      className="w-full p-3.5 rounded-xl border border-indigo-300 bg-white text-[11px] leading-relaxed outline-none focus:ring-2 focus:ring-indigo-400 font-sans text-gray-800"
                      placeholder="Nhập hoặc dán nội dung transcript đã hiệu chỉnh..."
                    />

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTranscriptText(transcript);
                          setUploadedFileName('');
                          setIsEditingTranscript(false);
                          setTranscriptError('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] font-semibold"
                      >
                        Khôi phục gốc AI
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTranscriptText(transcriptBeforeEdit);
                            setIsEditingTranscript(false);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[10px] font-bold text-gray-700"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTranscript(false);
                          }}
                          className="px-4 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 text-[10px] font-bold shadow-xs"
                        >
                          Lưu transcript đã sửa
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-[11px] leading-relaxed">
                    {/* Block Sinh viên trả lời có Highlight */}
                    <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          Sinh viên: {studentName || 'Chưa có thông tin'}
                        </span>
                        {uploadedFileName && <span className="truncate text-gray-400">{uploadedFileName}</span>}
                      </div>

                      {!isManualTranscript && (
                        <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[9px] leading-relaxed text-gray-600">
                            Các câu/mệnh đề được tô sáng là bằng chứng AI tìm thấy khớp với ý trong Rubric. Màu sắc tương ứng tiêu chí; giảng viên có thể đối chiếu lại với transcript và audio.
                          </p>
                          <div aria-label="Chú giải bằng chứng theo tiêu chí" className="flex flex-wrap gap-2 text-[9px]">
                            {rubricCriteria.map((criterion, index) => {
                              const color = evidencePalette[index % evidencePalette.length];
                              return (
                                <span
                                  key={criterion.id}
                                  className="rounded px-2 py-1 font-semibold"
                                  style={{ backgroundColor: color.background, color: color.foreground }}
                                >
                                  TC{index + 1} · {criterion.title}
                                </span>
                              );
                            })}
                            {transcriptEvidence.some((item) => item.needsReview) && (
                              <span className="rounded bg-red-50 px-2 py-1 font-semibold text-red-800">
                                ! Cần giảng viên đối chiếu
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {isManualTranscript && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[9px] leading-relaxed text-amber-900">
                          Transcript đã được chỉnh sửa; dấu bằng chứng AI cũ được tạm ẩn cho đến khi chấm lại.
                        </p>
                      )}

                      <p className="whitespace-pre-line rounded-lg bg-white p-3 text-gray-800">
                        {transcriptChunks.map((chunk, chunkIndex) => {
                          if (!chunk.evidence?.length) return chunk.text;

                          const criterionIndex = rubricCriteria.findIndex(
                            (criterion) => criterion.id === chunk.evidence?.[0].criterionId
                          );
                          const color = evidencePalette[Math.max(criterionIndex, 0) % evidencePalette.length];
                          const criterionNames = chunk.evidence
                            .map((item) => rubricCriteria.find((criterion) => criterion.id === item.criterionId)?.title)
                            .filter((title): title is string => Boolean(title));
                          const timestamps = chunk.evidence
                            .map((item) => item.timestamp)
                            .filter((timestamp): timestamp is string => Boolean(timestamp));

                          return (
                            <mark
                              key={`${chunkIndex}-${chunk.text}`}
                              title={[
                                `Bằng chứng AI cho ${criterionNames.join(', ')}`,
                                ...timestamps,
                                chunk.evidence.some((item) => item.needsReview) ? 'Cần giảng viên đối chiếu' : '',
                              ].filter(Boolean).join(' · ')}
                              className="rounded px-1 py-0.5"
                              style={{
                                backgroundColor: chunk.evidence.some((item) => item.needsReview)
                                  ? '#fef2f2'
                                  : color.background,
                                color: chunk.evidence.some((item) => item.needsReview)
                                  ? '#991b1b'
                                  : color.foreground,
                              }}
                            >
                              {[...new Set(
                                chunk.evidence
                                  .map((item) => item.timestamp)
                                  .filter((timestamp): timestamp is string => Boolean(timestamp))
                              )].map((timestamp) => (
                                <span
                                  key={timestamp}
                                  className="mr-1 rounded bg-white/70 px-1 font-mono text-[9px] font-medium text-gray-700"
                                >
                                  {timestamp}
                                </span>
                              ))}
                              <strong className="mr-1 text-[9px]">
                                {chunk.evidence
                                  .map((item) => {
                                    const index = rubricCriteria.findIndex(
                                      (criterion) => criterion.id === item.criterionId
                                    );
                                    return index >= 0 ? `TC${index + 1}` : '';
                                  })
                                  .filter(Boolean)
                                  .join(', ')}
                                {chunk.evidence.some((item) => item.needsReview) ? ' !' : ''}
                              </strong>
                              {chunk.text}
                            </mark>
                          );
                        })}
                      </p>

                      {!transcriptText.trim() && (
                        <p className="text-[9px] italic text-gray-500">Chưa có transcript cho bài nộp này.</p>
                      )}

                      {!isManualTranscript && transcriptText.trim() && !hasMatchedEvidence && (
                        <p className="text-[9px] italic text-gray-500">
                          Chưa có đoạn transcript nào khớp với bằng chứng AI được cung cấp.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Banner & Nút AI Chấm lại khi Transcript thay đổi */}
                {isManualTranscript && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <div>
                        <span className="block font-bold text-amber-900 text-[10px]">
                          Transcript vừa được cập nhật thủ công
                        </span>
                        <span className="text-[9px] text-amber-700">
                          Kết quả AI hiện có có thể không còn khớp với transcript này.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isReevaluating || reevalSuccess}
                      onClick={handleReevaluate}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                    >
                      {isReevaluating ? (
                        <>
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang chấm lại...</span>
                        </>
                      ) : (
                        <>
                          <span>{reevalSuccess ? '✓' : '🔄'}</span>
                          <span>{reevalSuccess ? 'Đã chấm lại' : 'AI Chấm lại theo transcript mới'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {reevalSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-bold flex items-center gap-2">
                    <span>✓</span> AI đã hoàn tất chấm lại; kết quả mới sẽ hiển thị khi dữ liệu được cập nhật.
                  </div>
                )}
                {transcriptError && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] text-red-800">
                    {transcriptError}
                  </p>
                )}
              </section>
            </div>

            {/* ---------------------------------------------------- */}
            {/* CỘT PHẢI (7 COLS): PHIẾU ĐIỂM & BẢNG CHẤM ĐIỂM    */}
            {/* ---------------------------------------------------- */}
            <div className="xl:col-span-7">
              <section
                aria-label="Phiếu đánh giá AI và giảng viên"
                className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {/* Kết quả AI và điểm giảng viên */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        Phiếu đánh giá
                      </span>
                      <h2 className="mt-0.5 text-sm font-black text-gray-900">Kết quả AI &amp; giảng viên chấm</h2>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-bold text-indigo-700">
                      AI ĐỀ XUẤT • GIẢNG VIÊN DUYỆT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <span className="mb-1 block text-[10px] text-gray-500">Điểm AI đề xuất</span>
                      <span className="font-mono text-2xl font-black text-gray-900">
                        {hasAiScores ? aiScore.toFixed(1) : '—'}
                      </span>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <span className="mb-1 block text-[10px] font-bold text-emerald-800">Điểm giảng viên</span>
                      <span className="font-mono text-2xl font-black text-emerald-900">
                        {hasTeacherScores ? teacherScore.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900">
                        Tổng điểm giảng viên
                      </p>
                      <p className="mt-1 text-[9px] text-indigo-700">
                        {maxScore > 0 ? `Thang điểm tối đa ${maxScore.toFixed(1)}` : 'Chưa có thang điểm'}
                      </p>
                    </div>
                    <strong className="font-mono text-xl text-indigo-700">
                      {hasTeacherScores ? teacherScore.toFixed(1) : '—'}
                    </strong>
                  </div>

                  {/* Chỉ số phân tích chỉ hiển thị khi có dữ liệu AI */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {analysisMetrics.map((metric) => {
                      const value =
                        typeof metric.value === 'number' && Number.isFinite(metric.value)
                          ? Math.max(0, Math.min(100, metric.value))
                          : undefined;
                      return (
                        <div key={metric.label} className="space-y-1.5 rounded-xl border border-gray-200 bg-[#f9fafb] p-3">
                          <div className="flex justify-between gap-2 text-[10px] font-bold">
                            <span>{metric.label}</span>
                            <span className={`${metric.textColor} font-mono`}>{value === undefined ? '—' : `${value}%`}</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={metric.label}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={value ?? 0}
                            className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                          >
                            <div className={`h-full rounded-full transition-all duration-500 ${metric.color}`} style={{ width: `${value ?? 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px] text-gray-600">
                    {speechMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                        {metric.label}:{' '}
                        <strong className="font-mono text-gray-900">
                          {typeof metric.value === 'number' && Number.isFinite(metric.value)
                            ? `${metric.value} ${metric.unit}`
                            : '—'}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

              {/* CARD 2: PHÂN TÍCH CHI TIẾT TỪ MÔ HÌNH LLM */}
                <section className="space-y-3.5 border-t border-gray-100 pt-5">
                <h3 className="font-bold text-xs text-gray-900 flex items-center gap-2">
                  <span>📑</span> Phân tích Chi tiết từ Mô hình LLM
                </h3>

                {[
                  {
                    title: 'Ý đúng / Điểm mạnh',
                    items: aiAnalysis?.strengths,
                    className: 'border-[#bbf7d0] bg-[#f0fdf4] text-emerald-950',
                    titleClass: 'text-emerald-800',
                    icon: '✓',
                  },
                  {
                    title: 'Ý sai / Hiểu nhầm',
                    items: aiAnalysis?.misconceptions,
                    className: 'border-[#fecaca] bg-[#fef2f2] text-red-950',
                    titleClass: 'text-red-800',
                    icon: '✕',
                  },
                  {
                    title: 'Ý còn thiếu',
                    items: aiAnalysis?.missingPoints,
                    className: 'border-gray-200 bg-gray-50 text-gray-700',
                    titleClass: 'text-gray-800',
                    icon: '❓',
                  },
                ].map((group) => (
                  <div key={group.title} className={`space-y-1.5 rounded-xl border p-3.5 ${group.className}`}>
                    <span className={`flex items-center gap-1.5 font-bold ${group.titleClass}`}>
                      <span>{group.icon}</span> {group.title}
                    </span>
                    {group.items?.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-[10px] leading-relaxed">
                        {group.items.map((item, index) => <li key={`${group.title}-${index}`}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-[10px] leading-relaxed opacity-75">Chưa có nội dung phân tích.</p>
                    )}
                  </div>
                ))}

                <div className="space-y-1 rounded-xl bg-[#1e1b4b] p-3.5 text-white">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#c7d2fe]">
                    <span>💡</span> Nhận xét tổng quan của AI
                  </span>
                  <p className="text-[10px] leading-relaxed text-indigo-100 italic">
                    {aiAnalysis?.feedback || 'Chưa có nhận xét tổng quan từ AI.'}
                  </p>
                </div>
              </section>

              {/* CARD 3: BẢNG ĐIỀU KHIỂN GIẢNG VIÊN (OVERRIDE & FEEDBACK) */}
              <section className="space-y-4 border-t-2 border-indigo-100 pt-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-black text-xs text-gray-900 flex items-center gap-2">
                      <span>⚖️</span> Chấm điểm theo Rubric
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Điều chỉnh điểm AI đề xuất trước khi duyệt kết quả
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[9px]">
                    GIẢNG VIÊN
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="grid grid-cols-[minmax(0,1fr)_52px_70px] gap-2 bg-gray-50 px-3 py-2 text-[9px] font-bold uppercase text-gray-500 sm:grid-cols-[minmax(0,1fr)_64px_88px] sm:px-4">
                    <span>Rubric &amp; ghi chú</span>
                    <span className="text-center">Điểm AI</span>
                    <span className="text-center">Điểm giảng viên</span>
                  </div>

                  {rubricCriteria.map((criterion, index) => (
                    <div
                      key={criterion.id}
                      className="grid grid-cols-[minmax(0,1fr)_52px_70px] items-start gap-2 border-t border-gray-100 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_64px_88px] sm:px-4"
                    >
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold leading-relaxed text-gray-900">
                          {index + 1}. {criterion.title}{' '}
                          <span className="whitespace-nowrap font-medium text-gray-500">
                            ({isValidCriterion(criterion) ? criterion.maxPoints.toFixed(1) : '—'} điểm)
                          </span>
                        </h4>
                        {criterion.description && (
                          <p className="mt-1 text-[9px] leading-relaxed text-gray-500">{criterion.description}</p>
                        )}
                        {criterion.evidence && (
                          <p className="mt-1 text-[9px] leading-relaxed text-indigo-700">{criterion.evidence}</p>
                        )}
                        {criterion.feedbackSuggestion && (
                          <p className="mt-1.5 rounded-lg bg-amber-50 p-2 text-[9px] leading-relaxed text-amber-900">
                            <strong>Gợi ý AI:</strong> {criterion.feedbackSuggestion}
                          </p>
                        )}
                      </div>
                      <span
                        aria-label={`Điểm AI cho ${criterion.title}`}
                        className="pt-1 text-center text-[10px] font-bold font-mono text-indigo-700"
                      >
                        {isValidScore(criterion.aiPoints ?? Number.NaN, criterion)
                          ? criterion.aiPoints?.toFixed(1)
                          : '—'}
                      </span>
                      <input
                        id={`teacher-score-${criterion.id}`}
                        aria-label={`Điểm giảng viên cho ${criterion.title}`}
                        type="number"
                        step="0.1"
                        min="0"
                        max={isValidCriterion(criterion) ? criterion.maxPoints : undefined}
                        aria-invalid={
                          getTeacherScoreInput(criterion).trim() !== '' &&
                          !isValidScore(Number(getTeacherScoreInput(criterion)), criterion)
                        }
                        value={getTeacherScoreInput(criterion)}
                        onChange={(event) => {
                          setTeacherCriterionScores((current) => ({
                            ...current,
                            [criterion.id]: event.target.value,
                          }));
                          setReviewActionMessage('');
                          setReviewActionError('');
                          setIsPublished(false);
                        }}
                        onBlur={(event) => {
                          const rawScore = event.target.value;
                          if (rawScore === '') return;
                          const parsedScore = Number(rawScore);
                          if (Number.isFinite(parsedScore) && isValidCriterion(criterion)) {
                            const score = Math.min(criterion.maxPoints, Math.max(0, parsedScore));
                            setTeacherCriterionScores((current) => ({
                              ...current,
                              [criterion.id]: String(score),
                            }));
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-1 py-1.5 text-center text-[10px] font-bold font-mono text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 aria-[invalid=true]:border-red-500"
                      />
                    </div>
                  ))}
                  {rubricCriteria.length === 0 && (
                    <p className="border-t border-gray-100 px-4 py-5 text-center text-[10px] leading-relaxed text-gray-500">
                      Chưa có Rubric. Các tiêu chí và điểm sẽ hiển thị sau khi người dùng tạo hoặc tải Rubric lên.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="teacher-feedback" className="text-[11px] font-bold text-gray-800">
                      Nhận xét giảng viên
                    </label>
                    {suggestedFeedback && (
                      <button
                        type="button"
                        onClick={insertAiFeedback}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] font-bold text-amber-900 hover:bg-amber-100"
                      >
                        Chèn nhận xét AI gợi ý
                      </button>
                    )}
                  </div>
                  {suggestedFeedback && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">
                      <strong>Gợi ý nhận xét từ AI</strong>
                      <p className="mt-1">{suggestedFeedback}</p>
                    </div>
                  )}
                  <textarea
                    id="teacher-feedback"
                    rows={3}
                    value={feedback}
                    onChange={(e) => {
                      setFeedback(e.target.value);
                      setReviewActionMessage('');
                      setReviewActionError('');
                      setIsPublished(false);
                    }}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-[11px] leading-relaxed outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    placeholder="Viết nhận xét về bài làm của sinh viên..."
                  />
                  <p className="text-[9px] text-gray-500">
                    Gợi ý của AI chỉ mang tính tham khảo; giảng viên có thể chỉnh sửa trước khi lưu.
                  </p>
                </div>

                {/* Nút hành động */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={syncCanvas}
                      onChange={(e) => {
                        setSyncCanvas(e.target.checked);
                        setReviewActionMessage('');
                        setReviewActionError('');
                        setIsPublished(false);
                      }}
                      className="rounded text-black focus:ring-black cursor-pointer"
                    />
                    <span>Tự động đồng bộ vào Sổ điểm Canvas/Moodle</span>
                  </label>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => void handleReviewAction('save')}
                      disabled={pendingReviewAction !== null}
                      className="flex-1 sm:flex-none rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      {pendingReviewAction === 'save' ? 'Đang lưu...' : 'Lưu tạm'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleReviewAction('publish')}
                      disabled={isPublished || pendingReviewAction !== null}
                      className="flex-1 sm:flex-none rounded-xl bg-black px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>🚀</span>
                      <span>
                        {pendingReviewAction === 'publish'
                          ? 'Đang công bố...'
                          : isPublished
                            ? 'Đã công bố kết quả'
                            : 'Công bố kết quả (Publish)'}
                      </span>
                    </button>
                  </div>
                </div>
                {(reviewActionError || reviewActionMessage) && (
                  <p
                    role={reviewActionError ? 'alert' : 'status'}
                    className={`text-[10px] ${reviewActionError ? 'text-red-700' : 'text-emerald-700'}`}
                  >
                    {reviewActionError || reviewActionMessage}
                  </p>
                )}
              </section>
              </section>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. FOOTER CÔNG CỤ CHẤM BÀI (BOTTOM FIXED BAR)             */}
          {/* ========================================================= */}
          <footer className="fixed bottom-0 inset-x-0 lg:left-64 z-30 bg-white border-t border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-600 font-medium">
                👤 <strong>{studentName || 'Sinh viên'}</strong>
                {studentCode && <> • {studentCode}</>}
                {assignmentTitle && <> | Bài tập: <em>{assignmentTitle}</em></>}
              </span>

              <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                <button
                  type="button"
                  onClick={onPreviousSubmission}
                  disabled={!onPreviousSubmission}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Sinh viên trước"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={onNextSubmission}
                  disabled={!onNextSubmission || !questionProgressSummary.isComplete}
                  aria-label="Qua sinh viên tiếp theo"
                  title={
                    !questionProgressSummary.isComplete
                      ? 'Hãy lưu tạm hoặc công bố điểm cho tất cả câu hỏi trước'
                      : undefined
                  }
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⏭
                </button>
              </div>
            </div>

            {/* Tiến độ chấm bài của lớp */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-gray-500">
                Tiến độ chấm lớp:{' '}
                <strong className="font-mono text-gray-900">
                  {classTotal > 0 ? `${classReviewed} / ${classTotal} sinh viên` : 'Chưa có dữ liệu'}
                </strong>
              </span>
              <div
                role="progressbar"
                aria-label="Tiến độ chấm bài của lớp"
                aria-valuemin={0}
                aria-valuemax={classTotal || 1}
                aria-valuenow={classReviewed}
                className="h-2 w-28 overflow-hidden rounded-full bg-gray-200"
              >
                <div className="h-full rounded-full bg-black" style={{ width: `${classProgressPercent}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-[11px] flex items-center gap-1"
              >
                <span>🕒</span> Lịch sử chấm
              </button>

              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-indigo-700"
              >
                <span>📥</span> Xuất Báo cáo PDF
              </button>
            </div>
          </footer>
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL TẢI LÊN FILE TRANSCRIPT (.TXT / .SRT / .VTT)         */}
      {/* ========================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transcript-upload-title"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  📤
                </div>
                <div>
                  <h3 id="transcript-upload-title" className="text-sm font-bold text-gray-900">
                    Tải lên file Transcript
                  </h3>
                  <span className="text-[10px] text-gray-400">Hỗ trợ định dạng .txt, .srt, .vtt</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại tải transcript"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Khi bản nhận diện âm thanh tự động có sai sót do tạp âm hoặc phát âm không chuẩn, giảng viên có thể tải lên bản transcript đã được hiệu chỉnh chính xác để AI đánh giá lại.
              </p>

              {transcriptError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] text-red-800">
                  {transcriptError}
                </p>
              )}

              <label className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-indigo-50/20 transition group">
                <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-indigo-600 text-lg group-hover:scale-110 transition">
                  📄
                </div>
                <span className="mt-2 text-xs font-bold text-gray-900">
                  {uploadedFileName || 'Chọn tệp từ máy tính'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Tối đa dung lượng 10MB</span>
                <input
                  type="file"
                  accept=".txt,.srt,.vtt"
                  onChange={handleFileUpload}
                  aria-label="Chọn file transcript"
                  className="sr-only"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherEvaluationSession(props: TeacherEvaluationProps) {
  const [questionStatusOverrides, setQuestionStatusOverrides] = useState<
    Record<number, TeacherQuestionReviewStatus>
  >({});
  const currentQuestion = props.reviewProgress?.currentQuestion;
  const reviewProgress = props.reviewProgress
    ? {
        ...props.reviewProgress,
        questions: props.reviewProgress.questions.map((question) => ({
          ...question,
          status: questionStatusOverrides[question.number] ?? question.status,
        })),
      }
    : undefined;
  const setCurrentQuestionStatus = (status: TeacherQuestionReviewStatus) => {
    if (currentQuestion === undefined) return;
    setQuestionStatusOverrides((current) => ({ ...current, [currentQuestion]: status }));
  };
  const saveReview = props.onSaveReview;
  const publishReview = props.onPublishReview;
  const onSaveReview = saveReview
    ? async (review: TeacherEvaluationDraft) => {
        await saveReview(review);
        setCurrentQuestionStatus('draft');
      }
    : undefined;
  const onPublishReview = publishReview
    ? async (review: TeacherEvaluationDraft) => {
        await publishReview(review);
        setCurrentQuestionStatus('published');
      }
    : undefined;
  const submissionKey =
    props.submissionId ??
    `${props.examId ?? ''}:${props.studentCode ?? props.studentName ?? ''}:${props.assignmentTitle ?? ''}`;
  const reviewKey = `${submissionKey}:question-${props.reviewProgress?.currentQuestion ?? ''}`;

  return (
    <TeacherEvaluationContent
      key={reviewKey}
      {...props}
      reviewProgress={reviewProgress}
      onSaveReview={onSaveReview}
      onPublishReview={onPublishReview}
    />
  );
}

export default function TeacherEvaluation(props: TeacherEvaluationProps) {
  const submissionKey =
    props.submissionId ??
    `${props.examId ?? ''}:${props.studentCode ?? props.studentName ?? ''}:${props.assignmentTitle ?? ''}`;

  return <TeacherEvaluationSession key={submissionKey} {...props} />;
}