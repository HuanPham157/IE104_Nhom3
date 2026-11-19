'use client';

import { useState } from 'react';
import {
  PRIORITY_LABEL,
  TASK_NOTES_MAX,
  TASK_TITLE_MAX,
  dueLabel,
  type PersonalTask,
  type TaskPriority,
} from '@/lib/personal-tasks';
import type { TaskDraft } from '@/components/TaskForm';

const inputClass = 'h-9 rounded-lg border border-[#dedfe2] bg-white px-2.5 text-[12px] outline-none focus:border-[#151617] disabled:bg-gray-100';

/** Một việc cá nhân: đánh dấu xong, xem ghi chú, sửa trực tiếp, xóa. */
export default function TaskItem({ task, today, busy, onToggle, onSave, onDelete }: {
  task: PersonalTask;
  today: string;
  busy: boolean;
  onToggle: (task: PersonalTask) => void;
  onSave: (task: PersonalTask, draft: TaskDraft) => Promise<string | null>;
  onDelete: (task: PersonalTask) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>({ title: task.title, due_date: task.due_date, priority: task.priority, notes: task.notes ?? '' });
  const [error, setError] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const due = dueLabel(task, today);
  const priority = PRIORITY_LABEL[task.priority];
  const createdAt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(task.created_at));

  function startEditing() {
    setDraft({ title: task.title, due_date: task.due_date, priority: task.priority, notes: task.notes ?? '' });
    setError('');
    setEditing(true);
  }

  async function save() {
    const title = draft.title.trim();
    if (title.length < 1 || title.length > TASK_TITLE_MAX) {
      setError(`Tên công việc phải dài từ 1–${TASK_TITLE_MAX} ký tự.`);
      return;
    }
    const failure = await onSave(task, { ...draft, title, notes: draft.notes.trim() });
    if (failure) setError(failure);
    else setEditing(false);
  }

  return (
    <article data-testid="task-item" className={`rounded-xl border bg-white p-3.5 transition ${task.is_done ? 'border-[#ececec] opacity-80' : 'border-[#e2e2e2]'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.is_done}
          disabled={busy || editing}
          onChange={() => onToggle(task)}
          aria-label={`Đánh dấu hoàn thành ${task.title}`}
          className="mt-1 h-4 w-4 shrink-0 accent-[#151617]"
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <label className="sr-only" htmlFor={`edit-text-${task.id}`}>Sửa tiêu đề công việc</label>
              <textarea
                id={`edit-text-${task.id}`}
                rows={2}
                maxLength={TASK_TITLE_MAX}
                value={draft.title}
                disabled={busy}
                onChange={(event) => { setDraft((current) => ({ ...current, title: event.target.value })); if (error) setError(''); }}
                className="w-full rounded-lg border border-[#dedfe2] p-2.5 text-[12px] outline-none focus:border-[#151617]"
              />
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  Hạn chót
                  <input type="date" value={draft.due_date ?? ''} disabled={busy} onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value || null }))} className={inputClass} />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  Ưu tiên
                  <select value={draft.priority} disabled={busy} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className={inputClass}>
                    <option value="high">Cao</option>
                    <option value="normal">Bình thường</option>
                    <option value="low">Thấp</option>
                  </select>
                </label>
              </div>
              <label className="sr-only" htmlFor={`edit-notes-${task.id}`}>Ghi chú</label>
              <textarea
                id={`edit-notes-${task.id}`}
                rows={2}
                maxLength={TASK_NOTES_MAX}
                value={draft.notes}
                disabled={busy}
                placeholder="Ghi chú (không bắt buộc)"
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-lg border border-[#dedfe2] p-2.5 text-[12px] outline-none focus:border-[#151617]"
              />
              {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setEditing(false); setError(''); }} disabled={busy} className="h-8 rounded-lg border border-[#dedfe2] px-3 text-[11px]">Hủy</button>
                <button type="button" onClick={() => void save()} disabled={busy} className="h-8 rounded-lg bg-[#151617] px-3 text-[11px] font-semibold text-white disabled:opacity-50">
                  {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className={`break-words text-[13px] font-semibold ${task.is_done ? 'text-[#888] line-through' : 'text-[#202124]'}`}>{task.title}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                {due && <span className={`rounded-full border px-2 py-0.5 font-semibold ${due.className}`}>{due.text}</span>}
                {task.priority !== 'normal' && <span className={`rounded-full border px-2 py-0.5 font-semibold ${priority.className}`}>{priority.text}</span>}
                {task.notes && (
                  <button type="button" onClick={() => setShowNotes((value) => !value)} aria-expanded={showNotes} className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-600 hover:bg-gray-50">
                    {showNotes ? 'Ẩn ghi chú' : 'Ghi chú'}
                  </button>
                )}
                <span className="text-[#888]">
                  {task.is_done && task.completed_at
                    ? `Hoàn thành ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(task.completed_at))}`
                    : `Tạo ngày ${createdAt}`}
                </span>
              </div>
              {task.notes && showNotes && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#f7f7f7] p-2.5 text-[11px] leading-relaxed text-[#555]">{task.notes}</p>}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={startEditing} disabled={busy} aria-label={`Sửa ${task.title}`} className="h-8 rounded-lg px-2.5 text-[11px] text-[#555] hover:bg-[#f2f2f2] disabled:opacity-40">Sửa</button>
            <button type="button" onClick={() => onDelete(task)} disabled={busy} aria-label={`Xóa ${task.title}`} className="h-8 rounded-lg px-2.5 text-[11px] text-[#777] hover:bg-red-50 hover:text-red-700 disabled:opacity-40">Xóa</button>
          </div>
        )}
      </div>
    </article>
  );
}
