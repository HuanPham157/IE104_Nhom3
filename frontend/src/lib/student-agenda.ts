import { localDate } from '@/lib/personal-tasks';
import type { StudentAssignmentItem } from '@shared/student-agenda';

export type { StudentAssignmentItem } from '@shared/student-agenda';

export const isAssignmentSubmitted = (item: StudentAssignmentItem) =>
  item.attempt_status === 'submitted' || item.attempt_status === 'processing' || item.attempt_status === 'graded';

/** Đang trong thời gian được giao: đã mở và chưa quá hạn. */
export const isAssignmentOpen = (item: StudentAssignmentItem, nowMs: number) =>
  (!item.starts_at || new Date(item.starts_at).getTime() <= nowMs) && (!item.ends_at || new Date(item.ends_at).getTime() >= nowMs);

/** Ngày hạn nộp theo giờ máy (YYYY-MM-DD) để xếp vào lịch và nhóm hạn chót. */
export const assignmentDueDate = (item: StudentAssignmentItem) => (item.ends_at ? localDate(new Date(item.ends_at)) : null);

export function assignmentStatusLabel(item: StudentAssignmentItem): { text: string; className: string } {
  if (item.results_published && isAssignmentSubmitted(item)) return { text: 'Đã có điểm', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
  if (isAssignmentSubmitted(item)) return { text: 'Đã nộp', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (item.attempt_status === 'in_progress') return { text: 'Đang làm dở', className: 'border-sky-200 bg-sky-50 text-sky-800' };
  return { text: 'Chưa làm', className: 'border-gray-200 bg-white text-gray-600' };
}

/** "còn 3 giờ", "còn 2 ngày" — chỉ khi chưa nộp và hạn trong 7 ngày. */
export function timeLeftLabel(item: StudentAssignmentItem, nowMs: number): string | null {
  if (!item.ends_at || isAssignmentSubmitted(item)) return null;
  const minutes = Math.floor((new Date(item.ends_at).getTime() - nowMs) / 60_000);
  if (minutes < 0 || minutes > 7 * 24 * 60) return null;
  if (minutes < 60) return `còn ${Math.max(1, minutes)} phút`;
  if (minutes < 48 * 60) return `còn ${Math.floor(minutes / 60)} giờ`;
  return `còn ${Math.floor(minutes / 1440)} ngày`;
}

export const formatDeadline = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(iso));
