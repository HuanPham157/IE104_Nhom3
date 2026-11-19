'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { oralcheckFetch } from '@/lib/oralcheck-client';

type ClassOption = { id: string; class_name: string; class_code: string };
type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  status: string;
  ends_at: string | null;
  results_published_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: 'Bản nháp', className: 'bg-amber-50 text-amber-800' },
  published: { text: 'Đã công bố', className: 'bg-emerald-50 text-emerald-800' },
  closed: { text: 'Đã đóng', className: 'bg-gray-100 text-gray-700' },
  archived: { text: 'Lưu trữ', className: 'bg-gray-100 text-gray-500' },
};

/** Danh sách bài tập đã tạo trong các lớp đang phụ trách — mở lại để soạn tiếp (bản nháp) hoặc xem/sửa đề. */
export default function AssignmentList({ classes, currentAssignmentId, refreshKey }: {
  classes: ClassOption[];
  currentAssignmentId: string | null;
  /** Tăng sau khi lưu/công bố để tải lại danh sách. */
  refreshKey: number;
}) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!classes.length) return;
    let active = true;
    Promise.all(classes.map((item) => oralcheckFetch<{ data: AssignmentRow[] }>(`/api/classes/${item.id}/assignments`)
      .then(({ data }) => data)
      .catch(() => [] as AssignmentRow[])))
      .then((lists) => {
        if (!active) return;
        setRows(lists.flat().filter((row) => row.status !== 'archived').sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setError('');
      })
      .catch(() => { if (active) setError('Không tải được danh sách bài tập.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classes, refreshKey]);

  const classById = new Map(classes.map((item) => [item.id, item]));
  const visible = classFilter ? rows.filter((row) => row.class_id === classFilter) : rows;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="text-left">
          <h2 className="text-sm font-bold text-gray-900">Bài tập đã tạo ({rows.length}) <span aria-hidden="true" className="text-gray-400">{open ? '▾' : '▸'}</span></h2>
          <p className="text-[11px] text-gray-500">Mở lại để soạn tiếp bản nháp hoặc xem/sửa đề đã công bố.</p>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {classes.length > 1 && (
            <select aria-label="Lọc theo lớp" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs">
              <option value="">Tất cả lớp</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.class_name} ({item.class_code})</option>)}
            </select>
          )}
          {/* Tải lại hẳn trang: bài vừa tạo chưa có assignmentId trên URL nên điều hướng phía client sẽ giữ nguyên form cũ. */}
          <a href="/teacher/assignments/create" className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800">+ Bài tập mới</a>
        </div>
      </div>

      {open && (
        <div className="mt-3">
          {loading && classes.length > 0 && <p className="text-xs text-gray-500">Đang tải danh sách bài tập…</p>}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          {!loading && !error && visible.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs text-gray-500">Chưa có bài tập nào.</p>}
          {visible.length > 0 && (
            <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
              {visible.map((row) => {
                const status = STATUS_LABEL[row.status] ?? { text: row.status, className: 'bg-gray-100 text-gray-700' };
                const classItem = classById.get(row.class_id);
                const current = row.id === currentAssignmentId;
                return (
                  <li key={row.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs ${current ? 'bg-indigo-50' : ''}`}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{row.title}{current && <span className="ml-2 text-[10px] font-medium text-indigo-700">(đang mở)</span>}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {classItem ? `${classItem.class_name} · ` : ''}
                        {row.ends_at ? `Hạn: ${new Date(row.ends_at).toLocaleString('vi-VN')}` : 'Không đặt hạn'}
                        {row.results_published_at ? ' · Đã công bố điểm' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.text}</span>
                      {!current && (
                        <Link href={`/teacher/assignments/create?classId=${row.class_id}&assignmentId=${row.id}`} className="rounded-full border border-gray-300 px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-50">
                          {row.status === 'draft' ? 'Soạn tiếp' : 'Xem / sửa đề'}
                        </Link>
                      )}
                      {row.status !== 'draft' && (
                        <Link href={`/teacher/evaluations/${row.id}`} className="rounded-full border border-indigo-200 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-50">Bài nộp</Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
