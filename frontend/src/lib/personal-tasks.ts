import { z } from 'zod';

/** Việc cá nhân của sinh viên (bảng public.tasks, cột mở rộng ở migration 008). */
export type TaskPriority = 'low' | 'normal' | 'high';
export interface PersonalTask {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string;
  notes: string | null;
  due_date: string | null; // YYYY-MM-DD
  priority: TaskPriority;
  completed_at: string | null;
}

export const TASK_FIELDS = 'id,title,is_done,created_at,notes,due_date,priority,completed_at';
// Cột của migration 000 — dùng khi máy chủ chưa chạy migration 008.
export const LEGACY_TASK_FIELDS = 'id,title,is_done,created_at';
export const MISSING_COLUMN = '42703';

export const TASK_TITLE_MAX = 120;
export const TASK_NOTES_MAX = 1000;

const dueDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(value)));
const taskFields = {
  title: z.string().trim().min(1).max(TASK_TITLE_MAX),
  // Chuỗi rỗng = xóa ghi chú (null); không gửi = giữ nguyên.
  notes: z.string().trim().max(TASK_NOTES_MAX).nullable().optional().transform((value) => (value === undefined ? undefined : value || null)),
  due_date: dueDate.nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
};

export const createTaskSchema = z.object(taskFields).strict();
export const updateTaskSchema = z
  .object({ ...taskFields, title: taskFields.title.optional(), is_done: z.boolean().optional() })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'Cần ít nhất một trường để cập nhật');

/** Bỏ các trường chưa gửi để không ghi đè null lên dữ liệu cũ. */
export const definedOnly = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;

/** Chuẩn hóa dòng cũ (thiếu cột của migration 008) về cùng kiểu. */
export const withTaskDefaults = (row: Partial<PersonalTask> & Pick<PersonalTask, 'id' | 'title' | 'is_done' | 'created_at'>): PersonalTask => ({
  notes: null, due_date: null, priority: 'normal', completed_at: null, ...row,
});

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
