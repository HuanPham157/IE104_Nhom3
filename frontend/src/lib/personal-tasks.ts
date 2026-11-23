import type { PersonalTask, TaskPriority } from '@shared/personal-tasks';

/** Việc cá nhân của sinh viên: kiểu dữ liệu và giới hạn dùng chung ở shared/personal-tasks.ts; file này chỉ chứa phần hiển thị. */
export type { PersonalTask, TaskPriority } from '@shared/personal-tasks';
export { TASK_NOTES_MAX, TASK_TITLE_MAX } from '@shared/personal-tasks';

// ---------- Hiển thị (dùng ở client) ----------

export const PRIORITY_LABEL: Record<TaskPriority, { text: string; className: string; rank: number }> = {
  high: { text: 'Ưu tiên cao', className: 'border-red-200 bg-red-50 text-red-700', rank: 0 },
  normal: { text: 'Bình thường', className: 'border-gray-200 bg-gray-50 text-gray-600', rank: 1 },
  low: { text: 'Ưu tiên thấp', className: 'border-sky-200 bg-sky-50 text-sky-700', rank: 2 },
};

/** Ngày theo giờ máy dạng YYYY-MM-DD (input type="date" dùng giờ địa phương). */
export function localDate(date: Date, addDays = 0): string {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() + addDays);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
}

export type DueState = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export function dueState(task: Pick<PersonalTask, 'due_date' | 'is_done'>, today: string): DueState {
  if (!task.due_date) return 'none';
  if (task.due_date < today) return task.is_done ? 'later' : 'overdue';
  if (task.due_date === today) return 'today';
  const [year, month, day] = today.split('-').map(Number);
  const base = new Date(year, month - 1, day);
  if (task.due_date === localDate(base, 1)) return 'tomorrow';
  if (task.due_date <= localDate(base, 7)) return 'week';
  return 'later';
}

export function dueLabel(task: Pick<PersonalTask, 'due_date' | 'is_done'>, today: string): { text: string; className: string } | null {
  if (!task.due_date) return null;
  const [year, month, day] = task.due_date.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(year, month - 1, day));
  const state = dueState(task, today);
  if (task.is_done) return { text: `Hạn ${formatted}`, className: 'border-gray-200 bg-gray-50 text-gray-500' };
  if (state === 'overdue') return { text: `Quá hạn · ${formatted}`, className: 'border-red-300 bg-red-50 text-red-700' };
  if (state === 'today') return { text: 'Hạn hôm nay', className: 'border-amber-300 bg-amber-50 text-amber-800' };
  if (state === 'tomorrow') return { text: 'Hạn ngày mai', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { text: `Hạn ${formatted}`, className: 'border-gray-200 bg-white text-gray-600' };
}
