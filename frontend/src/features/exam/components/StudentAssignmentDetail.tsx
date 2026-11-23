'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import StudentPageShell from '@/components/layout/StudentPageShell';
import QuestionMatrix from '@/features/exam/components/QuestionMatrix';
import QuestionAnswerCard from '@/features/exam/components/QuestionAnswerCard';
import SubmissionAnalysis from '@/features/exam/components/SubmissionAnalysis';
import RetakePanel, { type RetakeStatus } from '@/features/exam/components/RetakePanel';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import { gradingSettled, transcriptSettled } from '@/lib/answer-status';
import { useAnswerWatcher } from '@/hooks/useAnswerWatcher';
import { useAnswerRecorder } from '@/features/exam/hooks/useAnswerRecorder';
import { useExamClock } from '@/features/exam/hooks/useExamClock';
import type {
  AnswerVersion, AssignmentQuestion, Criterion, QuestionGrade, QuestionProgress, VersionStatus, WorkTileState,
} from '@/features/exam/types';
import { MAX_VERSIONS_PER_QUESTION, finalVersionOf, formatClock, isVersionReady, notReadyReason, resultLevelOf } from '@/features/exam/types';

type ServerVersion = {
  id: string;
  question_id: string;
  attempt_number?: number;
  is_final?: boolean;
  status: string;
  submitted_at?: string;
  audio_duration_seconds?: number | null;
  audio_url?: string | null;
  transcript: string | null;
  original_transcript: string | null;
};

interface AssignmentDetail {
  id: string;
  title: string;
  instructions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes?: number | null;
  status: 'published' | 'closed' | 'archived';
  results_published_at?: string | null;
  questions: AssignmentQuestion[];
  ai_workflow_ready?: boolean;
  /** Làm lại cả bài (migration 009); null khi máy chủ chưa hỗ trợ. */
  retake?: RetakeStatus | null;
  my_submission?: null | {
    attempt_id: string;
    status: string;
    deadline_at?: string | null;
    started_at?: string;
    versions_supported?: boolean;
    versions?: ServerVersion[];
    official?: {
      total_score: number | null;
      reviews: Record<string, { final_score: number; reviewer_feedback: string | null }>;
    };
    answers: Array<ServerVersion & {
      reference_answer?: string | null;
      evaluation: null | { score: number; feedback: string; needs_teacher_review: boolean; criteria: Criterion[] };
    }>;
  };
}

type Attempt = { id: string; status: string; deadlineAt: string | null; startedAt: string | null };

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Không giới hạn';

function versionStatusFromServer(version: ServerVersion): VersionStatus {
  if (version.transcript) return 'transcribed';
  if (version.status === 'failed') return 'failed';
  if (version.status === 'processing') return 'transcribing';
  return 'uploaded';
}

/** Dựng tiến độ phía client từ dữ liệu server (các phiên bản + đánh giá AI của bản đã nộp). */
function buildProgress(data: AssignmentDetail): Record<string, QuestionProgress> {
  const submission = data.my_submission;
  if (!submission) return {};
  const versions: ServerVersion[] = submission.versions ?? submission.answers.map((answer) => ({ ...answer, is_final: true, attempt_number: 1 }));
  const progress: Record<string, QuestionProgress> = {};
  for (const question of data.questions) {
    const own = versions.filter((version) => version.question_id === question.id);
    const items: AnswerVersion[] = own.map((version, index) => ({
      key: version.id,
      id: version.id,
      attemptNumber: version.attempt_number ?? index + 1,
      status: versionStatusFromServer(version),
      audioUrl: version.audio_url ?? undefined,
      durationSeconds: version.audio_duration_seconds ?? undefined,
      createdAt: version.submitted_at ?? new Date().toISOString(),
      transcript: version.transcript ?? undefined,
      originalTranscript: version.original_transcript ?? version.transcript ?? undefined,
    }));
    const finalId = own.find((version) => version.is_final)?.id;
    const answer = submission.answers.find((item) => item.id === finalId);
    const grade: QuestionGrade | undefined = answer?.evaluation ? {
      status: 'graded',
      score: Number(answer.evaluation.score),
      feedback: answer.evaluation.feedback,
      criteria: answer.evaluation.criteria,
      needsTeacherReview: answer.evaluation.needs_teacher_review,
      referenceAnswer: answer.reference_answer ?? undefined,
    } : undefined;
    const review = finalId ? submission.official?.reviews[finalId] : undefined;
    const official = review ? { score: Number(review.final_score), feedback: review.reviewer_feedback } : undefined;
    if (items.length) progress[question.id] = { versions: items, finalKey: finalId, grade, official };
  }
  return progress;
}

export default function StudentAssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [progress, setProgress] = useState<Record<string, QuestionProgress>>({});
  const [versionsSupported, setVersionsSupported] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [workflowError, setWorkflowError] = useState('');

  const localUrlsRef = useRef<Set<string>>(new Set());
  const progressRef = useRef(progress);
  const autoSubmittedRef = useRef(false);
  const keyCounterRef = useRef(0);

  const { watch, isMounted } = useAnswerWatcher();
  const { recording, start: startRecording, stop: stopRecording } = useAnswerRecorder({
    onRecorded: (question, file, durationSeconds, liveTranscript) => void uploadVersion(question, file, durationSeconds, liveTranscript),
    onError: setWorkflowError,
  });
  // Mở lại trang khi worker còn đang xử lý: tiếp tục theo dõi nhận dạng / chấm điểm.
  const resumeRef = useRef<(data: AssignmentDetail) => void>(() => undefined);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => {
    resumeRef.current = (data) => {
      const submission = data.my_submission;
      if (!submission) return;
      if (submission.status === 'in_progress') {
        for (const version of submission.versions ?? []) {
          if (!version.transcript && ['queued', 'processing'].includes(version.status)) {
            void watchTranscription(version.question_id, version.id, version.id, false);
          }
        }
        return;
      }
      const pending = submission.answers.filter((answer) => !answer.evaluation && ['queued', 'processing'].includes(answer.status));
      void trackGrading(pending.map((answer) => ({ questionId: answer.question_id, submissionId: answer.id })));
    };
  });

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: AssignmentDetail }>(`/api/assignments/${assignmentId}`)
      .then(({ data }) => {
        if (!active) return;
        setAssignment(data);
        const submission = data.my_submission;
        if (submission) {
          setAttempt({ id: submission.attempt_id, status: submission.status, deadlineAt: submission.deadline_at ?? null, startedAt: submission.started_at ?? null });
          setVersionsSupported(submission.versions_supported !== false);
          setProgress(buildProgress(data));
          autoSubmittedRef.current = submission.status !== 'in_progress';
          resumeRef.current(data);
        }
      })
      .catch((error) => { if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải nội dung bài tập.'); })
      .finally(() => { if (active) setLoading(false); });

    const localUrls = localUrlsRef.current;
    return () => {
      active = false;
      localUrls.forEach((url) => URL.revokeObjectURL(url));
      localUrls.clear();
    };
  }, [assignmentId]);

  const phase: 'intro' | 'working' | 'submitted' = !attempt ? 'intro' : attempt.status === 'in_progress' ? 'working' : 'submitted';

  // Đồng hồ: chạy khi đang làm bài (đếm ngược thời gian thi và thời gian của từng lần ghi).
  const { now, secondsLeft, elapsedSeconds, sync: syncClock } = useExamClock({
    running: phase === 'working', deadlineAt: attempt?.deadlineAt, startedAt: attempt?.startedAt,
  });

  // ----- Cập nhật state -----
  function updateQuestion(questionId: string, update: (current: QuestionProgress) => QuestionProgress) {
    setProgress((current) => ({ ...current, [questionId]: update(current[questionId] ?? { versions: [] }) }));
  }
  function updateVersion(questionId: string, key: string, patch: Partial<AnswerVersion>) {
    updateQuestion(questionId, (current) => ({ ...current, versions: current.versions.map((version) => version.key === key ? { ...version, ...patch } : version) }));
  }
  function setGrade(questionId: string, grade: QuestionGrade) {
    updateQuestion(questionId, (current) => ({ ...current, grade }));
  }

  // ----- Bắt đầu làm bài -----
  async function startExam() {
    setStarting(true);
    setWorkflowError('');
    try {
      const { data } = await oralcheckFetch<{ data: { attempt_id: string; status: string; started_at: string; deadline_at: string | null } }>(
        `/api/assignments/${assignmentId}/start`, { method: 'POST' },
      );
      syncClock();
      setAttempt({ id: data.attempt_id, status: data.status, deadlineAt: data.deadline_at, startedAt: data.started_at });
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'Không thể bắt đầu làm bài.');
    } finally { setStarting(false); }
  }

  // ----- Tải phiên bản lên, rồi nhận dạng giọng nói -----
  async function uploadVersion(question: Pick<AssignmentQuestion, 'id'>, file: File, durationSeconds?: number, liveTranscript = '') {
    if (file.size > 25 * 1024 * 1024) { setWorkflowError('Tệp ghi âm không được vượt quá 25 MB.'); return; }
    setWorkflowError('');
    keyCounterRef.current += 1;
    const key = `local-${keyCounterRef.current}`;
    const audioUrl = URL.createObjectURL(file);
    localUrlsRef.current.add(audioUrl);
    updateQuestion(question.id, (current) => ({
      ...current,
      versions: [...current.versions, {
        key,
        attemptNumber: Math.max(0, ...current.versions.map((version) => version.attemptNumber)) + 1,
        status: 'uploading',
        audioUrl,
        durationSeconds,
        createdAt: new Date().toISOString(),
        transcript: liveTranscript || undefined,
        originalTranscript: undefined,
      }],
    }));

    try {
      const form = new FormData();
      form.append('question_id', question.id);
      form.append('audio', file);
      if (durationSeconds) form.append('duration_seconds', String(durationSeconds));
      const { data } = await oralcheckFetch<{ data: { id: string; assignment_submission_id: string; transcription_queued: boolean } }>(
        `/api/assignments/${assignmentId}/answers`, { method: 'POST', body: form },
      );
      // Server tự đặt bản mới nhất làm bản nộp; sinh viên có thể chọn lại bản cũ.
      updateQuestion(question.id, (current) => ({
        ...current,
        finalKey: key,
        versions: current.versions.map((version) => version.key === key ? { ...version, id: data.id, status: 'uploaded' } : version),
      }));
      // Backend đã đưa job nhận dạng vào hàng đợi; chỉ cần theo dõi. Hàng đợi lỗi thì gửi lại yêu cầu.
      void watchTranscription(question.id, key, data.id, !data.transcription_queued);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải câu trả lời lên.';
      updateVersion(question.id, key, { status: 'failed', error: message });
      setWorkflowError(message);
    }
  }

  /** Chờ worker nhận dạng xong. `request` = gửi (lại) job ASR trước khi chờ (nút "Tạo transcript"). */
  async function watchTranscription(questionId: string, key: string, submissionId: string, request: boolean) {
    updateVersion(questionId, key, { status: 'transcribing', error: undefined });
    try {
      if (request) await oralcheckFetch(`/api/submissions/${submissionId}/transcribe`, { method: 'POST' });
      const result = await watch(submissionId, transcriptSettled);
      if (result.status === 'failed' && !result.transcript) {
        updateVersion(questionId, key, { status: 'failed', error: result.error_message ?? 'Không thể tạo transcript.' });
        return;
      }
      const transcript = result.transcript ?? '';
      updateQuestion(questionId, (current) => ({
        ...current,
        versions: current.versions.map((version) => version.key === key ? {
          ...version,
          status: 'transcribed',
          transcript: version.transcriptEdited ? version.transcript : transcript,
          originalTranscript: transcript,
        } : version),
      }));
    } catch (error) {
      if (!isMounted()) return;
      updateVersion(questionId, key, { status: 'failed', error: error instanceof Error ? error.message : 'Không thể tạo transcript.' });
    }
  }

  async function selectVersion(questionId: string, version: AnswerVersion) {
    if (!version.id) return;
    const previous = progressRef.current[questionId]?.finalKey;
    updateQuestion(questionId, (current) => ({ ...current, finalKey: version.key }));
    try {
      await oralcheckFetch(`/api/submissions/${version.id}/select`, { method: 'POST' });
    } catch (error) {
      updateQuestion(questionId, (current) => ({ ...current, finalKey: previous }));
      setWorkflowError(error instanceof Error ? error.message : 'Không thể chọn phiên bản này.');
    }
  }

  // ----- Nộp bài và chấm AI -----
  /**
   * Chờ worker chấm xong các câu (job đã được backend đưa vào hàng đợi khi nộp bài),
   * rồi tải lại bài làm từ máy chủ để hiện điểm AI, nhận xét và đáp án (nếu giảng viên cho xem).
   */
  async function trackGrading(items: Array<{ questionId: string; submissionId: string }>) {
    if (items.length === 0) return;
    items.forEach((item) => setGrade(item.questionId, { status: 'grading' }));
    const failures = new Map<string, string>();
    await Promise.all(items.map(async (item) => {
      try {
        const result = await watch(item.submissionId, gradingSettled);
        if (result.status === 'failed') failures.set(item.questionId, result.error_message ?? 'Không thể chấm bài bằng AI.');
      } catch (error) {
        failures.set(item.questionId, error instanceof Error ? error.message : 'Không thể chấm bài bằng AI.');
      }
    }));
    if (!isMounted()) return;
    try {
      const { data } = await oralcheckFetch<{ data: AssignmentDetail }>(`/api/assignments/${assignmentId}`);
      setAssignment(data);
      setProgress(buildProgress(data));
    } catch {
      // Giữ trạng thái hiện tại; tải lại trang sẽ thấy điểm.
    }
    failures.forEach((message, questionId) => setGrade(questionId, { status: 'failed', error: message }));
  }

  /** Sinh viên bấm "Chấm lại" cho câu bị lỗi: gửi lại job chấm rồi theo dõi. */
  async function gradeQuestion(questionId: string, version: AnswerVersion | undefined) {
    if (!version?.id) return;
    setGrade(questionId, { status: 'grading' });
    try {
      await oralcheckFetch(`/api/submissions/${version.id}/grade`, { method: 'POST' });
      await trackGrading([{ questionId, submissionId: version.id }]);
    } catch (error) {
      setGrade(questionId, { status: 'failed', error: error instanceof Error ? error.message : 'Không thể chấm bài bằng AI.' });
    }
  }

  async function submitExam(auto = false) {
    if (!attempt || !assignment || submitting) return;
    if (recording) stopRecording();
    setConfirmSubmit(false);
    setSubmitting(true);
    setWorkflowError(auto ? 'Đã hết giờ. Hệ thống đang tự nộp các câu đã chọn bản nộp…' : '');
    try {
      // Hết giờ: chờ một nhịp để đồng hồ máy chủ cũng đã qua hạn (máy chủ mới cho nộp thiếu câu).
      if (auto) await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const snapshot = progressRef.current;
      const finals = assignment.questions
        .map((question) => ({ questionId: question.id, version: finalVersionOf(snapshot[question.id]) }))
        .filter((item): item is { questionId: string; version: AnswerVersion & { id: string } } => Boolean(item.version?.id));
      // Gửi kèm transcript sinh viên đã sửa / tự gõ để backend lưu trước khi khóa bài.
      const transcripts = finals
        .filter(({ version }) => version.transcript?.trim() && version.transcript !== version.originalTranscript)
        .map(({ version }) => ({ submission_id: version.id, transcript_text: version.transcript!.trim() }));
      await oralcheckFetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST', body: JSON.stringify({ assignment_submission_id: attempt.id, transcripts }),
      });
      autoSubmittedRef.current = true;
      setAttempt((current) => current ? { ...current, status: 'submitted' } : current);
      setWorkflowError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await trackGrading(finals.map(({ questionId, version }) => ({ questionId, submissionId: version.id })));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'Không thể nộp bài.');
    } finally { setSubmitting(false); }
  }

  // Tự nộp khi hết giờ — dùng ref để effect không phụ thuộc vào hàm nộp bài.
  const submitExamRef = useRef(submitExam);
  useEffect(() => { submitExamRef.current = submitExam; });
  useEffect(() => {
    if (secondsLeft !== 0 || phase !== 'working' || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitExamRef.current(true);
  }, [secondsLeft, phase]);

  // ----- Hiển thị -----
  const questions = assignment?.questions ?? [];
  const readyCount = questions.filter((question) => isVersionReady(finalVersionOf(progress[question.id]))).length;
  // Chỉ bản đã chọn mới quyết định có nộp được hay không; bản cũ đang xử lý dở không chặn nộp bài.
  const canSubmit = phase === 'working' && questions.length > 0 && readyCount === questions.length && !recording && !submitting;
  const plannedMinutes = assignment
    ? assignment.duration_minutes ?? Math.ceil(questions.reduce((sum, question) => sum + question.time_limit_seconds, 0) / 60)
    : 0;
  const notYetOpen = Boolean(assignment?.starts_at && new Date(assignment.starts_at).getTime() > now);
  const pastDue = Boolean(assignment?.ends_at && new Date(assignment.ends_at).getTime() < now);

  function workTileState(question: AssignmentQuestion): WorkTileState {
    const item = progress[question.id];
    if (recording?.questionId === question.id) return 'processing';
    if (!item?.versions.length) return 'empty';
    const final = finalVersionOf(item);
    if (isVersionReady(final)) return 'ready';
    if (final && (final.status === 'uploading' || final.status === 'transcribing')) return 'processing';
    return 'attention';
  }

  const timerTone = secondsLeft === null ? 'bg-gray-100 text-gray-900' : secondsLeft <= 60 ? 'bg-red-600 text-white' : secondsLeft <= 300 ? 'bg-amber-100 text-amber-900' : 'bg-gray-900 text-white';
  const timerBlock = (
    <div role="timer" aria-live="off" aria-label="Thời gian còn lại" className={`rounded-xl px-4 py-3 ${timerTone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{secondsLeft === null ? 'Thời gian đã làm' : 'Thời gian còn lại'}</p>
      <p className="font-mono text-3xl font-bold tabular-nums">{formatClock(secondsLeft ?? elapsedSeconds)}</p>
      {attempt?.deadlineAt && <p className="text-[11px] opacity-80">Hết giờ lúc {new Date(attempt.deadlineAt).toLocaleTimeString('vi-VN')} · tự nộp khi hết giờ</p>}
    </div>
  );

  return (
    <StudentPageShell currentPage="classes" breadcrumb={assignment?.title ?? 'Đề bài'}>
      <div className="mx-auto max-w-6xl">
        <Link href="/student/classes" className="text-sm font-medium text-gray-600 hover:text-black">← Quay lại lớp học</Link>
        {loading && <p className="mt-6 text-sm text-gray-500">Đang tải đề bài...</p>}
        {errorMessage && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

        {!loading && !errorMessage && assignment && <>
          <header className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phase === 'submitted' ? 'bg-emerald-50 text-emerald-800' : phase === 'working' ? 'bg-sky-50 text-sky-800' : 'bg-gray-100 text-gray-700'}`}>
              {phase === 'submitted' ? 'Đã nộp bài' : phase === 'working' ? 'Đang làm bài' : 'Chưa bắt đầu'}
            </span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">{assignment.title}</h1>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-gray-500">Mở từ</dt><dd className="mt-1 font-medium text-gray-800">{formatDate(assignment.starts_at)}</dd></div>
              <div><dt className="text-gray-500">Hạn nộp</dt><dd className="mt-1 font-medium text-gray-800">{formatDate(assignment.ends_at)}</dd></div>
              <div><dt className="text-gray-500">Số câu</dt><dd className="mt-1 font-medium text-gray-800">{questions.length} câu</dd></div>
              <div><dt className="text-gray-500">Thời lượng</dt><dd className="mt-1 font-medium text-gray-800">{plannedMinutes} phút</dd></div>
            </dl>
            {assignment.instructions && <div className="mt-6 border-t border-gray-100 pt-5"><h2 className="text-sm font-semibold text-gray-900">Hướng dẫn</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{assignment.instructions}</p></div>}
          </header>

          {assignment.ai_workflow_ready === false && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Speech-to-Text chưa sẵn sàng. Quản trị viên cần chạy các migration Supabase mới nhất (004 trở lên).</p>}
          {!versionsSupported && phase === 'working' && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Máy chủ chưa chạy supabase/seed.sql và migration 006: bản ghi mới nhất của mỗi câu sẽ tự động là bản nộp, chưa thể chọn lại bản cũ.</p>}
          {workflowError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{workflowError}</p>}

          {/* Giai đoạn 1: chưa bắt đầu — ẩn nội dung câu hỏi cho tới khi bấm Bắt đầu */}
          {phase === 'intro' && (
            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-center sm:p-10">
              <h2 className="text-lg font-bold text-gray-900">Sẵn sàng làm bài?</h2>
              <ul className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm text-gray-700">
                <li>⏱ Đồng hồ <strong>{plannedMinutes} phút</strong> bắt đầu chạy ngay khi bấm nút, không tạm dừng được. Hết giờ hệ thống tự nộp.</li>
                <li>🎙 Mỗi câu được ghi âm lại tối đa {MAX_VERSIONS_PER_QUESTION} lần; bạn chọn <strong>một</strong> bản để nộp.</li>
                <li>📝 Kiểm tra transcript của bản đã chọn trước khi nộp; AI chấm dựa trên transcript đó.</li>
                <li>🔒 Hãy cho phép trình duyệt dùng micro và làm bài ở nơi yên tĩnh.</li>
              </ul>
              <button
                type="button"
                disabled={starting || assignment.status !== 'published' || assignment.ai_workflow_ready === false || notYetOpen || pastDue}
                onClick={() => void startExam()}
                className="mt-6 rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {starting ? 'Đang bắt đầu…' : 'Bắt đầu làm bài'}
              </button>
              {(notYetOpen || pastDue || assignment.status !== 'published') && <p className="mt-3 text-xs text-gray-500">{notYetOpen ? 'Bài tập chưa đến giờ mở.' : 'Bài tập đã đóng.'}</p>}
              <p className="mt-4 text-sm">
                <Link href={`/student/recorder?assignmentId=${assignmentId}`} className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
                  Thử micro trước khi làm bài →
                </Link>
              </p>
            </section>
          )}

          {/* Giai đoạn 2: đang làm bài */}
          {phase === 'working' && <>
            <div className="sticky top-0 z-20 -mx-4 mt-4 border-b border-gray-200 bg-white/75 px-4 py-2 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">{readyCount}/{questions.length} câu sẵn sàng</span>
                <span className={`rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums ${timerTone}`}>{formatClock(secondsLeft ?? elapsedSeconds)}</span>
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <ol className="order-2 space-y-4 lg:order-1">
                {questions.map((question) => (
                  <QuestionAnswerCard
                    key={question.id}
                    question={question}
                    progress={progress[question.id]}
                    recording={recording?.questionId === question.id ? {
                      secondsLeft: Math.max(0, question.time_limit_seconds - Math.floor((now - recording.startedAt) / 1000)),
                      liveTranscript: recording.liveTranscript,
                      liveSupported: recording.liveSupported,
                    } : null}
                    locked={Boolean(recording && recording.questionId !== question.id) || submitting}
                    versionsSupported={versionsSupported}
                    onRecord={() => { setWorkflowError(''); void startRecording(question); }}
                    onStop={stopRecording}
                    onUploadFile={(file) => void uploadVersion(question, file)}
                    onSelect={(version) => void selectVersion(question.id, version)}
                    onEditTranscript={(version, text) => updateVersion(question.id, version.key, { transcript: text, transcriptEdited: true })}
                    onTranscribe={(version) => version.id && void watchTranscription(question.id, version.key, version.id, true)}
                  />
                ))}
              </ol>

              <aside className="order-1 lg:order-2">
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 lg:sticky lg:top-4">
                  <div className="hidden lg:block">{timerBlock}</div>
                  <QuestionMatrix
                    title="Tiến độ các câu"
                    items={questions.map((question) => ({
                      id: question.id,
                      position: question.position,
                      mode: 'work' as const,
                      state: workTileState(question),
                      caption: progress[question.id]?.versions.length ? `${progress[question.id].versions.length} bản` : undefined,
                    }))}
                  />
                  <div className="border-t border-gray-100 pt-4">
                    {canSubmit ? (
                      <p className="text-xs text-emerald-700">Mọi câu đã có bản nộp và transcript.</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-gray-700">
                        {questions.map((question) => {
                          const reason = notReadyReason(progress[question.id]);
                          return reason ? <li key={question.id}><a href={`#question-${question.id}`} className="hover:underline"><strong>Câu {question.position}:</strong> {reason}</a></li> : null;
                        })}
                        {recording && <li>Đang ghi âm — hãy dừng trước khi nộp.</li>}
                      </ul>
                    )}
                    {!confirmSubmit ? (
                      <button type="button" disabled={!canSubmit} onClick={() => setConfirmSubmit(true)} className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                        {submitting ? 'Đang nộp…' : 'Nộp bài'}
                      </button>
                    ) : (
                      <div className="mt-3 rounded-xl border border-gray-900 p-3" role="alertdialog" aria-label="Xác nhận nộp bài">
                        <p className="text-xs text-gray-800">Nộp {questions.length} bản đã chọn? Sau khi nộp không thể ghi âm hay đổi bản nữa.</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => void submitExam()} className="flex-1 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white">Xác nhận nộp</button>
                          <button type="button" onClick={() => setConfirmSubmit(false)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">Hủy</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>}

          {/* Giai đoạn 3: đã nộp — ma trận đúng/sai và phân tích */}
          {phase === 'submitted' && (
            <RetakePanel
              assignmentId={assignmentId}
              initialStatus={assignment.retake}
              refreshKey={questions.filter((question) => progress[question.id]?.grade?.status === 'graded').length}
            />
          )}
          {phase === 'submitted' && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="order-2 lg:order-1">
                <SubmissionAnalysis
                  questions={questions}
                  progress={progress}
                  resultsPublished={Boolean(assignment.results_published_at)}
                  officialTotal={assignment.my_submission?.official?.total_score ?? null}
                  onRetryGrade={(questionId) => void gradeQuestion(questionId, finalVersionOf(progress[questionId]))}
                />
              </div>
              <aside className="order-1 lg:order-2">
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 lg:sticky lg:top-4">
                  <QuestionMatrix
                    title={assignment.results_published_at ? 'Điểm chính thức từng câu' : 'Kết quả AI từng câu'}
                    items={questions.map((question) => {
                      const item = progress[question.id];
                      const shownScore = item?.official?.score ?? (item?.grade?.status === 'graded' ? item.grade.score : undefined);
                      return {
                        id: question.id,
                        position: question.position,
                        mode: 'result' as const,
                        state: resultLevelOf(item, question.max_score),
                        caption: shownScore !== undefined ? `${shownScore}/${question.max_score}` : undefined,
                      };
                    })}
                  />
                  <Link href="/student/history" className="mt-4 block rounded-xl border border-gray-300 px-4 py-2.5 text-center text-xs font-semibold text-gray-800 hover:bg-gray-50">Xem lịch sử bài nộp</Link>
                </div>
              </aside>
            </div>
          )}
        </>}
      </div>
    </StudentPageShell>
  );
}
