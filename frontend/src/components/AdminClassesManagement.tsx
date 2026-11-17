'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { oralcheckFetch } from '@/lib/oralcheck-client';

interface ClassRecord {
  id: string;
  class_name: string;
  description: string | null;
  class_code: string;
  status: 'active' | 'pending' | 'rejected' | 'archived';
  created_at: string;
  lecturer_name: string | null;
}

type StatusFilter = 'all' | ClassRecord['status'];

const statusLabels: Record<ClassRecord['status'], string> = {
  active: 'Đang hoạt động',
  pending: 'Chờ duyệt',
  rejected: 'Đã từ chối',
  archived: 'Đã lưu trữ',
};

export default function AdminClassesManagement() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadClasses() {
      try {
        const response = await oralcheckFetch<{ data: ClassRecord[] }>('/api/classes');
        if (active) setClasses(response.data);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách lớp học.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadClasses();
    return () => { active = false; };
  }, []);

  async function deleteClass(item: ClassRecord) {
    const confirmed = window.confirm(
      `Xóa lớp "${item.class_name}"? Lớp có sinh viên hoặc bài tập sẽ được lưu trữ để giữ lại dữ liệu.`,
    );
    if (!confirmed) return;

    setErrorMessage('');
    setNoticeMessage('');
    setDeletingClassId(item.id);
    try {
      const { data } = await oralcheckFetch<{ data: { archived: boolean } }>(`/api/classes/${item.id}`, {
        method: 'DELETE',
      });
      setClasses((current) => current.filter((classItem) => classItem.id !== item.id));
      setNoticeMessage(
        data.archived
          ? 'Lớp đã được lưu trữ để bảo toàn danh sách sinh viên và bài tập.'
          : 'Đã xóa lớp học.',
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa lớp học.');
    } finally {
      setDeletingClassId(null);
    }
  }

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return classes.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesQuery = !query || `${item.class_name} ${item.class_code}`.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [classes, search, statusFilter]);

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c]">
      <AdminSidebar currentPage="classes" />
      <div className="min-w-0 md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/admin" className="hover:text-black">Trung tâm Quản trị</Link>
            <span>/</span>
            <span className="font-semibold text-gray-900">Quản lý lớp học</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/classes" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50">
              Tạo lớp / Soạn bài
            </Link>
            <Link href="/admin/approvals" className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">
              Xem yêu cầu duyệt
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="border-b border-gray-200 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quản lý lớp học</h1>
            <p className="mt-1 text-sm text-gray-600">Danh sách lớp học và trạng thái được tải trực tiếp từ hệ thống.</p>
          </div>

          {errorMessage && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
          {noticeMessage && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{noticeMessage}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex h-10 max-w-md flex-1 items-center rounded-lg border border-gray-300 bg-white px-3">
              <span className="sr-only">Tìm lớp học</span>
              <input
                aria-label="Tìm lớp học"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc mã lớp..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Trạng thái
              <select
                aria-label="Lọc trạng thái lớp"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="pending">Chờ duyệt</option>
                <option value="rejected">Đã từ chối</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {loading ? (
              <p className="p-8 text-center text-sm text-gray-500">Đang tải danh sách lớp...</p>
            ) : filteredClasses.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">
                {classes.length === 0 ? 'Chưa có lớp học trong hệ thống.' : 'Không tìm thấy lớp học phù hợp.'}
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredClasses.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-gray-900">{item.class_name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          item.status === 'active' ? 'bg-green-50 text-green-700' :
                          item.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          item.status === 'archived' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'
                        }`}>{statusLabels[item.status]}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">{item.description || 'Chưa có mô tả.'}</p>
                      <p className="mt-1 text-xs text-gray-500">Giảng viên: {item.lecturer_name || 'Chưa cập nhật'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-xs text-gray-500">
                      <span>Mã lớp: <b className="font-semibold text-gray-800">{item.class_code}</b></span>
                      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</time>
                      <Link
                        href={`/teacher/classes/${item.id}`}
                        className="rounded-full border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Xem lớp
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteClass(item)}
                        disabled={deletingClassId === item.id}
                        className="rounded-full border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingClassId === item.id ? 'Đang xử lý...' : 'Xóa lớp'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">{filteredClasses.length} lớp học</p>
        </section>
      </div>
    </main>
  );
}
