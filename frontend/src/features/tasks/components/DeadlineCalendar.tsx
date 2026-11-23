'use client';

import Link from 'next/link';
import { useState } from 'react';
import { localDate, type PersonalTask } from '@/lib/personal-tasks';
import {
  assignmentDueDate,
  assignmentStatusLabel,
  isAssignmentSubmitted,
  type StudentAssignmentItem,
} from '@/lib/student-agenda';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

type DayEntry =
  | { kind: 'assignment'; key: string; title: string; done: boolean; item: StudentAssignmentItem }
  | { kind: 'task'; key: string; title: string; done: boolean; task: PersonalTask };

/** Lịch tháng theo dõi hạn chót: hạn nộp bài tập trên lớp và hạn của việc cá nhân. */
export default function DeadlineCalendar({ tasks, assignments, today }: {
  tasks: PersonalTask[];
  assignments: StudentAssignmentItem[];
  today: string;
}) {
  const [year, month] = today.split('-').map(Number);
  const [view, setView] = useState({ year, month: month - 1 });
  const [selected, setSelected] = useState(today);

  // Gom mục theo ngày hạn.
  const byDate = new Map<string, DayEntry[]>();
  const push = (date: string | null, entry: DayEntry) => {
    if (!date) return;
    byDate.set(date, [...(byDate.get(date) ?? []), entry]);
  };
  for (const item of assignments) {
    push(assignmentDueDate(item), { kind: 'assignment', key: `a-${item.id}`, title: item.title, done: isAssignmentSubmitted(item), item });
  }
  for (const task of tasks) {
    push(task.due_date, { kind: 'task', key: `t-${task.id}`, title: task.title, done: task.is_done, task });
  }

  // Lưới 6 tuần bắt đầu từ thứ Hai.
  const first = new Date(view.year, view.month, 1);
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => new Date(view.year, view.month, 1 - offset + index));
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(first);
  const move = (delta: number) => setView((current) => {
    const next = new Date(current.year, current.month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });

  const selectedEntries = byDate.get(selected) ?? [];
  const [selYear, selMonth, selDay] = selected.split('-').map(Number);
  const selectedLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(selYear, selMonth - 1, selDay));

  const tone = (entry: DayEntry, date: string) => {
    if (entry.done) return 'bg-emerald-50 text-emerald-700 line-through decoration-emerald-400';
    if (date < today) return 'bg-red-50 text-red-700';
    return entry.kind === 'assignment' ? 'bg-indigo-50 text-indigo-800' : 'bg-gray-100 text-gray-700';
  };

  return (
    <section aria-label="Lịch hạn chót" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-bold capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => move(-1)} aria-label="Tháng trước" className="h-8 w-8 rounded-lg text-[13px] hover:bg-gray-100">‹</button>
          <button type="button" onClick={() => { setView({ year, month: month - 1 }); setSelected(today); }} className="h-8 rounded-lg border border-gray-200 px-2.5 text-[11px] hover:bg-gray-50">Hôm nay</button>
          <button type="button" onClick={() => move(1)} aria-label="Tháng sau" className="h-8 w-8 rounded-lg text-[13px] hover:bg-gray-100">›</button>
        </div>
      </div>

      <div role="grid" aria-label={`Lịch ${monthLabel}`} className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 text-[10px]">
        {WEEKDAYS.map((day) => <div key={day} role="columnheader" className="bg-gray-50 py-1.5 text-center font-semibold text-gray-500">{day}</div>)}
        {cells.map((date) => {
          const key = localDate(date);
          const entries = byDate.get(key) ?? [];
          const inMonth = date.getMonth() === view.month;
          const isToday = key === today;
          const isSelected = key === selected;
          const pending = entries.filter((entry) => !entry.done);
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${date.getDate()}/${date.getMonth() + 1}: ${entries.length ? `${entries.length} hạn chót` : 'không có hạn chót'}`}
              onClick={() => setSelected(key)}
              className={`flex min-h-[64px] flex-col items-stretch gap-0.5 p-1 text-left align-top transition ${inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'} ${isSelected ? 'ring-2 ring-inset ring-black' : 'hover:bg-gray-50'}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center self-end rounded-full text-[10px] ${isToday ? 'bg-black font-bold text-white' : ''}`}>{date.getDate()}</span>
              {/* Màn hình hẹp: chấm màu; rộng: tên rút gọn. */}
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {entries.slice(0, 4).map((entry) => <i key={entry.key} className={`h-1.5 w-1.5 rounded-full ${entry.done ? 'bg-emerald-500' : key < today ? 'bg-red-500' : entry.kind === 'assignment' ? 'bg-indigo-500' : 'bg-gray-500'}`} />)}
              </span>
              <span className="hidden flex-col gap-0.5 sm:flex">
                {entries.slice(0, 2).map((entry) => <span key={entry.key} className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${tone(entry, key)}`}>{entry.title}</span>)}
                {entries.length > 2 && <span className="px-1 text-[10px] text-gray-500">+{entries.length - 2}</span>}
              </span>
              {pending.length > 0 && <span className="sr-only">{pending.length} việc chưa xong</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-indigo-500" />Bài tập trên lớp</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-gray-500" />Việc cá nhân</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" />Quá hạn</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Đã xong</span>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <h3 className="text-[12px] font-semibold capitalize">{selectedLabel}</h3>
        {selectedEntries.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-gray-500">Không có hạn chót nào trong ngày này.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {selectedEntries.map((entry) => (
              <li key={entry.key} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2 text-[11px]">
                <div className="min-w-0">
                  <p className={`font-semibold ${entry.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{entry.title}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {entry.kind === 'assignment'
                      ? `Bài tập ${entry.item.class_code} · hạn ${entry.item.ends_at ? new Date(entry.item.ends_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''} · ${assignmentStatusLabel(entry.item).text}`
                      : `Việc cá nhân · ${entry.done ? 'đã xong' : selected < today ? 'quá hạn' : 'chưa xong'}`}
                  </p>
                </div>
                {entry.kind === 'assignment' && (
                  <Link href={`/student/assignments/${entry.item.id}`} className="shrink-0 text-[10px] font-semibold text-indigo-700 hover:underline">
                    {entry.done ? 'Xem' : 'Làm bài'}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
