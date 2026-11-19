'use client';

import AssignmentAgendaItem from '@/components/AssignmentAgendaItem';
import TaskItem from '@/components/TaskItem';
import type { TaskDraft } from '@/components/TaskForm';
import { dueState, type PersonalTask } from '@/lib/personal-tasks';
import { assignmentDueDate, isAssignmentSubmitted, type StudentAssignmentItem } from '@/lib/student-agenda';

const GROUPS = [
  { id: 'overdue', title: 'Quá hạn', match: (state: string, done: boolean) => !done && state === 'overdue' },
  { id: 'today', title: 'Hôm nay & ngày mai', match: (state: string, done: boolean) => !done && (state === 'today' || state === 'tomorrow') },
  { id: 'week', title: 'Trong 7 ngày tới', match: (state: string, done: boolean) => !done && state === 'week' },
  { id: 'later', title: 'Sau này / không đặt hạn', match: (state: string, done: boolean) => !done && (state === 'later' || state === 'none') },
  { id: 'done', title: 'Đã xong', match: (_state: string, done: boolean) => done },
] as const;

/**
 * Danh sách việc cá nhân và bài tập trên lớp đang mở (đã lọc/sắp xếp sẵn).
 * `grouped`: chia nhóm theo hạn chót, bài tập đứng trước việc cá nhân trong mỗi nhóm.
 */
export default function TaskList({ tasks, assignments, today, nowMs, grouped, busyId, onToggle, onSave, onDelete }: {
  tasks: PersonalTask[];
  assignments: StudentAssignmentItem[];
  today: string;
  nowMs: number;
  grouped: boolean;
  busyId: string | null;
  onToggle: (task: PersonalTask) => void;
  onSave: (task: PersonalTask, draft: TaskDraft) => Promise<string | null>;
  onDelete: (task: PersonalTask) => void;
}) {
  const renderTask = (task: PersonalTask) => (
    <TaskItem key={task.id} task={task} today={today} busy={busyId === task.id} onToggle={onToggle} onSave={onSave} onDelete={onDelete} />
  );
  const renderAssignment = (item: StudentAssignmentItem) => <AssignmentAgendaItem key={`assignment-${item.id}`} item={item} nowMs={nowMs} />;

  if (!grouped) {
    return (
      <div className="space-y-5">
        {assignments.length > 0 && (
          <section aria-label="Bài tập trên lớp">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-indigo-700">Bài tập trên lớp ({assignments.length})</h3>
            <div className="space-y-2">{assignments.map(renderAssignment)}</div>
          </section>
        )}
        {tasks.length > 0 && <div className="space-y-2">{tasks.map(renderTask)}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {GROUPS.map((group) => {
        const groupAssignments = assignments.filter((item) =>
          group.match(dueState({ due_date: assignmentDueDate(item), is_done: isAssignmentSubmitted(item) }, today), isAssignmentSubmitted(item)));
        const groupTasks = tasks.filter((task) => group.match(dueState(task, today), task.is_done));
        const count = groupAssignments.length + groupTasks.length;
        if (!count) return null;
        return (
          <section key={group.id} aria-label={group.title}>
            <h3 className={`mb-2 text-[11px] font-bold uppercase tracking-wide ${group.id === 'overdue' ? 'text-red-700' : 'text-[#666]'}`}>
              {group.title} <span className="font-medium">({count})</span>
            </h3>
            <div className="space-y-2">
              {groupAssignments.map(renderAssignment)}
              {groupTasks.map(renderTask)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
