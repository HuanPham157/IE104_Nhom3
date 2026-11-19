'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import TeacherPageShell from '@/components/TeacherPageShell';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import AssignmentHeaderBox from '@/components/AssignmentHeaderBox';

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
  /** Làm lại nhiều lần: lượt thứ mấy / tổng số lượt của sinh viên, lượt nào được tính điểm chính thức. */
  attempt_index?: number;
  attempt_count?: number;
  is_best?: boolean;
  answers: Submission[];
};

export default function TeacherAssignmentSubmissions({ assignmentId }: { assignmentId: string }) {
  const [data, setData] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showReference, setShowReference] = useState<boolean | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  // Chỉ công bố điểm sau hạn nộp (migration 010); null = bài không đặt hạn.
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [savingAttempts, setSavingAttempts] = useState(false);
  const [updatingReference, setUpdatingReference] = useState(false);
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

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: { class_id?: string; show_reference_answer?: boolean; max_attempts?: number; ends_at?: string | null } }>(`/api/assignments/${assignmentId}`)
      .then(({ data: assignment }) => {
        if (!active) return;
        setShowReference(Boolean(assignment.show_reference_answer));
        setClassId(assignment.class_id ?? null);
        setMaxAttempts(assignment.max_attempts ?? 1);
        setEndsAt(assignment.ends_at ?? null);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [assignmentId]);

  async function changeMaxAttempts(value: number) {
    setSavingAttempts(true); setError(''); setNotice('');
    try {
      const { data: result } = await oralcheckFetch<{ data: { max_attempts: number } }>(
        `/api/assignments/${assignmentId}/max-attempts`,
        { method: 'PUT', body: JSON.stringify({ max_attempts: value }) },
      );
      setMaxAttempts(result.max_attempts);
      setNotice(result.max_attempts > 1
        ? `Sinh viên được làm tối đa ${result.max_attempts} lần (khi lượt trước đã có điểm và bài còn trong hạn nộp). Điểm chính thức là lượt cao nhất.`
        : 'Mỗi sinh viên chỉ được làm bài một lần.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đổi số lần làm.');
    } finally {
      setSavingAttempts(false);
    }
  }

  async function toggleReferenceAnswer(visible: boolean) {
    setUpdatingReference(true); setError(''); setNotice('');
    try {
      const { data: result } = await oralcheckFetch<{ data: { show_reference_answer: boolean } }>(
        `/api/assignments/${assignmentId}/reference-answer`,
        { method: 'PUT', body: JSON.stringify({ visible }) },
      );
      setShowReference(result.show_reference_answer);
      setNotice(result.show_reference_answer
        ? 'Sinh viên đã nộp bài giờ xem được đáp án tham khảo và so sánh với câu trả lời của mình.'
        : 'Đã ẩn đáp án tham khảo với sinh viên.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật hiển thị đáp án.');
    } finally {
      setUpdatingReference(false);
    }
  }

  const beforeDeadline = endsAt !== null && new Date(endsAt).getTime() > now;

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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href={classId ? `/teacher/classes/${classId}?tab=assignments` : '/teacher/classes'} className="text-gray-500 hover:text-black">← Bài tập của lớp</Link>
        <Link href={`/teacher/assignments/create?${classId ? `classId=${classId}&` : ''}assignmentId=${assignmentId}`} className="text-gray-500 hover:text-black">Xem / sửa đề</Link>
      </div>
      <div className="mt-4">
        <AssignmentHeaderBox assignmentId={assignmentId}>
          {!loading && <>
            <p className="text-xs text-gray-500">Bài nộp</p>
            <p className="text-2xl font-bold text-gray-900">{data.filter((attempt) => attempt.status !== 'in_progress').length}<span className="text-sm font-medium text-gray-500"> / {data.length} lượt</span></p>
            <p className="mt-1 text-xs text-gray-600">Đã duyệt xong: {data.filter((attempt) => attempt.status === 'graded').length}</p>
          </>}
        </AssignmentHeaderBox>
      </div>
      <h2 className="mt-6 text-lg font-bold">Bài nộp sinh viên</h2>
      <p className="mt-1 text-sm text-gray-500">Nghe audio, xem transcript và duyệt điểm AI theo từng câu.</p>
      {data.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={publishing || beforeDeadline} onClick={() => void publishResults()} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{publishing ? 'Đang công bố…' : 'Công bố kết quả đã duyệt'}</button>
        {beforeDeadline && endsAt && <p className="text-xs text-gray-600">Công bố được sau hạn nộp <strong>{new Date(endsAt).toLocaleString('vi-VN')}</strong> — trước đó sinh viên vẫn làm / làm lại. Bạn vẫn duyệt điểm từng bài được.</p>}
      </div>}
      {showReference !== null && <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={showReference} disabled={updatingReference} onChange={(event) => void toggleReferenceAnswer(event.target.checked)} className="h-4 w-4 accent-black" />
        Cho sinh viên xem đáp án tham khảo sau khi nộp bài
      </label>}
      {maxAttempts !== null && <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-700">
        Số lần làm tối đa
        <select value={maxAttempts} disabled={savingAttempts} onChange={(event) => void changeMaxAttempts(Number(event.target.value))} className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm">
          {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count === 1 ? '1 lần (không làm lại)' : `${count} lần`}</option>)}
        </select>
      </label>}
      {loading && <p className="mt-6 text-sm text-gray-500">Đang tải bài nộp…</p>}
      {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {!loading && !error && data.length === 0 && <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-gray-500">Chưa có sinh viên nộp bài.</p>}
      <div className="mt-6 space-y-4">{data.map((attempt) => <section key={attempt.id} className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{attempt.student_name ?? 'Sinh viên'}{(attempt.attempt_count ?? 1) > 1 && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">Lần {attempt.attempt_index}/{attempt.attempt_count}</span>}{attempt.is_best && (attempt.attempt_count ?? 1) > 1 && <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Điểm chính thức</span>}</h2><p className="mt-1 text-xs text-gray-500">Nộp: {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('vi-VN') : 'Chưa nộp'} · Trạng thái: {attempt.status}</p></div><strong className="text-sm">{attempt.total_score ?? '—'} điểm</strong></div>
        <div className="mt-4 divide-y divide-gray-100">{attempt.answers.map((answer, index) => <div key={answer.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">Câu trả lời {index + 1}</p><p className="mt-1 text-xs text-gray-500">{answer.status} · {new Date(answer.submitted_at).toLocaleString('vi-VN')}</p></div><Link href={`/teacher/evaluations/${assignmentId}/submissions/${answer.id}`} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50">Mở bài làm →</Link></div>)}</div>
      </section>)}</div>
    </main>
  </TeacherPageShell>;
}
