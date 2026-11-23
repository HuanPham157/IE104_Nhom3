'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import StudentPageShell from '@/components/layout/StudentPageShell';
import DeadlineCalendar from '@/features/tasks/components/DeadlineCalendar';
import TaskForm, { type TaskDraft } from '@/features/tasks/components/TaskForm';
import TaskList from '@/features/tasks/components/TaskList';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import { PRIORITY_LABEL, dueState, localDate, type PersonalTask } from '@/lib/personal-tasks';
import {
  assignmentDueDate,
  isAssignmentOpen,
  isAssignmentSubmitted,
  type StudentAssignmentItem,
} from '@/lib/student-agenda';

type Filter = 'all' | 'active' | 'overdue' | 'done';
type Sort = 'due' | 'priority' | 'newest';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Cần làm' },
  { id: 'overdue', label: 'Quá hạn' },
  { id: 'done', label: 'Đã xong' },
];

/** Tải song song việc cá nhân và bài tập trên lớp (không đụng state, để gọi được trong effect). */
const fetchAgenda = () => Promise.allSettled([
  oralcheckFetch<{ data: PersonalTask[]; warning?: string }>('/api/tasks'),
  oralcheckFetch<{ data: StudentAssignmentItem[] }>('/api/student/assignments'),
]);

/** So sánh theo hạn chót (không hạn xếp cuối), rồi ưu tiên, rồi mới tạo trước. */
const byDue = (a: PersonalTask, b: PersonalTask) =>
  (a.due_date ?? '9999-12-31').localeCompare(b.due_date ?? '9999-12-31')
  || PRIORITY_LABEL[a.priority].rank - PRIORITY_LABEL[b.priority].rank
  || b.created_at.localeCompare(a.created_at);

export default function TaskDashboard() {
  const [today] = useState(() => localDate(new Date()));
  const [nowMs] = useState(() => Date.now());
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  // Bài tập trên lớp: không bắt buộc — lỗi thì trang vẫn quản lý việc cá nhân bình thường.
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [assignmentError, setAssignmentError] = useState('');
  const [showAssignments, setShowAssignments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('due');
  const [search, setSearch] = useState('');

  /** Áp kết quả tải việc cá nhân và bài tập trên lớp (bài tập không bắt buộc — lỗi thì vẫn quản lý việc bình thường). */
  const applyResults = useCallback(([taskResult, assignmentResult]: Awaited<ReturnType<typeof fetchAgenda>>) => {
    if (taskResult.status === 'fulfilled') {
      setTasks(taskResult.value.data);
      setWarning(taskResult.value.warning ?? '');
      setError('');
    } else {
      setError(taskResult.reason instanceof Error ? taskResult.reason.message : 'Không thể tải danh sách công việc.');
    }
    if (assignmentResult.status === 'fulfilled') {
      setAssignments(assignmentResult.value.data);
      setAssignmentError('');
    } else {
      setAssignmentError('Không tải được bài tập trên lớp; danh sách và lịch chỉ hiện việc cá nhân.');
    }
    setLoading(false);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    applyResults(await fetchAgenda());
  }, [applyResults]);

  useEffect(() => {
    let active = true;
    fetchAgenda().then((results) => { if (active) applyResults(results); });
    return () => { active = false; };
  }, [applyResults]);

  const replaceTask = (updated: PersonalTask) => setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));

  async function addTask(draft: TaskDraft): Promise<boolean> {
    setAdding(true);
    setError('');
    try {
      const body = { title: draft.title, ...(draft.due_date ? { due_date: draft.due_date } : {}), ...(draft.priority !== 'normal' ? { priority: draft.priority } : {}), ...(draft.notes ? { notes: draft.notes } : {}) };
      const { data } = await oralcheckFetch<{ data: PersonalTask }>('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
      setTasks((current) => [data, ...current]);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể thêm công việc.');
      return false;
    } finally {
      setAdding(false);
    }
  }

  // Đánh dấu xong: cập nhật ngay trên giao diện, hoàn tác nếu máy chủ báo lỗi.
  async function toggleTask(task: PersonalTask) {
    setBusyId(task.id);
    setError('');
    replaceTask({ ...task, is_done: !task.is_done });
    try {
      const { data } = await oralcheckFetch<{ data: PersonalTask }>(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ is_done: !task.is_done }) });
      replaceTask(data);
    } catch (reason) {
      replaceTask(task);
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setBusyId(null);
    }
  }

  async function saveTask(task: PersonalTask, draft: TaskDraft): Promise<string | null> {
    setBusyId(task.id);
    try {
      const changes: Record<string, unknown> = {};
      if (draft.title !== task.title) changes.title = draft.title;
      if (draft.due_date !== task.due_date) changes.due_date = draft.due_date;
      if (draft.priority !== task.priority) changes.priority = draft.priority;
      if ((draft.notes || null) !== task.notes) changes.notes = draft.notes;
      if (!Object.keys(changes).length) return null;
      const { data } = await oralcheckFetch<{ data: PersonalTask }>(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      replaceTask(data);
      return null;
    } catch (reason) {
      return reason instanceof Error ? reason.message : 'Không thể lưu thay đổi.';
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTask(task: PersonalTask) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${task.title}"?`)) return;
    setBusyId(task.id);
    setError('');
    try {
      await oralcheckFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xóa công việc.');
    } finally {
      setBusyId(null);
    }
  }

  async function clearCompleted() {
    const done = tasks.filter((task) => task.is_done);
    if (!done.length || !window.confirm(`Xóa ${done.length} việc đã hoàn thành?`)) return;
    setClearing(true);
    setError('');
    const failed: string[] = [];
    for (const task of done) {
      try {
        await oralcheckFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      } catch {
        failed.push(task.title);
      }
    }
    setClearing(false);
    if (failed.length) setError(`Không xóa được ${failed.length} việc. Hãy tải lại và thử lại.`);
    await loadTasks();
  }

  // Bài tập đang trong thời gian được giao (đã mở, chưa quá hạn) — hiện chung trong danh sách việc.
  const openAssignments = useMemo(() => assignments.filter((item) => isAssignmentOpen(item, nowMs)), [assignments, nowMs]);

  const stats = useMemo(() => {
    const active = tasks.filter((task) => !task.is_done);
    const pendingAssignments = openAssignments.filter((item) => !isAssignmentSubmitted(item));
    return {
      total: tasks.length,
      active: active.length,
      pendingAssignments: pendingAssignments.length,
      overdue: active.filter((task) => dueState(task, today) === 'overdue').length,
      dueToday: active.filter((task) => dueState(task, today) === 'today').length
        + pendingAssignments.filter((item) => assignmentDueDate(item) === today).length,
      done: tasks.length - active.length,
    };
  }, [tasks, openAssignments, today]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const filtered = tasks
      .filter((task) => {
        if (filter === 'active') return !task.is_done;
        if (filter === 'done') return task.is_done;
        if (filter === 'overdue') return dueState(task, today) === 'overdue';
        return true;
      })
      .filter((task) => !query || `${task.title} ${task.notes ?? ''}`.toLocaleLowerCase('vi').includes(query));
    if (sort === 'newest') return [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === 'priority') return [...filtered].sort((a, b) => PRIORITY_LABEL[a.priority].rank - PRIORITY_LABEL[b.priority].rank || byDue(a, b));
    return [...filtered].sort(byDue);
  }, [tasks, filter, sort, search, today]);

  const visibleAssignments = useMemo(() => {
    if (!showAssignments) return [];
    const query = search.trim().toLocaleLowerCase('vi');
    return openAssignments
      .filter((item) => {
        if (filter === 'active') return !isAssignmentSubmitted(item);
        if (filter === 'done') return isAssignmentSubmitted(item);
        if (filter === 'overdue') return false; // bài đang mở thì chưa quá hạn
        return true;
      })
      .filter((item) => !query || `${item.title} ${item.class_name} ${item.class_code}`.toLocaleLowerCase('vi').includes(query))
      .sort((a, b) => (a.ends_at ?? '9999').localeCompare(b.ends_at ?? '9999'));
  }, [openAssignments, showAssignments, filter, search]);

  const openDone = showAssignments ? openAssignments.filter(isAssignmentSubmitted).length : 0;
  const openPending = showAssignments ? stats.pendingAssignments : 0;
  const counts: Record<Filter, number> = {
    all: stats.total + openDone + openPending,
    active: stats.active + openPending,
    overdue: stats.overdue,
    done: stats.done + openDone,
  };
  const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <StudentPageShell currentPage="tasks" breadcrumb="Việc cá nhân">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">Việc cá nhân</h1>
          <p className="mt-1 max-w-[640px] text-[12px] leading-relaxed text-[#6f7175]">
            Ghi lại việc cần làm để chuẩn bị cho các buổi vấn đáp: ôn chương nào, câu hỏi nào cần luyện, hạn chót khi nào. Chỉ bạn xem được danh sách này.
          </p>
        </div>
        <Link href="/student/classes" className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
          Bài tập trên lớp →
        </Link>
      </div>

      {warning && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">{warning}</p>}
      {assignmentError && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">{assignmentError}</p>}
      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="rounded px-2 py-1 hover:bg-red-100">Đóng</button>
        </div>
      )}

      <section aria-label="Thống kê việc cá nhân" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Cần làm', value: stats.active + stats.pendingAssignments, note: `${stats.active} việc cá nhân · ${stats.pendingAssignments} bài tập`, tone: 'border-gray-200 bg-white' },
          { label: 'Quá hạn', value: stats.overdue, note: stats.overdue ? 'Hãy xử lý sớm' : 'Không có việc trễ', tone: stats.overdue ? 'border-red-200 bg-red-50 text-red-800' : 'border-gray-200 bg-white' },
          { label: 'Hạn hôm nay', value: stats.dueToday, note: today.split('-').reverse().join('/'), tone: stats.dueToday ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-white' },
          { label: 'Việc đã hoàn thành', value: `${percent}%`, note: `${stats.done}/${stats.total} việc cá nhân`, tone: 'border-gray-200 bg-white' },
        ].map((card) => (
          <article key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
            <p className="mt-1.5 text-[28px] font-bold leading-none">{loading ? '…' : card.value}</p>
            <p className="mt-2 text-[10px] opacity-70">{card.note}</p>
          </article>
        ))}
      </section>
      {stats.total > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label="Tiến độ hoàn thành" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <TaskForm onAdd={addTask} disabled={adding} today={today} />

          <section className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" aria-label="Lọc công việc">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                  className={`rounded-lg px-3 py-2 text-[11px] transition ${filter === option.id ? 'bg-white font-semibold text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  {option.label} ({counts[option.id]})
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                aria-label="Tìm công việc"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc ghi chú…"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-[11px] outline-none focus:border-black sm:w-56"
              />
              <label className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px]">
                <input type="checkbox" checked={showAssignments} onChange={(event) => setShowAssignments(event.target.checked)} className="accent-indigo-600" />
                Bài tập trên lớp
              </label>
              <select aria-label="Sắp xếp" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px]">
                <option value="due">Hạn chót gần nhất</option>
                <option value="priority">Ưu tiên cao trước</option>
                <option value="newest">Mới tạo trước</option>
              </select>
              <button type="button" onClick={() => void loadTasks()} disabled={loading} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[11px] hover:bg-gray-100 disabled:opacity-50">
                {loading ? 'Đang tải…' : 'Tải lại'}
              </button>
              {stats.done > 0 && (
                <button type="button" onClick={() => void clearCompleted()} disabled={clearing} className="h-9 rounded-lg border border-red-200 bg-white px-3 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50">
                  {clearing ? 'Đang xóa…' : `Xóa ${stats.done} việc đã xong`}
                </button>
              )}
            </div>
          </section>

          <div className="mt-4">
            {loading && !tasks.length ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-[12px] text-gray-500">Đang tải danh sách công việc…</p>
            ) : !tasks.length && !visibleAssignments.length && filter === 'all' && !search.trim() ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                <h2 className="text-[13px] font-semibold">Bạn chưa có công việc cá nhân nào</h2>
                <p className="mt-1 text-[11px] text-gray-500">Thêm việc đầu tiên ở ô phía trên — ví dụ “Ôn chương 2 trước buổi vấn đáp thứ Sáu”.</p>
              </div>
            ) : !visible.length && !visibleAssignments.length ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-[12px] text-gray-500">Không có việc nào khớp bộ lọc hoặc từ khóa.</p>
            ) : (
              <TaskList
                tasks={visible}
                assignments={visibleAssignments}
                today={today}
                nowMs={nowMs}
                grouped={sort === 'due' && (filter === 'all' || filter === 'active') && !search.trim()}
                busyId={busyId}
                onToggle={(task) => void toggleTask(task)}
                onSave={saveTask}
                onDelete={(task) => void deleteTask(task)}
              />
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-20">
          <DeadlineCalendar tasks={tasks} assignments={showAssignments ? assignments : []} today={today} />
        </aside>
      </div>
    </StudentPageShell>
  );
}
