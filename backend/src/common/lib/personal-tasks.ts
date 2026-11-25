import { z } from 'zod';

import type { PersonalTask } from '../../../../shared/personal-tasks';
import { TASK_NOTES_MAX, TASK_TITLE_MAX } from '../../../../shared/personal-tasks';

/** Phần phía server của việc cá nhân (cột truy vấn, schema kiểm tra). Kiểu dữ liệu và giới hạn ở shared/personal-tasks.ts. */
export const TASK_FIELDS = 'id,title,is_done,created_at,notes,due_date,priority,completed_at';
// Cột tối thiểu — dùng khi database chưa có các cột mở rộng (ghi chú, hạn chót, ưu tiên).
export const LEGACY_TASK_FIELDS = 'id,title,is_done,created_at';
export const MISSING_COLUMN = '42703';

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

/** Chuẩn hóa dòng thiếu cột mở rộng về cùng kiểu. */
export const withTaskDefaults = (row: Partial<PersonalTask> & Pick<PersonalTask, 'id' | 'title' | 'is_done' | 'created_at'>): PersonalTask => ({
  notes: null, due_date: null, priority: 'normal', completed_at: null, ...row,
});
