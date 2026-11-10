'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { oralcheckFetch } from '@/lib/oralcheck-client';

interface ApprovalItem {
  id: string;
  type: 'class' | 'class_cancellation' | 'academic_rank';
  title: string;
  requestedBy: string;
  department: string;
  date: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  identifier: string; // MSSV or MSG
  department: string;
  status: 'active' | 'suspended';
  createdDate: string;
}

interface ApprovalRecord {
  id: string;
  requester_id: string;
  requester_name: string;
  request_type: string;
  request_data: { class_name?: string; class_code?: string; reason?: string } | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  created_at: string;
}

export default function AdminDashboard({ currentPage = 'overview' }: { currentPage?: 'overview' | 'approvals' }) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'teacher' | 'student'>('all');

  // State Modal Từ chối
  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let active = true;
    oralcheckFetch<{ data: ApprovalRecord[] }>('/api/admin/approval-requests')
      .then(({ data }) => {
        if (!active) return;
        setApprovals(data.map((item) => ({
          id: item.id,
          type: item.request_type === 'class_cancellation' ? 'class_cancellation' : 'class',
          title: item.request_type === 'class_cancellation'
            ? `Yêu cầu hủy lớp: ${item.request_data?.class_name ?? 'Lớp học'}`
            : item.request_data?.class_name ?? 'Yêu cầu mở lớp',
          requestedBy: item.requester_name,
          department: '—',
          date: new Date(item.created_at).toLocaleString('vi-VN'),
          details: [
            item.request_data?.class_code ? `Mã lớp: ${item.request_data.class_code}` : '',
            item.request_data?.reason ?? '',
          ].filter(Boolean).join(' • '),
          status: item.status,
          rejectionReason: item.reject_reason ?? undefined,
        })));
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải yêu cầu phê duyệt.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (currentPage !== 'approvals') return;
    document.getElementById('approval-requests')?.scrollIntoView();
  }, [currentPage]);

  // Hàm Phê duyệt
  const handleApprove = async (id: string) => {
    try {
      await oralcheckFetch(`/api/admin/approval-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision: 'approved' }),
      });
      setApprovals((prev) => prev.map((item) => item.id === id ? { ...item, status: 'approved' } : item));
      showToast('Đã phê duyệt yêu cầu thành công.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể phê duyệt yêu cầu.');
    }
  };

  // Mở modal từ chối
  const openRejectModal = (item: ApprovalItem) => {
    setRejectingItem(item);
    setRejectReason(
      item.type === 'class'
        ? 'Vui lòng bổ sung thông tin cần thiết cho yêu cầu mở lớp.'
        : item.type === 'class_cancellation'
        ? 'Yêu cầu hủy lớp chưa được chấp thuận. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.'
        : 'Văn bằng Tiến sĩ chưa có bản scan công chứng rõ nét. Vui lòng nộp lại hồ sơ.'
    );
  };

  // Xác nhận từ chối
  const confirmReject = async () => {
    if (!rejectingItem) return;
    try {
      await oralcheckFetch(`/api/admin/approval-requests/${rejectingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision: 'rejected', reject_reason: rejectReason }),
      });
      setApprovals((prev) => rejectingItem.type === 'class'
        ? prev.filter((item) => item.id !== rejectingItem.id)
        : prev.map((item) =>
          item.id === rejectingItem.id ? { ...item, status: 'rejected', rejectionReason: rejectReason } : item
        ));
      setRejectingItem(null);
      showToast(rejectingItem.type === 'class'
        ? 'Lớp đã bị từ chối; lịch sử và thông báo lý do đã được lưu.'
        : 'Đã từ chối yêu cầu và gửi phản hồi lý do.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể từ chối yêu cầu.');
    }
  };

  // Đổi trạng thái khóa / mở khóa tài khoản
  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          showToast(nextStatus === 'suspended' ? '🔒 Đã tạm khóa tài khoản người dùng.' : '🔓 Đã mở khóa tài khoản.');
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.identifier.includes(userSearch);
    if (userRoleFilter === 'all') return matchSearch;
    return matchSearch && u.role === userRoleFilter;
  });

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-[#202124] font-sans antialiased text-xs flex">
      {/* Sidebar Admin */}
      <AdminSidebar currentPage={currentPage} />

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 md:ml-[255px]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="font-semibold text-gray-900">Quản trị viên</span>
            <span>/</span>
            <span>Hệ thống Quản trị Trung tâm</span>
            <span>/</span>
            <strong className="font-bold text-gray-900">
            {currentPage === 'approvals' ? 'Duyệt yêu cầu' : 'Tổng quan hệ thống'}
            </strong>
          </div>

          <Link
            href="/admin/approvals#approval-requests"
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] text-gray-600 hover:bg-gray-100"
          >
            Yêu cầu duyệt
          </Link>
        </header>

        {/* Content Body */}
        <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-8 sm:pt-6">
          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          {/* HEADER TITLE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {currentPage === 'approvals' ? 'Duyệt yêu cầu lớp học' : 'Tổng quan quản trị'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Quản lý yêu cầu mở lớp, tài khoản và quyền truy cập hệ thống.
              </p>
            </div>

          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Yêu cầu mở lớp đang chờ</span>
              <div className="mt-2 text-3xl font-black text-gray-900">
                {approvals.filter((item) => item.status === 'pending').length}
              </div>
              <p className="mt-2 border-t border-gray-100 pt-2 text-[10px] text-gray-600">Số liệu từ API phê duyệt lớp học</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tài khoản trong danh sách</span>
              <div className="mt-2 text-3xl font-black text-gray-900">{users.length}</div>
              <p className="mt-2 border-t border-gray-100 pt-2 text-[10px] text-gray-600">Chức năng quản lý tài khoản chưa được kết nối</p>
            </div>
          </section>

          {/* ========================================================= */}
          {/* PHẦN 1: DANH SÁCH DUYỆT LỚP HỌC & HỌC VỊ (QUAN TRỌNG NHẤT) */}
          {/* ========================================================= */}
          <section id="approval-requests" className="scroll-mt-24 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-sm">
                  ⚖️
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#111827]">
                    Danh sách Yêu cầu chờ Quản trị viên Phê duyệt
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Xử lý yêu cầu mở lớp và yêu cầu hủy lớp do giảng viên gửi.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                {approvals.filter((a) => a.status === 'pending').length} yêu cầu đang chờ
              </span>
            </div>

            <div className="space-y-3">
              {loading && <p className="p-4 text-sm text-gray-500">Đang tải yêu cầu phê duyệt...</p>}
              {!loading && approvals.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                  Hiện chưa có yêu cầu nào cần phê duyệt.
                </p>
              )}
              {approvals.map((item) => (
                <article
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.status === 'approved'
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : item.status === 'rejected'
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-gray-200 bg-[#fdfdfd] hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          item.type === 'class'
                            ? 'bg-indigo-100 text-indigo-800'
                            : item.type === 'class_cancellation'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'class'
                            ? 'MỞ LỚP MỚI'
                            : item.type === 'class_cancellation'
                            ? 'YÊU CẦU HỦY LỚP'
                            : 'HỌC HÀM / HỌC VỊ'}
                        </span>
                        <strong className="text-xs font-bold text-gray-900">{item.title}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">• {item.date}</span>
                      </div>

                      <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-3">
                        <span>Giảng viên gửi: <strong className="text-gray-900">{item.requestedBy}</strong></span>
                        <span>•</span>
                        <span>Đơn vị: {item.department}</span>
                      </div>

                      <p className="text-[11px] text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200 leading-relaxed font-mono">
                        {item.details}
                      </p>

                      {/* Hiển thị lý do từ chối nếu có */}
                      {item.status === 'rejected' && item.rejectionReason && (
                        <div className="p-2.5 rounded-lg bg-red-100/70 border border-red-200 text-red-800 text-[10px]">
                          <strong>Lý do từ chối đã gửi Giảng viên:</strong> {item.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Nút hành động Approve / Reject */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                          >
                            <span>✓</span> Phê duyệt (Approve)
                          </button>

                          <button
                            type="button"
                            onClick={() => openRejectModal(item)}
                            className="px-4 py-2 rounded-xl border border-red-300 bg-white text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                          >
                            <span>✕</span> Từ chối (Reject)
                          </button>
                        </>
                      ) : item.status === 'approved' ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 border border-emerald-300">
                          <span>✓</span> Đã phê duyệt
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-red-100 text-red-800 font-bold text-xs flex items-center gap-1 border border-red-300">
                          <span>✕</span> Đã từ chối
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ========================================================= */}
          {/* PHẦN 2: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN (MODULE 1 & 6.1)   */}
          {/* ========================================================= */}
          <section id="user-management-section" className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <span>👥</span> Quản lý Người dùng &amp; Phân quyền (Module 1 &amp; 6.1)
                </h2>
                <p className="text-[11px] text-gray-500">
                  Danh sách tài khoản nội bộ, ủy quyền khảo thí và quản lý trạng thái khóa/mở khóa.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên, email, MSSV..."
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs w-48 focus:border-black focus:outline-none bg-gray-50"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as 'all' | 'teacher' | 'student')}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="teacher">Giảng viên ({users.filter((u) => u.role === 'teacher').length})</option>
                  <option value="student">Sinh viên ({users.filter((u) => u.role === 'student').length})</option>
                </select>
              </div>
            </div>

            {/* Table Users */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3 px-4">Họ tên &amp; Email</th>
                    <th className="py-3 px-4">Vai trò (Role)</th>
                    <th className="py-3 px-4">Định danh (MSSV/MSG)</th>
                    <th className="py-3 px-4">Đơn vị Khoa</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-5 text-center text-sm text-gray-500">
                        Chức năng quản lý tài khoản chưa được kết nối. Không có dữ liệu mẫu được hiển thị.
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <strong className="block text-gray-900 font-bold">{user.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">{user.email}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          user.role === 'teacher'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-gray-800">
                        {user.identifier}
                      </td>

                      <td className="py-3 px-4 text-gray-600">
                        {user.department}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          user.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {user.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(user.id)}
                          className={`px-3 py-1 rounded-lg font-bold text-[10px] transition ${
                            user.status === 'active'
                              ? 'border border-red-200 text-red-600 hover:bg-red-50'
                              : 'bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          {user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* ========================================================= */}
      {/* POPUP REJECT (TỪ CHỐI KÈM FORM NHẬP LÝ DO)                */}
      {/* ========================================================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-approval-title"
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <span>⚠️</span>
                <span id="reject-approval-title">Từ chối yêu cầu phê duyệt</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-gray-400 hover:text-black font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-700">
              Bạn đang từ chối yêu cầu: <strong>{rejectingItem.title}</strong> của <strong>{rejectingItem.requestedBy}</strong> ({rejectingItem.department}).
            </p>

            <div className="space-y-1.5">
              <label htmlFor="rejection-reason-input" className="block text-xs font-bold text-gray-800">
                Lý do từ chối chính thức (Bắt buộc) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 text-xs focus:border-red-500 focus:outline-none"
                placeholder="Nhập chi tiết lý do từ chối để thông báo lại cho giảng viên bổ sung..."
              />
            </div>

            <p className="text-xs text-gray-600">
              Giảng viên sẽ nhận thông báo trong hệ thống kèm lý do từ chối.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 font-bold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="px-5 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold text-xs shadow-sm"
              >
                Xác nhận Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO NHANH */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span>🔔</span> {toastMessage}
        </div>
      )}
    </div>
  );
}
