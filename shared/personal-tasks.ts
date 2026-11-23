/** Việc cá nhân của sinh viên (bảng public.tasks) — kiểu dữ liệu và giới hạn dùng chung cho frontend và backend. */
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

export const TASK_TITLE_MAX = 120;
export const TASK_NOTES_MAX = 1000;
