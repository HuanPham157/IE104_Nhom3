'use client';

import { useEffect, useState } from 'react';
import { oralcheckFetch } from '@/lib/oralcheck-client';

export type RetakeStatus = {
  max_attempts: number;
  attempts_used: number;
  current_attempt_no: number;
  can_retake: boolean;
  reason: 'not_started' | 'in_progress' | 'max_reached' | 'closed' | 'awaiting_score' | null;
  best_attempt_no: number | null;
  best_score: number | null;
};

const REASON_TEXT: Record<string, string> = {
  awaiting_score: 'Bạn được làm lại sau khi AI chấm xong lượt này hoặc giảng viên công bố điểm.',
  max_reached: 'Bạn đã dùng hết số lần làm bài này.',
  closed: 'Bài đã hết hạn nộp nên không làm lại được nữa.',
};

/**
 * Làm lại cả bài (migration 009): lượt hiện tại / tối đa, điểm chính thức (lượt cao nhất, khi đã công bố)
 * và nút làm lại. `refreshKey` đổi khi AI chấm xong thêm câu → hỏi lại máy chủ xem đã được làm lại chưa.
 */
export default function RetakePanel({ assignmentId, initialStatus, refreshKey }: {
  assignmentId: string;
  initialStatus: RetakeStatus | null | undefined;
  refreshKey: number;
}) {
  const [status, setStatus] = useState(initialStatus ?? null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!refreshKey) return;
    let active = true;
    oralcheckFetch<{ data: { retake?: RetakeStatus | null } }>(`/api/assignments/${assignmentId}`)
      .then(({ data }) => { if (active && data.retake) setStatus(data.retake); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [assignmentId, refreshKey]);

  if (!status || status.max_attempts <= 1) return null;

  async function startRetake() {
    setStarting(true);
    setError('');
    try {
      await oralcheckFetch(`/api/assignments/${assignmentId}/retake`, { method: 'POST' });
      // Nạp lại trang để vào lượt mới với đồng hồ và trạng thái sạch.
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể bắt đầu làm lại.');
      setStarting(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Làm lại bài</h2>
          <p className="mt-1 text-xs text-gray-600">
            Đã làm {status.attempts_used}/{status.max_attempts} lần · đang xem lượt {status.current_attempt_no}. Điểm chính thức là lượt cao nhất được giảng viên duyệt.
          </p>
          {status.best_score !== null && (
            <p className="mt-1 text-xs font-semibold text-emerald-800">Điểm chính thức hiện tại: {status.best_score} (lượt {status.best_attempt_no})</p>
          )}
        </div>
        {status.can_retake ? (
          <button type="button" onClick={() => void startRetake()} disabled={starting} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {starting ? 'Đang bắt đầu…' : `Làm lại bài (lần ${status.attempts_used + 1})`}
          </button>
        ) : status.reason && REASON_TEXT[status.reason] ? (
          <p className="max-w-xs text-xs text-gray-600">{REASON_TEXT[status.reason]}</p>
        ) : null}
      </div>
      {status.can_retake && <p className="mt-2 text-[11px] text-gray-500">Lượt mới có đồng hồ riêng và làm lại tất cả các câu; lượt cũ vẫn được giữ.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
