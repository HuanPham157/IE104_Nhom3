'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import TeacherPageShell from '@/components/TeacherPageShell';
import { oralcheckFetch } from '@/lib/oralcheck-client';

type Submission = {
  id: string;
  question_id: string;
  status: string;
  submitted_at: string;
};
type Attempt = {
  id: string;
  student_id: string;
  student_name: string | null;
  status: string;
  submitted_at: string | null;
  total_score: number | null;
  answers: Submission[];
};

export default function TeacherAssignmentSubmissions({ assignmentId }: { assignmentId: string }) {
  const [data, setData] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [publishing, setPublishing] = useState(false);
  const loadSubmissions = useCallback(async () => {
    const result = await oralcheckFetch<{ data: Attempt[] }>(`/api/assignments/${assignmentId}/submissions`);
    return result.data;
  }, [assignmentId]);

  useEffect(() => {
    let active = true;
    loadSubmissions()
      .then((rows) => { if (active) setData(rows); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được bài nộp.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadSubmissions]);

  async function publishResults() {
    setPublishing(true); setError(''); setNotice('');
    try {
      const { data: result } = await oralcheckFetch<{ data: { notified?: number } }>(`/api/assignments/${assignmentId}/publish`, { method: 'POST' });
      setNotice(`Đã công bố điểm chính thức${result.notified ? ` và gửi thông báo cho ${result.notified} sinh viên` : ''}. Sinh viên xem được trong trang bài tập, Lịch sử bài nộp và Trang tổng quan.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa thể công bố kết quả.');
    } finally {
      setPublishing(false);
      // Lần công bố có thể vừa tự nộp các bài hết giờ → tải lại danh sách.
      loadSubmissions().then(setData).catch(() => undefined);
    }
  }

  return <TeacherPageShell currentPage="evaluations" breadcrumb="Bài nộp và đánh giá">
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/teacher/classes" className="text-sm text-gray-500 hover:text-black">← Lớp học</Link>
      <h1 className="mt-4 text-2xl font-bold">Bài nộp sinh viên</h1>
      <p className="mt-1 text-sm text-gray-500">Nghe audio, xem transcript và duyệt điểm AI theo từng câu.</p>
      {data.length > 0 && <button type="button" disabled={publishing} onClick={() => void publishResults()} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{publishing ? 'Đang công bố…' : 'Công bố kết quả đã duyệt'}</button>}
      {loading && <p className="mt-6 text-sm text-gray-500">Đang tải bài nộp…</p>}
      {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {!loading && !error && data.length === 0 && <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-gray-500">Chưa có sinh viên nộp bài.</p>}
      <div className="mt-6 space-y-4">{data.map((attempt) => <section key={attempt.id} className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{attempt.student_name ?? 'Sinh viên'}</h2><p className="mt-1 text-xs text-gray-500">Nộp: {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('vi-VN') : 'Chưa nộp'} · Trạng thái: {attempt.status}</p></div><strong className="text-sm">{attempt.total_score ?? '—'} điểm</strong></div>
        <div className="mt-4 divide-y divide-gray-100">{attempt.answers.map((answer, index) => <div key={answer.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">Câu trả lời {index + 1}</p><p className="mt-1 text-xs text-gray-500">{answer.status} · {new Date(answer.submitted_at).toLocaleString('vi-VN')}</p></div><Link href={`/teacher/evaluations/${assignmentId}/submissions/${answer.id}`} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50">Mở bài làm →</Link></div>)}</div>
      </section>)}</div>
    </main>
  </TeacherPageShell>;
}
