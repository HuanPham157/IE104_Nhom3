'use client';

import React from 'react';
import TaskItem, { Task } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newTitle: string) => void;
}

export default function TaskList({ tasks, onToggle, onDelete, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-[#c7c4d7] bg-white">
        <p className="text-sm font-semibold text-[#111c2d]">Chưa có công việc nào trong danh sách</p>
        <p className="text-xs text-[#464554] mt-1">Hãy nhập nội dung vào ô trên và bấm Thêm công việc.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}