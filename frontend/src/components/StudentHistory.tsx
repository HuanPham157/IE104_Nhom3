'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StudentPageShell from '@/components/StudentPageShell';
import AnswerAnalysisPanel from '@/components/AnswerAnalysisPanel';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import AudioPlayer from '@/components/AudioPlayer';
import { assessmentLabel } from '@/lib/assessment';

type Criterion = { criterion_id: string; awarded_points: number; assessment: string; evidence_excerpt: string | null; explanation: string | null };

type HistoryAnswer = {
  question: { id: string; content: string; position: number; max_score: number };
  answer: null | {
    id: string;
    status: string;
    submitted_at: string;
    audio_duration_seconds: number | null;
    audio_url: string | null;
    transcript: string | null;
    reference_answer: string | null;
    evaluation: null | { score: number; feedback: string; needs_teacher_review: boolean; criteria: Criterion[] };
    grade_review: null | { final_score: number; reviewer_feedback: string | null; reviewed_at: string };
  };
};

type HistoryAttempt = {
  id: string;
  status: 'in_progress' | 'submitted' | 'processing' | 'graded';
  started_at: string;
  submitted_at: string | null;
  results_published: boolean;
  total_score: number | null;
  max_total: number;
  /** Làm lại nhiều lần: lượt thứ mấy / tổng số lượt, và lượt được tính điểm chính thức. */
  attempt_index?: number;
  attempt_count?: number;
  is_best?: boolean;
  assignment: { id: string; title: string; ends_at: string | null } | null;
  class: { id: string; class_name: string; class_code: string } | null;
  answers: HistoryAnswer[];
};

type Filter = 'all' | 'in_progress' | 'waiting' | 'published';


const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';

function attemptBadge(attempt: HistoryAttempt) {
  if (attempt.status === 'in_progress') return { text: 'Đang làm', className: 'bg-sky-50 text-sky-800' };
  if (attempt.results_published) return { text: 'Đã công bố điểm', className: 'bg-emerald-50 text-emerald-800' };
  return { text: 'Chờ giảng viên duyệt', className: 'bg-amber-50 text-amber-900' };
}

function matchesFilter(attempt: HistoryAttempt, filter: Filter) {
  if (filter === 'in_progress') return attempt.status === 'in_progress';
  if (filter === 'waiting') return attempt.status !== 'in_progress' && !attempt.results_published;
  if (filter === 'published') return attempt.results_published;
  return true;
}

function AnswerDetail({ item }: { item: HistoryAnswer }) {
  const { question, answer } = item;
  return (
    <li className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-gray-900">Câu {question.position}</h4>
        <span className="text-xs text-gray-500">Tối đa {question.max_score} điểm</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{question.content}</p>

      {!answer && <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">Chưa có câu trả lời cho câu hỏi này.</p>}
      {answer && <>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bản ghi âm</p>
          {answer.audio_url
            ? <AudioPlayer key={answer.audio_url} src={answer.audio_url} preload="none" label={`Phát lại câu trả lời câu ${question.position}`} className="mt-2" />
            : <p className="mt-2 text-xs text-gray-500">Không mở được tệp ghi âm.</p>}
          <p className="mt-1 text-xs text-gray-500">Nộp lúc {formatDateTime(answer.submitted_at)}{answer.audio_duration_seconds ? ` · ${answer.audio_duration_seconds} giây` : ''}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transcript</p>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-800">{answer.transcript || 'Chưa có transcript.'}</p>
        </div>

        {answer.evaluation && (
          <div className="mt-4 rounded-lg bg-indigo-50 p-4 text-sm">
            <p className="font-bold text-indigo-900">Điểm AI đề xuất: {answer.evaluation.score} / {question.max_score}</p>
            {answer.evaluation.feedback && <p className="mt-2 whitespace-pre-wrap text-gray-800">{answer.evaluation.feedback}</p>}
            {answer.evaluation.criteria.length > 0 && (
              <ul className="mt-3 space-y-2">
                {answer.evaluation.criteria.map((criterion) => {
                  const label = assessmentLabel(criterion.assessment);
                  return (
                    <li key={criterion.criterion_id} className="border-t border-indigo-100 pt-2">
                      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${label.className}`}>{label.text}</span><span className="text-xs font-semibold text-gray-700">{criterion.awarded_points} điểm</span></div>
                      {criterion.evidence_excerpt && <p className="mt-1 text-xs text-gray-700">Dẫn chứng: “{criterion.evidence_excerpt}”</p>}
                      {criterion.explanation && <p className="mt-1 text-xs text-gray-600">{criterion.explanation}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {answer.grade_review && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-bold text-emerald-900">Điểm chính thức của giảng viên: {answer.grade_review.final_score} / {question.max_score}</p>
            {answer.grade_review.reviewer_feedback && <p className="mt-2 whitespace-pre-wrap text-gray-800">{answer.grade_review.reviewer_feedback}</p>}
          </div>
        )}

        {answer.reference_answer && <>
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <p className="font-semibold text-gray-900">Lời giải tham khảo</p>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{answer.reference_answer}</p>
          </div>
          <AnswerAnalysisPanel transcript={answer.transcript} referenceAnswer={answer.reference_answer} audioDurationSeconds={answer.audio_duration_seconds} />
        </>}
      </>}
    </li>
  );
}

export default function StudentHistory() {
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: HistoryAttempt[] }>('/api/student/history')
      .then((result) => { if (active) setAttempts(result.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải lịch sử bài nộp.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const published = attempts.filter((attempt) => attempt.results_published && attempt.total_score !== null);
    const average = published.length
      ? published.reduce((sum, attempt) => sum + (Number(attempt.total_score) / (attempt.max_total || 10)) * 10, 0) / published.length
      : null;
    return {
      total: attempts.length,
      waiting: attempts.filter((attempt) => matchesFilter(attempt, 'waiting')).length,
      published: published.length,
      average,
    };
  }, [attempts]);

  const visible = attempts.filter((attempt) => matchesFilter(attempt, filter));
  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'in_progress', label: 'Đang làm' },
    { id: 'waiting', label: 'Chờ duyệt' },
    { id: 'published', label: 'Đã có điểm' },
  ];

  return (
    <StudentPageShell currentPage="history" breadcrumb="Lịch sử bài nộp">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Lịch sử bài nộp</h1>
        <p className="mt-1 text-sm text-gray-500">Nghe lại bản ghi âm, xem transcript, điểm AI và nhận xét của giảng viên.</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Lượt làm bài', value: stats.total },
            { label: 'Chờ duyệt', value: stats.waiting },
            { label: 'Đã có điểm', value: stats.published },
            { label: 'Điểm TB (thang 10)', value: stats.average === null ? '—' : stats.average.toFixed(2) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <dt className="text-xs text-gray-500">{item.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Lọc bài nộp">
          {filters.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === item.id ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>{item.label}</button>
          ))}
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Đang tải lịch sử bài nộp…</p>}
        {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            {attempts.length === 0 ? <>Bạn chưa nộp bài nào. <Link href="/student/classes" className="font-semibold text-gray-900 underline">Xem bài tập trong lớp</Link></> : 'Không có bài nộp ở mục này.'}
          </div>
        )}

        <ul className="mt-6 space-y-4">
          {visible.map((attempt) => {
            const badge = attemptBadge(attempt);
            const expanded = expandedId === attempt.id;
            const answered = attempt.answers.filter((item) => item.answer).length;
            return (
              <li key={attempt.id} className="rounded-2xl border border-gray-200 bg-white">
                <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : attempt.id)} className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{attempt.class ? `${attempt.class.class_name} · ${attempt.class.class_code}` : 'Lớp học'}</p>
                    <h2 className="mt-1 font-semibold text-gray-900">
                      {attempt.assignment?.title ?? 'Bài tập'}
                      {(attempt.attempt_count ?? 1) > 1 && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">Lần {attempt.attempt_index}/{attempt.attempt_count}</span>}
                      {attempt.is_best && (attempt.attempt_count ?? 1) > 1 && <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Điểm chính thức</span>}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">Nộp: {formatDateTime(attempt.submitted_at)} · {answered}/{attempt.answers.length} câu đã trả lời</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.text}</span>
                    {attempt.results_published && attempt.total_score !== null && <span className="text-lg font-bold tabular-nums text-gray-900">{attempt.total_score} / {attempt.max_total}</span>}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-gray-100 p-5">
                    {attempt.status === 'in_progress' && attempt.assignment && (
                      <Link href={`/student/assignments/${attempt.assignment.id}`} className="mb-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white">Tiếp tục làm bài →</Link>
                    )}
                    <ol className="space-y-3">{attempt.answers.map((item) => <AnswerDetail key={item.question.id} item={item} />)}</ol>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </StudentPageShell>
  );
}
