'use client';

import { oralcheckFetch } from '@/lib/oralcheck-client';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import TeacherPageShell from '@/components/layout/TeacherPageShell';
import AnswerAnalysisPanel from '@/components/answers/AnswerAnalysisPanel';
import { gradingSettled } from '@/lib/answer-status';
import { useAnswerWatcher } from '@/hooks/useAnswerWatcher';
import AudioPlayer from '@/components/ui/AudioPlayer';
import AssignmentHeaderBox from '@/features/grading/components/AssignmentHeaderBox';
import { assessmentLabel } from '@/lib/assessment';

type RubricItem = { id: string; criterion_text: string; max_points: number };
type ReviewData = {
  answer: { id: string; status: string; audio_duration_seconds: number | null; audio_mime_type?: string | null };
  attempt: { assignment_id: string; status: string };
  assignment: { title: string; results_published_at?: string | null };
  question: { content: string; reference_answer: string | null; position: number; max_score: number; rubric: RubricItem[] };
  student: { full_name: string } | null;
  audio_url: string;
  transcription: { transcript_text: string; engine_name: string; is_edited: boolean } | null;
  evaluation: null | { suggested_score: number; feedback_summary: string; needs_teacher_review: boolean; criteria: Array<{ criterion_id: string; awarded_points: number; assessment: string; evidence_excerpt: string | null; explanation: string | null }> };
  grade_review: null | { final_score: number; reviewer_feedback: string | null; score_modified: boolean; reviewed_at?: string };
};
type AnswerLink = { id: string; label: string };

const ANSWER_STATUS: Record<string, string> = {
  queued: 'Chờ AI chấm', processing: 'AI đang xử lý', ready: 'AI đã chấm', failed: 'AI chấm lỗi',
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export default function TeacherSubmissionReview({ assignmentId, submissionId }: { assignmentId: string; submissionId: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const { watch, isMounted } = useAnswerWatcher();
  const [score, setScore] = useState('');
  const [criterionPoints, setCriterionPoints] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [answerLinks, setAnswerLinks] = useState<AnswerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [transcriptMessage, setTranscriptMessage] = useState('');

  const applyData = useCallback((next: ReviewData) => {
    setData(next);
    const aiPoints = new Map(next.evaluation?.criteria.map((item) => [item.criterion_id, item.awarded_points]) ?? []);
    setCriterionPoints(Object.fromEntries(next.question.rubric.map((item) => [item.id, aiPoints.has(item.id) ? String(aiPoints.get(item.id)) : ''])));
    setScore(String(next.grade_review?.final_score ?? next.evaluation?.suggested_score ?? ''));
    setFeedback(next.grade_review?.reviewer_feedback ?? '');
  }, []);

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: ReviewData }>(`/api/submissions/${submissionId}`)
      .then((result) => { if (active) applyData(result.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được bài làm.'); })
      .finally(() => { if (active) setLoading(false); });
    // Danh sách câu trả lời của bài tập để chuyển nhanh câu trước/sau.
    oralcheckFetch<{ data: Array<{ student_name: string | null; attempt_index?: number; attempt_count?: number; answers: Array<{ id: string }> }> }>(`/api/assignments/${assignmentId}/submissions`)
      .then((result) => {
        if (!active) return;
        setAnswerLinks(result.data.flatMap((attempt) => attempt.answers.map((answer, index) => ({
          id: answer.id,
          label: `${attempt.student_name ?? 'Sinh viên'}${(attempt.attempt_count ?? 1) > 1 ? ` (lần ${attempt.attempt_index})` : ''} · câu ${index + 1}`,
        }))));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [assignmentId, submissionId, applyData]);

  /** Chỉ xin lại signed URL của audio — không nạp lại cả bài để không mất điểm/nhận xét đang nhập. */
  async function refreshAudioUrl(): Promise<string | null> {
    const result = await oralcheckFetch<{ data: ReviewData }>(`/api/submissions/${submissionId}`);
    return result.data.audio_url ?? null;
  }

  async function reload() {
    const result = await oralcheckFetch<{ data: ReviewData }>(`/api/submissions/${submissionId}`);
    applyData(result.data);
  }

  async function gradeWithAi() {
    setAiGrading(true); setError(''); setNotice('');
    try {
      // Backend chỉ đưa job vào hàng đợi; worker chấm xong thì trạng thái chuyển sang ready / failed.
      await oralcheckFetch(`/api/submissions/${submissionId}/ai-grade`, { method: 'POST' });
      setNotice('Đã gửi yêu cầu, AI đang chấm…');
      const result = await watch(submissionId, gradingSettled);
      await reload();
      if (result.status === 'failed') throw new Error(result.error_message ?? 'AI chấm lỗi.');
      setNotice('AI đã chấm xong. Kiểm tra lại điểm đề xuất rồi lưu điểm chính thức.');
    } catch (reason) {
      if (!isMounted()) return;
      setError(reason instanceof Error ? reason.message : 'Không thể chấm bằng AI.');
    } finally { if (isMounted()) setAiGrading(false); }
  }

  function startTranscriptEdit(initial?: string) {
    setTranscriptDraft(initial ?? data?.transcription?.transcript_text ?? '');
    setTranscriptMessage('');
    setEditingTranscript(true);
  }

  async function handleTranscriptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 500_000) {
      setTranscriptMessage('Tệp quá lớn (tối đa 500 KB).');
      return;
    }
    const text = (await file.text()).trim();
    if (!text) {
      setTranscriptMessage('Tệp không có nội dung.');
      return;
    }
    startTranscriptEdit(text);
  }

  async function saveTranscript() {
    if (!transcriptDraft.trim()) return;
    setSavingTranscript(true); setTranscriptMessage('');
    try {
      await oralcheckFetch(`/api/submissions/${submissionId}/transcript`, {
        method: 'POST',
        body: JSON.stringify({ transcript_text: transcriptDraft.trim() }),
      });
      await reload();
      setEditingTranscript(false);
      setTranscriptMessage('Đã lưu transcript. Bạn có thể chấm lại bằng AI với nội dung mới.');
    } catch (reason) {
      setTranscriptMessage(reason instanceof Error ? reason.message : 'Không thể lưu transcript.');
    } finally { setSavingTranscript(false); }
  }

  function setCriterion(id: string, value: string) {
    const next = { ...criterionPoints, [id]: value };
    setCriterionPoints(next);
    // Điểm câu = tổng điểm các tiêu chí đã nhập.
    const values = Object.values(next).filter((item) => item !== '').map(Number);
    if (values.length && values.every(Number.isFinite)) setScore(String(round2(values.reduce((sum, item) => sum + item, 0))));
  }

  const maxScore = data ? Number(data.question.max_score) : 0;
  const numericScore = Number(score);
  const scoreValid = score !== '' && Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= maxScore;
  const aiScore = data?.evaluation ? Number(data.evaluation.suggested_score) : null;
  const modified = aiScore !== null && scoreValid && Math.abs(numericScore - aiScore) > 0.001;
  const needsFeedback = modified && !feedback.trim();
  const submitted = data ? data.attempt.status !== 'in_progress' : false;
  const published = Boolean(data?.assignment.results_published_at);
  const currentIndex = answerLinks.findIndex((item) => item.id === submissionId);
  const previous = currentIndex > 0 ? answerLinks[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < answerLinks.length - 1 ? answerLinks[currentIndex + 1] : null;

  async function saveReview() {
    if (!data || !scoreValid || needsFeedback) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await oralcheckFetch(`/api/submissions/${submissionId}/review`, {
        method: 'POST',
        body: JSON.stringify({ final_score: round2(numericScore), reviewer_feedback: feedback.trim() || null, score_modified: modified }),
      });
      await reload();
      setNotice(next ? 'Đã lưu điểm. Có thể chuyển sang câu tiếp theo.' : 'Đã lưu điểm chính thức.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu điểm.');
    } finally { setSaving(false); }
  }

  const navLink = (item: AnswerLink | null, direction: 'prev' | 'next') => item
    ? <Link href={`/teacher/evaluations/${assignmentId}/submissions/${item.id}`} className="max-w-[45%] truncate rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">{direction === 'prev' ? `← ${item.label}` : `${item.label} →`}</Link>
    : <span />;

  return <TeacherPageShell currentPage="evaluations" breadcrumb="Duyệt bài làm">
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/teacher/evaluations/${assignmentId}`} className="text-sm text-gray-500 hover:text-black">← Danh sách bài nộp</Link>
        {answerLinks.length > 1 && <span className="text-xs text-gray-500">{currentIndex + 1}/{answerLinks.length} câu trả lời</span>}
      </div>
      <div className="mt-4">
        <AssignmentHeaderBox assignmentId={assignmentId}>
          {data && <>
            <p className="text-xs text-gray-500">Sinh viên</p>
            <p className="font-bold text-gray-900">{data.student?.full_name ?? 'Sinh viên'}</p>
            <p className="mt-1 text-xs text-gray-600">Câu {data.question.position} · tối đa {maxScore} điểm</p>
          </>}
        </AssignmentHeaderBox>
      </div>
      {loading && <p className="mt-6 text-sm text-gray-500">Đang tải bài làm…</p>}
      {error && !data && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {data && <>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-bold">Câu {data.question.position} <span className="text-base font-medium text-gray-500">/ {maxScore} điểm</span></h2>
          <div className="flex flex-wrap gap-2">
            {data.grade_review && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">✓ Đã duyệt: {data.grade_review.final_score}/{maxScore}</span>}
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{ANSWER_STATUS[data.answer.status] ?? data.answer.status}</span>
          </div>
        </div>

        <section className="mt-5 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Đề bài</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{data.question.content}</p>
          <AudioPlayer key={data.answer.id} src={data.audio_url} mimeType={data.answer.audio_mime_type} onRefresh={refreshAudioUrl} label="Bản ghi âm câu trả lời của sinh viên" className="mt-4" />
        </section>

        <section className="mt-4 rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Transcript</h2>
            <div className="flex flex-wrap items-center gap-2">
              {data.transcription && <span className="text-xs text-gray-500">{data.transcription.engine_name === 'lecturer-edit' ? 'Giảng viên đã chỉnh sửa' : `${data.transcription.engine_name}${data.transcription.is_edited ? ' · sinh viên đã chỉnh sửa' : ''}`}</span>}
              {submitted && !published && !editingTranscript && <>
                <button type="button" onClick={() => startTranscriptEdit()} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">{data.transcription ? 'Sửa transcript' : 'Nhập transcript'}</button>
                <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                  Tải tệp .txt
                  <input type="file" accept=".txt,text/plain" onChange={(event) => void handleTranscriptFile(event)} className="sr-only" />
                </label>
              </>}
            </div>
          </div>
          {editingTranscript ? (
            <div className="mt-3">
              <label htmlFor="transcript-editor" className="text-xs font-medium text-gray-600">Nội dung transcript (chỉnh theo audio để AI chấm chính xác hơn)</label>
              <textarea id="transcript-editor" value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} rows={8} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-sm leading-6 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>{transcriptDraft.trim().split(/\s+/).filter(Boolean).length} từ</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingTranscript(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="button" disabled={savingTranscript || !transcriptDraft.trim()} onClick={() => void saveTranscript()} className="rounded-lg bg-black px-4 py-1.5 font-semibold text-white disabled:opacity-50">{savingTranscript ? 'Đang lưu…' : 'Lưu transcript'}</button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{data.transcription?.transcript_text ?? 'Chưa có transcript — hãy nghe audio, nhập hoặc tải transcript lên để chấm.'}</p>
          )}
          {transcriptMessage && <p className="mt-2 text-xs text-brand-700">{transcriptMessage}</p>}
          {data.transcription && !editingTranscript && <AnswerAnalysisPanel transcript={data.transcription.transcript_text} referenceAnswer={data.question.reference_answer} audioDurationSeconds={data.answer.audio_duration_seconds} />}
          {data.question.reference_answer && <details className="mt-3 text-sm"><summary className="cursor-pointer text-xs font-semibold text-gray-600">Xem đáp án tham khảo</summary><p className="mt-2 whitespace-pre-wrap leading-6 text-gray-700">{data.question.reference_answer}</p></details>}
        </section>

        <section className="mt-4 rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Đánh giá AI <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">chỉ giảng viên xem</span></h2>
            <div className="flex flex-wrap items-center gap-2">
              {data.evaluation && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">Đề xuất {data.evaluation.suggested_score} / {maxScore}</span>}
              {data.evaluation && submitted && !published && data.transcription && ['queued', 'failed'].includes(data.answer.status) && (
                <button type="button" disabled={aiGrading} onClick={() => void gradeWithAi()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{aiGrading ? 'AI đang chấm…' : 'Chấm lại bằng AI'}</button>
              )}
            </div>
          </div>
          {!data.evaluation && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-500">AI chưa chấm câu trả lời này{data.answer.status === 'failed' ? ' (lần chấm trước bị lỗi)' : ''}. Bạn có thể yêu cầu AI chấm hoặc chấm thủ công bên dưới.</p>
              {submitted && !published && data.transcription && (
                <button type="button" disabled={aiGrading} onClick={() => void gradeWithAi()} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{aiGrading ? 'AI đang chấm…' : 'Chấm bằng AI'}</button>
              )}
            </div>
          )}
          {data.evaluation && <>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{data.evaluation.feedback_summary}</p>
            {data.evaluation.needs_teacher_review && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">AI đánh dấu cần giảng viên xem kỹ (transcript có thể chưa rõ hoặc AI không chắc chắn).</p>}
            <div className="mt-4 divide-y">{data.evaluation.criteria.map((criterion) => {
              const rubric = data.question.rubric.find((item) => item.id === criterion.criterion_id);
              const label = assessmentLabel(criterion.assessment);
              return <article key={criterion.criterion_id} className="py-3"><div className="flex justify-between gap-3 text-sm"><strong>{rubric?.criterion_text ?? 'Tiêu chí'}</strong><span>{criterion.awarded_points} / {rubric?.max_points}</span></div><p className="mt-1 text-xs text-gray-600"><span className={`mr-1 rounded-full px-2 py-0.5 font-semibold ${label.className}`}>{label.text}</span>{criterion.explanation}</p>{criterion.evidence_excerpt && <p className="mt-1 text-xs text-gray-700">Dẫn chứng: “{criterion.evidence_excerpt}”</p>}</article>;
            })}</div>
          </>}
        </section>

        <section className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
          <h2 className="font-semibold">Điểm chính thức của giảng viên</h2>
          {!submitted && <p className="mt-2 text-sm text-gray-600">Sinh viên chưa nộp bài, chưa thể chấm.</p>}
          {published && <p className="mt-2 text-sm text-gray-600">Kết quả bài tập đã công bố nên điểm không còn chỉnh sửa được.</p>}
          {submitted && !published && <>
            {data.question.rubric.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Chấm theo barem {data.evaluation ? '(điền sẵn theo AI)' : ''}</p>
                {data.question.rubric.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="flex-1">{item.criterion_text}</span>
                    <input type="number" min="0" max={item.max_points} step="0.25" value={criterionPoints[item.id] ?? ''} onChange={(event) => setCriterion(item.id, event.target.value)} className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm" aria-label={`Điểm tiêu chí ${item.criterion_text}`} />
                    <span className="w-12 text-xs text-gray-500">/ {item.max_points}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block text-xs font-medium">Điểm câu (tối đa {maxScore})
                <input type="number" min="0" max={maxScore} step="0.25" value={score} onChange={(event) => setScore(event.target.value)} className={`mt-1 block w-32 rounded-lg border bg-white px-3 py-2 text-sm ${score !== '' && !scoreValid ? 'border-red-400' : 'border-gray-300'}`} />
              </label>
              <div className="flex flex-wrap gap-2">
                {aiScore !== null && <button type="button" onClick={() => setScore(String(aiScore))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">Dùng điểm AI ({aiScore})</button>}
                <button type="button" onClick={() => setScore(String(maxScore))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">Tối đa</button>
                <button type="button" onClick={() => setScore('0')} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">0 điểm</button>
              </div>
            </div>
            {score !== '' && !scoreValid && <p className="mt-1 text-xs text-red-700">Điểm phải từ 0 đến {maxScore}.</p>}
            <label className="mt-4 block text-xs font-medium">Nhận xét cho sinh viên {modified ? '(bắt buộc vì điểm khác điểm AI)' : '(không bắt buộc)'}
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} className={`mt-1 block w-full rounded-lg border bg-white p-3 text-sm ${needsFeedback ? 'border-amber-400' : 'border-gray-300'}`} placeholder="Ý đúng, ý còn thiếu, lý do điều chỉnh điểm…" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
            <button type="button" disabled={saving || !scoreValid || needsFeedback} onClick={() => void saveReview()} className="mt-4 rounded-lg bg-black px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : data.grade_review ? 'Cập nhật điểm' : 'Lưu điểm'}</button>
          </>}
        </section>

        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Chuyển câu trả lời">{navLink(previous, 'prev')}{navLink(next, 'next')}</nav>
      </>}
    </main>
  </TeacherPageShell>;
}
