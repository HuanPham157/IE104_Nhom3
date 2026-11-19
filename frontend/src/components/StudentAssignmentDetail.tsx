'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import StudentPageShell from '@/components/StudentPageShell';
import QuestionMatrix from '@/components/assignment/QuestionMatrix';
import QuestionAnswerCard from '@/components/assignment/QuestionAnswerCard';
import SubmissionAnalysis from '@/components/assignment/SubmissionAnalysis';
import RetakePanel, { type RetakeStatus } from '@/components/assignment/RetakePanel';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import {
  getSpeechRecognition, microphoneErrorMessage, openMicrophone, pickRecorderMimeType, type LiveRecognition,
} from '@/lib/microphone';
import type {
  AnswerVersion, AssignmentQuestion, Criterion, QuestionGrade, QuestionProgress, VersionStatus, WorkTileState,
} from '@/components/assignment/types';
import { MAX_VERSIONS_PER_QUESTION, finalVersionOf, formatClock, isVersionReady, notReadyReason, resultLevelOf } from '@/components/assignment/types';

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
type RecordingState = { questionId: string; startedAt: number; liveTranscript: string; liveSupported: boolean };

/** Thời điểm hiện tại (ms) — tách khỏi component để dùng trong handler sự kiện. */
const currentTimeMs = () => Date.now();

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
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [workflowError, setWorkflowError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<LiveRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<number | null>(null);
  const localUrlsRef = useRef<Set<string>>(new Set());
  const progressRef = useRef(progress);
  const autoSubmittedRef = useRef(false);
  const keyCounterRef = useRef(0);

  useEffect(() => { progressRef.current = progress; }, [progress]);

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
        }
      })
      .catch((error) => { if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải nội dung bài tập.'); })
      .finally(() => { if (active) setLoading(false); });

    const localUrls = localUrlsRef.current;
    return () => {
      active = false;
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
      if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
      localUrls.forEach((url) => URL.revokeObjectURL(url));
      localUrls.clear();
    };
  }, [assignmentId]);

  const phase: 'intro' | 'working' | 'submitted' = !attempt ? 'intro' : attempt.status === 'in_progress' ? 'working' : 'submitted';

  // Đồng hồ: chạy khi đang làm bài (đếm ngược thời gian thi và thời gian của từng lần ghi).
  useEffect(() => {
    if (phase !== 'working') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const secondsLeft = phase === 'working' && attempt?.deadlineAt
    ? Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - now) / 1000))
    : null;
  const elapsedSeconds = phase === 'working' && attempt?.startedAt
    ? Math.max(0, Math.floor((now - new Date(attempt.startedAt).getTime()) / 1000))
    : 0;

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
      setNow(Date.now());
      setAttempt({ id: data.attempt_id, status: data.status, deadlineAt: data.deadline_at, startedAt: data.started_at });
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'Không thể bắt đầu làm bài.');
    } finally { setStarting(false); }
  }

  // ----- Ghi âm -----
  async function startRecording(question: AssignmentQuestion) {
    setWorkflowError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setWorkflowError('Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome/Edge/Firefox mới qua HTTPS hoặc localhost.');
      return;
    }
    try {
      const stream = await openMicrophone();
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const startedAt = currentTimeMs();
      chunksRef.current = [];

      const Recognition = getSpeechRecognition();
      let liveTranscript = '';
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';
        recognition.onresult = (event) => {
          liveTranscript = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
          setRecording((current) => current ? { ...current, liveTranscript } : current);
        };
        recognition.onerror = () => undefined;
        recognitionRef.current = recognition;
        try { recognition.start(); } catch { recognitionRef.current = null; }
      }

      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `answer-${question.id}.${extension}`, { type: blob.type });
        const durationSeconds = Math.min(7200, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        void uploadVersion(question, file, durationSeconds, liveTranscript);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording({ questionId: question.id, startedAt, liveTranscript: '', liveSupported: Boolean(Recognition) });
      // Tự dừng khi hết thời gian cho phép của câu hỏi.
      autoStopRef.current = window.setTimeout(stopRecording, question.time_limit_seconds * 1000);
    } catch (error) {
      setWorkflowError(microphoneErrorMessage(error));
    }
  }

  function stopRecording() {
    if (autoStopRef.current) { window.clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(null);
  }

  // ----- Tải phiên bản lên, rồi nhận dạng giọng nói -----
  async function uploadVersion(question: AssignmentQuestion, file: File, durationSeconds?: number, liveTranscript = '') {
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
      const { data } = await oralcheckFetch<{ data: { id: string; assignment_submission_id: string } }>(
        `/api/assignments/${assignmentId}/answers`, { method: 'POST', body: form },
      );
      // Server tự đặt bản mới nhất làm bản nộp; sinh viên có thể chọn lại bản cũ.
      updateQuestion(question.id, (current) => ({
        ...current,
        finalKey: key,
        versions: current.versions.map((version) => version.key === key ? { ...version, id: data.id, status: 'uploaded' } : version),
      }));
      void transcribeVersion(question.id, key, data.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải câu trả lời lên.';
      updateVersion(question.id, key, { status: 'failed', error: message });
      setWorkflowError(message);
    }
  }

  async function transcribeVersion(questionId: string, key: string, submissionId: string) {
    updateVersion(questionId, key, { status: 'transcribing', error: undefined });
    try {
      const { data } = await oralcheckFetch<{ data: { transcript: string } }>(`/api/submissions/${submissionId}/transcribe`, { method: 'POST' });
      updateQuestion(questionId, (current) => ({
        ...current,
        versions: current.versions.map((version) => version.key === key ? {
          ...version,
          status: 'transcribed',
          transcript: version.transcriptEdited ? version.transcript : data.transcript,
          originalTranscript: data.transcript,
        } : version),
      }));
    } catch (error) {
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
  async function gradeQuestion(questionId: string, version: AnswerVersion | undefined) {
    if (!version?.id || !version.transcript?.trim()) return;
    setGrade(questionId, { status: 'grading' });
    try {
      const { data } = await oralcheckFetch<{ data: { suggested_score: number; feedback_summary: string; criteria: Criterion[]; needs_teacher_review: boolean; reference_answer: string | null } }>(
        `/api/submissions/${version.id}/grade`,
        { method: 'POST', body: JSON.stringify({ transcript: version.transcript, is_edited: version.transcript !== version.originalTranscript }) },
      );
      setGrade(questionId, {
        status: 'graded',
        score: Number(data.suggested_score),
        feedback: data.feedback_summary,
        criteria: data.criteria,
        needsTeacherReview: data.needs_teacher_review,
        referenceAnswer: data.reference_answer ?? undefined,
      });
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
      await oralcheckFetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST', body: JSON.stringify({ assignment_submission_id: attempt.id }),
      });
      autoSubmittedRef.current = true;
      setAttempt((current) => current ? { ...current, status: 'submitted' } : current);
      setWorkflowError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const snapshot = progressRef.current;
      await Promise.all(assignment.questions.map((question) => gradeQuestion(question.id, finalVersionOf(snapshot[question.id]))));
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
            <div className="sticky top-0 z-20 -mx-4 mt-4 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
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
                    onRecord={() => void startRecording(question)}
                    onStop={stopRecording}
                    onUploadFile={(file) => void uploadVersion(question, file)}
                    onSelect={(version) => void selectVersion(question.id, version)}
                    onEditTranscript={(version, text) => updateVersion(question.id, version.key, { transcript: text, transcriptEdited: true })}
                    onTranscribe={(version) => version.id && void transcribeVersion(question.id, version.key, version.id)}
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
