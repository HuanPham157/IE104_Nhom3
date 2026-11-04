'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';

interface ApprovalItem {
  id: string;
  type: 'class' | 'academic_rank';
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

const initialApprovals: ApprovalItem[] = [
  {
    id: 'req-1',
    type: 'academic_rank',
    title: 'Cập nhật Học hàm / Học vị Giảng viên',
    requestedBy: 'ThS. Nguyễn Văn B',
    department: 'Khoa Khoa học Máy tính',
    date: 'Hôm nay, 08:30',
    details: 'Đề xuất nâng cấp học vị từ Thạc sĩ (Th.S) lên Tiến sĩ (TS.) theo Quyết định công nhận số 104/QĐ-ĐHQG.',
    status: 'pending',
  },
  {
    id: 'req-2',
    type: 'class',
    title: 'Đăng ký Mở Lớp học Khảo thí mới: KTPM-K20',
    requestedBy: 'TS. Nguyễn Văn A',
    department: 'Khoa Công nghệ Phần mềm',
    date: 'Hôm qua, 15:45',
    details: 'Môn: Kiến trúc Phần mềm Nâng cao • Sĩ số dự kiến: 45 SV • Thời lượng: 15 tuần • Chuẩn Barem AI: SE-ARCH-V2.',
    status: 'pending',
  },
  {
    id: 'req-3',
    type: 'class',
    title: 'Đăng ký Mở Lớp học Khảo thí mới: CS102',
    requestedBy: 'TS. Lê Hoàng C',
    department: 'Khoa Khoa học Máy tính',
    date: '28/10/2024',
    details: 'Môn: Lập trình C++ Nâng cao & Cấu trúc Dữ liệu • Sĩ số dự kiến: 56 SV • Khảo thí trực tuyến giữa kỳ.',
    status: 'pending',
  },
];

const initialUsers: UserAccount[] = [
  {
    id: 'u-1',
    name: 'TS. Nguyễn Văn A',
    email: 'nguyenvana@uit.edu.vn',
    role: 'teacher',
    identifier: 'GV-10204',
    department: 'Khoa Công nghệ Phần mềm',
    status: 'active',
    createdDate: '15/09/2024',
  },
  {
    id: 'u-2',
    name: 'ThS. Trần Mai Lan',
    email: 'mailan.t@uit.edu.vn',
    role: 'teacher',
    identifier: 'GV-10512',
    department: 'Khoa Hệ thống Thông tin',
    status: 'active',
    createdDate: '18/09/2024',
  },
  {
    id: 'u-3',
    name: 'Lê Thị Bình (User A)',
    email: 'usera@gm.uit.edu.vn',
    role: 'student',
    identifier: '21520001',
    department: 'Khoa Khoa học Máy tính',
    status: 'active',
    createdDate: '12/10/2024',
  },
  {
    id: 'u-4',
    name: 'Trần Minh Đức',
    email: 'duc.tm@sv.edu.vn',
    role: 'student',
    identifier: '20210345',
    department: 'Khoa Kỹ thuật Phần mềm',
    status: 'active',
    createdDate: '14/10/2024',
  },
  {
    id: 'u-5',
    name: 'Phạm Quốc Cường',
    email: 'cuong.pq@sv.edu.vn',
    role: 'student',
    identifier: '20215542',
    department: 'Khoa Khoa học Máy tính',
    status: 'suspended',
    createdDate: '20/10/2024',
  },
];

export default function AdminDashboard() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'teacher' | 'student'>('all');

  // State Modal Từ chối
  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Hàm Phê duyệt
  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
    showToast('✅ Đã phê duyệt yêu cầu thành công!');
  };

  // Mở modal từ chối
  const openRejectModal = (item: ApprovalItem) => {
    setRejectingItem(item);
    setRejectReason(
      item.type === 'class'
        ? 'Vui lòng bổ sung đề cương chi tiết học phần và thời khóa biểu phòng Lab theo chuẩn phòng Đào tạo.'
        : 'Văn bằng Tiến sĩ chưa có bản scan công chứng rõ nét. Vui lòng nộp lại hồ sơ.'
    );
  };

  // Xác nhận từ chối
  const confirmReject = () => {
    if (!rejectingItem) return;
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === rejectingItem.id
          ? { ...item, status: 'rejected', rejectionReason: rejectReason }
          : item
      )
    );
    setRejectingItem(null);
    showToast('⚠️ Đã từ chối yêu cầu và gửi phản hồi lý do cho người dùng.');
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
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] font-sans antialiased text-xs flex">
      {/* Sidebar Admin */}
      <AdminSidebar currentPage="overview" />

      {/* Main Workspace */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="font-semibold text-gray-900">AIOralCheck</span>
            <span>/</span>
            <span>Hệ thống Quản trị Trung tâm</span>
            <span>/</span>
            <strong className="text-black font-bold">Giám sát &amp; Phân quyền</strong>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SLA AI Inference: 4.2s (Đạt chuẩn)</span>
            </div>

            <Link
              href="/teacher"
              className="px-3.5 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-100 font-bold text-[11px] text-gray-800 transition"
            >
              Chuyển vai trò ⇄
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-5 lg:p-7 max-w-7xl w-full mx-auto space-y-6">
          {/* HEADER TITLE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-black text-[#111827] tracking-tight">
                Giám sát Hệ thống &amp; Quản lý Phân quyền
              </h1>
              <p className="text-gray-500 text-xs mt-1">
                Quản lý định danh học viện, phê duyệt mở lớp học phần và giám sát tài nguyên suy luận AI âm thanh.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => showToast('Đang kết xuất tệp nhật ký Audit Log...')}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <span>📥</span> Xuất báo cáo Audit
              </button>
            </div>
          </div>

          {/* KPI TELEMETRY GRID (4 CARDS) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng tài khoản</span>
              <div className="mt-2 flex items-baseline gap-2">
                <strong className="text-3xl font-black text-gray-900">1,420</strong>
                <span className="text-gray-500 font-medium">user</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px] text-gray-600">
                <span>48 Giảng viên</span>
                <span>•</span>
                <span>1,372 Sinh viên</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lượt nộp bài tháng này</span>
              <div className="mt-2 flex items-baseline gap-2">
                <strong className="text-3xl font-black text-gray-900">8,650</strong>
                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">98.4%</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-emerald-700 font-semibold">
                ✓ Hoàn thành đúng hạn khảo thí
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tiêu thụ Token AI</span>
              <div className="mt-2 flex items-baseline gap-2">
                <strong className="text-3xl font-black text-indigo-700">14.8M</strong>
                <span className="text-gray-500 font-medium">tokens</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px] text-gray-600 font-mono">
                <span>Whisper: 340h</span>
                <span>•</span>
                <span>LLM: 12.2M</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Độ trễ AI trung bình</span>
              <div className="mt-2 flex items-baseline gap-2">
                <strong className="text-3xl font-black text-emerald-600">4.2s</strong>
                <span className="text-gray-500 font-medium">/ lượt</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-emerald-700 font-semibold">
                ✓ Đạt SLA phòng đào tạo (&lt; 15s)
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* PHẦN 1: DANH SÁCH DUYỆT LỚP HỌC & HỌC VỊ (QUAN TRỌNG NHẤT) */}
          {/* ========================================================= */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
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
                    Phê duyệt tạo lớp học phần mới và xét duyệt cập nhật học hàm/học vị của Giảng viên.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                {approvals.filter((a) => a.status === 'pending').length} yêu cầu đang chờ
              </span>
            </div>

            <div className="space-y-3">
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
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'class' ? 'MỞ LỚP MỚI' : 'HỌC HÀM / HỌC VỊ'}
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
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
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
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <span>⚠️</span>
                <span>Từ chối yêu cầu phê duyệt</span>
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

            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-0"
              />
              <span>Gửi thông báo email và hệ thống kèm lý do cho Giảng viên</span>
            </label>

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
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span>🔔</span> {toastMessage}
        </div>
      )}
    </div>
  );
}
