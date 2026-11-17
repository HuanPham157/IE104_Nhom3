'use client';

import React, { useState } from 'react';

interface TaskFormProps {
  onAdd: (title: string) => void;
}

export default function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();

    if (trimmed.length < 1 || trimmed.length > 120) {
      setError('Tên công việc phải từ 1 đến 120 ký tự (không tính khoảng trắng thừa)');
      return;
    }

    onAdd(trimmed);
    setTitle('');
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-2">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1">
          <label htmlFor="new-task-input" className="sr-only">
            Tên công việc hoặc câu hỏi cần hoàn thành
          </label>
          <input
            id="new-task-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="Nhập tên bài tập hoặc công việc cần làm..."
            className={`w-full px-4 py-2.5 rounded-lg border bg-white text-sm text-[#111c2d] placeholder-[#777586] focus:outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/20'
                : 'border-[#c7c4d7] focus:border-[#2a14b4] focus:ring-[#2a14b4]/20'
            }`}
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#4338ca] hover:bg-[#2a14b4] text-white text-sm font-semibold transition-all active:scale-[0.98] shadow-sm shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>+</span>
          <span>Thêm công việc</span>
        </button>
      </div>

      {error && (
        <p className="text-xs text-[#ba1a1a] font-medium pl-1 flex items-center gap-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </form>
  );
}