import Link from 'next/link';
import {
  assignmentStatusLabel,
  formatDeadline,
  isAssignmentSubmitted,
  timeLeftLabel,
  type StudentAssignmentItem,
} from '@/lib/student-agenda';

/** Bài tập trên lớp hiển thị chung trong danh sách việc — chỉ xem, bấm để vào làm/xem bài. */
export default function AssignmentAgendaItem({ item, nowMs }: { item: StudentAssignmentItem; nowMs: number }) {
  const status = assignmentStatusLabel(item);
  const left = timeLeftLabel(item, nowMs);
  const submitted = isAssignmentSubmitted(item);
  const urgent = Boolean(left) && !submitted && item.ends_at !== null && new Date(item.ends_at).getTime() - nowMs < 24 * 3_600_000;

  return (
    <article data-testid="assignment-agenda-item" className={`rounded-xl border bg-white p-3.5 ${urgent ? 'border-red-200' : 'border-indigo-100'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-[11px] font-bold text-indigo-700">BT</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Bài tập trên lớp · {item.class_code}</p>
          <h3 className={`mt-0.5 break-words text-[13px] font-semibold ${submitted ? 'text-gray-400' : 'text-gray-900'}`}>{item.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.className}`}>{status.text}</span>
            {item.ends_at
              ? <span className={`rounded-full border px-2 py-0.5 font-semibold ${urgent ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'}`}>Hạn {formatDeadline(item.ends_at)}{left ? ` · ${left}` : ''}</span>
              : <span className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-600">Không đặt hạn</span>}
            {item.duration_minutes ? <span className="text-gray-400">Làm trong {item.duration_minutes} phút</span> : null}
            <span className="text-gray-400">{item.class_name}</span>
          </div>
        </div>
        <Link href={`/student/assignments/${item.id}`} className={`h-8 shrink-0 rounded-lg px-3 text-[11px] font-semibold leading-8 ${submitted ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
          {submitted ? 'Xem bài' : item.attempt_status === 'in_progress' ? 'Làm tiếp →' : 'Làm bài →'}
        </Link>
      </div>
    </article>
  );
}
