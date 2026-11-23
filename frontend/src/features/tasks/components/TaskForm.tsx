'use client';

import { useState, type FormEvent } from 'react';
import { TASK_NOTES_MAX, TASK_TITLE_MAX, localDate, type TaskPriority } from '@/lib/personal-tasks';

export type TaskDraft = { title: string; due_date: string | null; priority: TaskPriority; notes: string };

const inputClass = 'h-10 rounded-lg border border-gray-200 bg-white px-3 text-[12px] outline-none focus:border-gray-900 disabled:bg-gray-100';

/** Ô thêm việc: chỉ cần tên; "Thêm chi tiết" mở hạn chót, ưu tiên và ghi chú. */
export default function TaskForm({ onAdd, disabled, today }: {
  onAdd: (draft: TaskDraft) => Promise<boolean>;
  disabled: boolean;
  /** Ngày hôm nay (YYYY-MM-DD) để gợi ý nhanh hạn chót. */
  today: string;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');

  const [year, month, day] = today.split('-').map(Number);
  const base = new Date(year, month - 1, day);
  const quickDates = [
    { label: 'Hôm nay', value: today },
    { label: 'Ngày mai', value: localDate(base, 1) },
    { label: 'Tuần sau', value: localDate(base, 7) },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 1 || trimmed.length > TASK_TITLE_MAX) {
      setError(`Tên công việc phải dài từ 1–${TASK_TITLE_MAX} ký tự.`);
      return;
    }
    setError('');
    const added = await onAdd({ title: trimmed, due_date: dueDate || null, priority, notes: notes.trim() });
    if (added) {
      setTitle('');
      setDueDate('');
      setPriority('normal');
      setNotes('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <label htmlFor="new-task-input" className="mb-2 block text-[12px] font-semibold">Thêm công việc cá nhân</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="new-task-input"
          type="text"
          value={title}
          maxLength={TASK_TITLE_MAX}
          disabled={disabled}
          onChange={(event) => { setTitle(event.target.value); if (error) setError(''); }}
          placeholder="Nhập tên câu hỏi hoặc việc cần làm… (ví dụ: Ôn chương 3 trước buổi vấn đáp)"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button type="submit" aria-label="+ Thêm công việc" disabled={disabled} className="h-10 shrink-0 rounded-lg bg-gray-900 px-4 text-[12px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
          + Thêm công việc
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[11px] text-red-600">{error}</p>}

      <button type="button" aria-expanded={showDetails} onClick={() => setShowDetails((value) => !value)} className="mt-2 text-[11px] font-semibold text-indigo-700 hover:underline">
        {showDetails ? 'Ẩn chi tiết' : 'Thêm chi tiết: hạn chót, ưu tiên, ghi chú'}
      </button>
      {showDetails && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_auto_1fr]">
          <div className="space-y-1.5">
            <label htmlFor="new-task-due" className="block text-[11px] font-semibold text-gray-700">Hạn chót</label>
            <input id="new-task-due" type="date" value={dueDate} disabled={disabled} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
            <div className="flex flex-wrap gap-1">
              {quickDates.map((item) => (
                <button key={item.label} type="button" disabled={disabled} onClick={() => setDueDate(item.value)} className={`rounded-full border px-2 py-0.5 text-[10px] ${dueDate === item.value ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {item.label}
                </button>
              ))}
              {dueDate && <button type="button" onClick={() => setDueDate('')} className="rounded-full px-2 py-0.5 text-[10px] text-gray-500 hover:underline">Bỏ hạn</button>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-task-priority" className="block text-[11px] font-semibold text-gray-700">Mức ưu tiên</label>
            <select id="new-task-priority" value={priority} disabled={disabled} onChange={(event) => setPriority(event.target.value as TaskPriority)} className={inputClass}>
              <option value="high">Cao</option>
              <option value="normal">Bình thường</option>
              <option value="low">Thấp</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-task-notes" className="block text-[11px] font-semibold text-gray-700">Ghi chú</label>
            <textarea id="new-task-notes" rows={2} value={notes} maxLength={TASK_NOTES_MAX} disabled={disabled} onChange={(event) => setNotes(event.target.value)} placeholder="Tài liệu cần đọc, ý chính cần nhớ…" className="w-full rounded-lg border border-gray-200 p-2.5 text-[12px] outline-none focus:border-gray-900 disabled:bg-gray-100" />
          </div>
        </div>
      )}
    </form>
  );
}
