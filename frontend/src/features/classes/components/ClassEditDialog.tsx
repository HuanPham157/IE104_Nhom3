'use client';

import { useState, type FormEvent } from 'react';
import { oralcheckFetch } from '@/lib/oralcheck-client';

export interface EditableClass {
  id: string;
  class_name: string;
  description: string | null;
  class_code: string;
}

interface ClassEditDialogProps {
  classItem: EditableClass;
  onClose: () => void;
  onSaved: (updated: { class_name: string; description: string | null }) => void;
}

/** Popup sửa tên và mô tả lớp (mã lớp giữ nguyên để sinh viên không bị ảnh hưởng). */
export default function ClassEditDialog({ classItem, onClose, onSaved }: ClassEditDialogProps) {
  const [name, setName] = useState(classItem.class_name);
  const [description, setDescription] = useState(classItem.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await oralcheckFetch(`/api/classes/${classItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ class_name: name.trim(), description: description.trim() || null }),
      });
      onSaved({ class_name: name.trim(), description: description.trim() || null });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật lớp học.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-edit-title"
        onSubmit={handleSubmit}
        className="w-full max-w-lg animate-fade-up space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">Mã lớp {classItem.class_code}</p>
            <h2 id="class-edit-title" className="mt-1 text-lg font-semibold text-gray-900">Sửa thông tin lớp học</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900">✕</button>
        </div>

        <label className="block text-[12px] font-semibold text-gray-700">
          Tên lớp học *
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={160}
            className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3.5 text-[14px] font-normal outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          />
        </label>

        <label className="block text-[12px] font-semibold text-gray-700">
          Mô tả lớp
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Mục tiêu môn học, lịch học, quy định làm bài…"
            className="mt-1.5 w-full rounded-xl border border-gray-300 p-3.5 text-[14px] font-normal outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          />
        </label>

        <p className="text-[12px] text-gray-500">Mã lớp không thay đổi để sinh viên đã tham gia không bị ảnh hưởng.</p>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2 text-[13px] font-semibold hover:bg-gray-100">Hủy</button>
          <button type="submit" disabled={saving || !name.trim()} className="rounded-xl bg-black px-5 py-2 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
