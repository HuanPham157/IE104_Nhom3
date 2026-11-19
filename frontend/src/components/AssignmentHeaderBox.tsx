'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { oralcheckFetch } from '@/lib/oralcheck-client';

type AssignmentInfo = {
  id: string;
  class_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number | null;
  status: string;
  results_published_at: string | null;
  questions?: Array<{ max_score: number }>;
};
type ClassInfo = { id: string; class_name: string; class_code: string };

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

/**
 * Khung đầu trang chấm bài: tên bài tập, lớp, thời gian mở/hạn nộp, thời lượng, số câu và trạng thái —
 * để giảng viên luôn biết đang chấm bài nào. `children` là thông tin riêng của trang (sinh viên, câu đang chấm…).
 */
export default function AssignmentHeaderBox({ assignmentId, children }: { assignmentId: string; children?: ReactNode }) {
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: AssignmentInfo }>(`/api/assignments/${assignmentId}`)
      .then(async ({ data }) => {
        if (!active) return;
        setAssignment(data);
        const { data: classes } = await oralcheckFetch<{ data: ClassInfo[] }>('/api/classes');
        if (active) setClassInfo(classes.find((item) => item.id === data.class_id) ?? null);
      })
      .catch(() => undefined); // khung tiêu đề không bắt buộc — trang vẫn chấm được
    return () => { active = false; };
  }, [assignmentId]);

  if (!assignment) {
    return <div aria-hidden="true" className="h-[118px] animate-pulse rounded-2xl border border-gray-200 bg-white" />;
  }

  const startMs = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
  const endMs = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
  const timeState = startMs && startMs > now
    ? { text: 'Chưa mở', className: 'bg-gray-100 text-gray-700' }
    : endMs && endMs < now
      ? { text: 'Đã hết hạn nộp', className: 'bg-gray-100 text-gray-700' }
      : { text: 'Đang mở', className: 'bg-sky-50 text-sky-800' };
  const questionCount = assignment.questions?.length ?? 0;
  const totalPoints = assignment.questions?.reduce((sum, question) => sum + Number(question.max_score), 0) ?? 0;

  return (
    <section aria-label="Bài tập đang chấm" className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
            Đang chấm{classInfo ? ` · Lớp ${classInfo.class_name} (${classInfo.class_code})` : ''}
          </p>
          <h1 className="mt-1 break-words text-xl font-bold text-gray-900 sm:text-2xl">{assignment.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className={`rounded-full px-2.5 py-0.5 ${timeState.className}`}>{timeState.text}</span>
            <span className={`rounded-full px-2.5 py-0.5 ${assignment.results_published_at ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {assignment.results_published_at ? `Đã công bố điểm ${new Date(assignment.results_published_at).toLocaleDateString('vi-VN')}` : 'Chưa công bố điểm'}
            </span>
          </div>
        </div>
        {children && <div className="text-right text-sm">{children}</div>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-indigo-100 pt-3 text-xs sm:grid-cols-4">
        <div><dt className="text-gray-500">Mở bài</dt><dd className="mt-0.5 font-semibold text-gray-900">{assignment.starts_at ? formatTime(assignment.starts_at) : 'Ngay khi công bố'}</dd></div>
        <div><dt className="text-gray-500">Hạn nộp</dt><dd className="mt-0.5 font-semibold text-gray-900">{assignment.ends_at ? formatTime(assignment.ends_at) : 'Không đặt hạn'}</dd></div>
        <div><dt className="text-gray-500">Thời lượng làm bài</dt><dd className="mt-0.5 font-semibold text-gray-900">{assignment.duration_minutes ? `${assignment.duration_minutes} phút` : '—'}</dd></div>
        <div><dt className="text-gray-500">Đề bài</dt><dd className="mt-0.5 font-semibold text-gray-900">{questionCount ? `${questionCount} câu · ${totalPoints} điểm` : '—'}</dd></div>
      </dl>
    </section>
  );
}
