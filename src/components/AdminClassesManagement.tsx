'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';

interface AdminClassItem {
  id: string;
  code: string;
  secondaryCode: string;
  name: string;
  teacher: string;
  department: string;
  students: number;
  maxStudents: number;
  aiEngine: string;
  usedTokens: number;
  allocatedTokens: number;
  status: 'active' | 'pending' | 'paused';
}

const initialClasses: AdminClassItem[] = [
  {
    id: 'c1',
    code: 'AIO-8892',
    secondaryCode: 'IT4409',
    name: 'KTPM-K20: Kiến trúc Phần mềm',
    teacher: 'TS. Nguyễn Văn A',
    department: 'Khoa Công nghệ Phần mềm',
    students: 48,
    maxStudents: 50,
    aiEngine: 'Whisper-v4 • Auralis LLM',
    usedTokens: 142000,
    allocatedTokens: 200000,
    status: 'active',
  },
  {
    id: 'c2',
    code: 'AIO-3419',
    secondaryCode: 'CS102',
    name: 'OOP-K21: Lập trình Hướng đối tượng C++',
    teacher: 'Th.S Nguyễn Văn B',
    department: 'Khoa Khoa học Máy tính',
    students: 53,
    maxStudents: 60,
    aiEngine: 'C++ Pronounce AI',
    usedTokens: 88000,
    allocatedTokens: 150000,
    status: 'active',
  },
  {
    id: 'c3',
    code: 'AIO-5510',
    secondaryCode: 'IT3080',
    name: 'HDH-K21: Hệ điều hành & Mạng máy tính',
    teacher: 'PGS. TS. Lê Hoàng Nam',
    department: 'Khoa Kỹ thuật Máy tính',
    students: 45,
    maxStudents: 45,
    aiEngine: 'Kernel Voiceprint v2',
    usedTokens: 110000,
    allocatedTokens: 120000,
    status: 'active',
  },
  {
    id: 'c4',
    code: 'AIO-9012',
    secondaryCode: 'IT4100',
    name: 'KTMT-K19: Thiết kế Hệ thống Nhúng & IoT',
    teacher: 'ThS. Trần Thị Mai',
    department: 'Khoa Kỹ thuật Máy tính',
    students: 42,
    maxStudents: 45,
    aiEngine: 'Hardware VQA',
    usedTokens: 64000,
    allocatedTokens: 100000,
    status: 'active',
  },
  {
    id: 'c5',
    code: 'AIO-1102',
    secondaryCode: 'IE104',
    name: 'Thiết kế Giao diện Người dùng',
    teacher: 'Th.S Nguyễn Văn B',
    department: 'Khoa Hệ thống Thông tin',
    students: 40,
    maxStudents: 45,
    aiEngine: 'Auralis UI Evaluator',
    usedTokens: 45000,
    allocatedTokens: 100000,
    status: 'pending',
  },
];

export default function AdminClassesManagement() {
  const [classes, setClasses] = useState<AdminClassItem[]>(initialClasses);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'paused'>('all');
  const [copiedCode, setCopiedCode] = useState('');

  // Modal Create Class state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTeacher, setNewTeacher] = useState('TS. Nguyễn Văn A');
  const [newDepartment, setNewDepartment] = useState('Khoa Công nghệ Phần mềm');
  const [newQuotaTokens, setNewQuotaTokens] = useState('200000');
  const [newMaxStudents, setNewMaxStudents] = useState('50');
  const [modalSuccess, setModalSuccess] = useState('');

  // Resource Allocation Modal state
  const [selectedClassForQuota, setSelectedClassForQuota] = useState<AdminClassItem | null>(null);
  const [quotaAmount, setQuotaAmount] = useState<number>(200000);
  const [quotaSuccess, setQuotaSuccess] = useState('');

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  }

  function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    const generatedCode = `AIO-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClassItem: AdminClassItem = {
      id: `c-${Date.now()}`,
      code: generatedCode,
      secondaryCode: newCourseCode.toUpperCase() || 'IT5000',
      name: newClassName,
      teacher: newTeacher,
      department: newDepartment,
      students: 0,
      maxStudents: Number(newMaxStudents) || 50,
      aiEngine: 'Whisper-v4 • Auralis LLM',
      usedTokens: 0,
      allocatedTokens: Number(newQuotaTokens) || 200000,
      status: 'active',
    };

    setClasses([newClassItem, ...classes]);
    setModalSuccess(`Đã tạo và kích hoạt lớp "${newClassName}" với mã Class Code: ${generatedCode}`);
    setTimeout(() => {
      setShowCreateModal(false);
      setModalSuccess('');
      setNewClassName('');
      setNewCourseCode('');
    }, 1500);
  }

  function handleSaveQuota(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassForQuota) return;
    setClasses((prev) =>
      prev.map((c) =>
        c.id === selectedClassForQuota.id ? { ...c, allocatedTokens: quotaAmount } : c
      )
    );
    setQuotaSuccess('Đã cập nhật hạn mức token AI thành công!');
    setTimeout(() => {
      setSelectedClassForQuota(null);
      setQuotaSuccess('');
    }, 1200);
  }

  function toggleStatus(id: string) {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === 'active' ? 'paused' : 'active';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  }

  const filtered = classes
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.secondaryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacher.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalTokensAllocated = classes.reduce((sum, c) => sum + c.allocatedTokens, 0);
  const totalTokensUsed = classes.reduce((sum, c) => sum + c.usedTokens, 0);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <AdminSidebar currentPage="classes" />

      <div className="md:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/admin" className="hover:text-black">
              Trung tâm Quản trị
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">Quản trị Lớp học &amp; Phân bổ AI</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
            >
              <span>+</span>
              <span>Tạo lớp học mới &amp; Sinh mã Code</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Hero Section */}
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                MODULE 6 • TOÀN TRƯỜNG
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Quản trị Lớp học &amp; Phân bổ Tài nguyên AI
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Giám sát phòng thi vấn đáp, cấu hình mô hình thẩm định ngữ âm AI, phân bổ hạn mức Token GPU và cấp phát mã lớp (Class Code).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-700">
                GPU Quota: {(totalTokensUsed / 1000).toFixed(0)}k / {(totalTokensAllocated / 1000).toFixed(0)}k Tokens
              </span>
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                TỔNG SỐ LỚP HỌC
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{classes.length}</span>
                <span className="text-xs text-emerald-700 font-semibold">+2 kỳ này</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Phân bổ trên 4 khoa chuyên môn</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                SINH VIÊN GHI DANH
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {classes.reduce((sum, c) => sum + c.students, 0)}
                </span>
                <span className="text-xs text-indigo-700 font-semibold">98.2% Active</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">100% tài khoản đã kích hoạt mic</p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                CỤM GPU XỬ LÝ AI
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-950">4 Cụm</span>
                <span className="text-xs text-indigo-700 font-bold">Load 42%</span>
              </div>
              <p className="mt-1 text-xs text-indigo-700">Auralis STFT V4 • Whisper Engine</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                ĐỘ TRỄ TRUNG BÌNH
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">4.2s</span>
                <span className="text-xs text-emerald-700 font-bold">SLA Đạt chuẩn</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Realtime STT + LLM Rubric Grading</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl bg-gray-200/70 p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'all' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
                }`}
              >
                Tất cả ({classes.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'active' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
                }`}
              >
                Đang hoạt động ({classes.filter((c) => c.status === 'active').length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'pending' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
                }`}
              >
                Chờ duyệt ({classes.filter((c) => c.status === 'pending').length})
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'paused' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
                }`}
              >
                Tạm dừng ({classes.filter((c) => c.status === 'paused').length})
              </button>
            </div>

            <div className="relative w-full max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã lớp, tên học phần, giảng viên..."
                className="w-full rounded-full border border-gray-300 bg-white py-2 pl-4 pr-9 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 font-semibold uppercase tracking-wider text-gray-500 text-[10px]">
                    <th className="py-3.5 pl-6 pr-4">Mã lớp &amp; Tên học phần</th>
                    <th className="py-3.5 px-4">Giảng viên phụ trách</th>
                    <th className="py-3.5 px-4">Class Code tham gia</th>
                    <th className="py-3.5 px-4">Sĩ số</th>
                    <th className="py-3.5 px-4">Tài nguyên AI Quota</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => {
                    const tokenPct = Math.round((item.usedTokens / item.allocatedTokens) * 100);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition">
                        {/* Class Info */}
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-900">
                              {item.secondaryCode}
                            </span>
                            <span className="text-[11px] text-gray-500">{item.department}</span>
                          </div>
                          <span className="mt-1 block font-bold text-gray-900 text-sm">{item.name}</span>
                        </td>

                        {/* Teacher */}
                        <td className="py-4 px-4">
                          <span className="font-semibold text-gray-900 block">{item.teacher}</span>
                          <span className="text-[11px] text-gray-500">{item.department}</span>
                        </td>

                        {/* Code */}
                        <td className="py-4 px-4 font-mono">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-800 hover:bg-gray-100 transition"
                            title="Sao chép mã lớp"
                          >
                            <span>{item.code}</span>
                            <span className="text-gray-400 text-[10px]">
                              {copiedCode === item.code ? '✓' : '⧉'}
                            </span>
                          </button>
                        </td>

                        {/* Students */}
                        <td className="py-4 px-4">
                          <span className="font-bold text-gray-900">
                            {item.students} / {item.maxStudents}
                          </span>
                          <span className="block text-[10px] text-gray-400">sinh viên</span>
                        </td>

                        {/* AI Quota */}
                        <td className="py-4 px-4 min-w-[160px]">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-mono text-gray-700">
                              {(item.usedTokens / 1000).toFixed(0)}k / {(item.allocatedTokens / 1000).toFixed(0)}k
                            </span>
                            <span className="font-bold text-gray-900">{tokenPct}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                tokenPct > 85 ? 'bg-red-500' : 'bg-black'
                              }`}
                              style={{ width: `${tokenPct}%` }}
                            />
                          </div>
                          <span className="mt-1 block text-[10px] text-gray-400 truncate">{item.aiEngine}</span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {item.status === 'active' && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                              Đang hoạt động
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                              Chờ Admin duyệt
                            </span>
                          )}
                          {item.status === 'paused' && (
                            <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                              Tạm dừng
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 pr-6 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassForQuota(item);
                              setQuotaAmount(item.allocatedTokens);
                              setQuotaSuccess('');
                            }}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Phân bổ AI
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(item.id)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                              item.status === 'active'
                                ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {item.status === 'active' ? 'Tạm khóa' : 'Kích hoạt'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL TẠO LỚP HỌC MỚI & CẤP MÃ CODE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Tạo Lớp Học Mới &amp; Cấp mã Class Code
                </h3>
                <span className="text-xs text-gray-500">Phân hệ Quản trị viên (Admin FR-2.1)</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Tên lớp học phần *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: KTPM-K20: Kiến trúc Phần mềm Phân tán"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Mã môn học *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: IT4409"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">Giảng viên phụ trách</label>
                  <select
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  >
                    <option>TS. Nguyễn Văn A (Khoa CNTT)</option>
                    <option>Th.S Nguyễn Văn B (Khoa KHMT)</option>
                    <option>PGS. TS. Lê Hoàng Nam (Khoa KTMT)</option>
                    <option>ThS. Trần Thị Mai (Khoa KTPM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Hạn mức AI Tokens</label>
                  <select
                    value={newQuotaTokens}
                    onChange={(e) => setNewQuotaTokens(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  >
                    <option value="100000">100,000 Tokens (~30h Audio)</option>
                    <option value="200000">200,000 Tokens (~60h Audio)</option>
                    <option value="500000">500,000 Tokens (~150h Audio)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">Sĩ số tối đa</label>
                  <input
                    type="number"
                    value={newMaxStudents}
                    onChange={(e) => setNewMaxStudents(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {modalSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  ✓ {modalSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Tạo lớp &amp; Kích hoạt mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PHÂN BỔ TÀI NGUYÊN AI (TOKEN ALLOCATION) */}
      {selectedClassForQuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Phân bổ Tài nguyên AI</h3>
                <span className="text-xs text-gray-500">{selectedClassForQuota.name}</span>
              </div>
              <button
                onClick={() => setSelectedClassForQuota(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Hạn mức Tokens cấp phát (Tokens Quota)
                </label>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-600">Đã dùng: {(selectedClassForQuota.usedTokens / 1000).toFixed(0)}k</span>
                  <span className="font-bold text-indigo-900">Mới: {(quotaAmount / 1000).toFixed(0)}k Tokens</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="500000"
                  step="25000"
                  value={quotaAmount}
                  onChange={(e) => setQuotaAmount(Number(e.target.value))}
                  className="mt-2 w-full accent-black cursor-pointer"
                />
              </div>

              {quotaSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                  ✓ {quotaSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedClassForQuota(null)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Lưu hạn mức AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
