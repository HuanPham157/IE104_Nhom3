'use client';

import React, { useState } from 'react';

export interface Task {
  id: string;
  title: string;
  is_done: boolean;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newTitle: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      setError('Tên phải từ 1 đến 120 ký tự');
      return;
    }
    onEdit(task.id, trimmed);
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
    setError('');
  };

  const handleDelete = () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công việc "${task.title}" không?`)) {
      onDelete(task.id);
    }
  };

  return (
    <article
      data-testid="task-item"
      className="p-3.5 sm:p-4 rounded-xl border border-[#c7c4d7]/70 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-[#2a14b4]/40"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
        <label htmlFor={`checkbox-${task.id}`} className="sr-only">
          Đánh dấu hoàn thành {task.title}
        </label>
        <input
          id={`checkbox-${task.id}`}
          type="checkbox"
          checked={task.is_done}
          onChange={() => onToggle(task.id)}
          className="w-4 h-4 rounded text-[#2a14b4] focus:ring-[#2a14b4] border-[#c7c4d7] cursor-pointer shrink-0"
        />

        {isEditing ? (
          <div className="flex-1 w-full">
            <label htmlFor={`edit-input-${task.id}`} className="sr-only">
              Chỉnh sửa tên công việc
            </label>
            <input
              id={`edit-input-${task.id}`}
              type="text"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-2.5 py-1 text-sm border border-[#2a14b4] rounded outline-none text-[#111c2d]"
            />
            {error && <span className="text-[11px] text-[#ba1a1a] block mt-0.5">{error}</span>}
          </div>
        ) : (
          <span
            className={`text-sm truncate select-none ${
              task.is_done ? 'line-through text-[#777586]' : 'text-[#111c2d] font-medium'
            }`}
          >
            {task.title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1 text-xs font-semibold bg-[#2a14b4] hover:bg-[#372abf] text-white rounded transition-colors"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-2.5 py-1 text-xs font-semibold bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#464554] rounded transition-colors"
            >
              Hủy
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-xs font-semibold bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#2a14b4] rounded transition-colors"
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-2.5 py-1 text-xs font-semibold bg-[#ffdad6] hover:bg-[#ffdad6]/80 text-[#ba1a1a] rounded transition-colors"
            >
              Xóa
            </button>
          </>
        )}
      </div>
    </article>
  );
}