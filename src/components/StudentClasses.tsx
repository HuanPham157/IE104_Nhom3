'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';
import { supabase } from '@/lib/supabase-browser';

interface EnrolledClass {
  id: string;
  code: string;
  name: string;
  teacher: string;
  teacherTitle: string;
  semester: string;
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number;
  nextDeadline: string;
  nextAssignmentTitle: string;
  status: 'active' | 'completed';
  accentColor: string;
}

const initialClasses: EnrolledClass[] = [
  {
    id: 'cs102',
    code: 'CS102',
    name: 'Lập trình Hướng đối tượng C++',
    teacher: 'TS. Nguyễn Văn A',
    teacherTitle: 'Khoa Khoa học Máy tính',
    semester: 'HK1 • 2026-2027',
    totalAssignments: 6,
    completedAssignments: 4,
    averageScore: 9.1,
    nextDeadline: '23:59 - 25/11/2024',
    nextAssignmentTitle: 'Vấn đáp giữa kỳ: Virtual DOM & OOP Design Patterns',
    status: 'active',
    accentColor: 'indigo',
  },
  {
    id: 'it4409',
    code: 'IT4409',
    name: 'Kiến trúc Phần mềm Hiện đại',
    teacher: 'ThS. Trần Thị Mai',
    teacherTitle: 'Khoa Kỹ thuật Phần mềm',
    semester: 'HK1 • 2026-2027',
    totalAssignments: 5,
    completedAssignments: 3,
    averageScore: 8.5,
    nextDeadline: '20:00 - 30/11/2024',
    nextAssignmentTitle: 'Oral Check: Microservices & Event-Driven Architecture',
    status: 'active',
    accentColor: 'emerald',
  },
  {
    id: 'it3080',
    code: 'IT3080',
    name: 'Hệ điều hành & Mạng máy tính',
    teacher: 'PGS. TS. Lê Hoàng Nam',
    teacherTitle: 'Khoa Kỹ thuật Máy tính',
    semester: 'HK1 • 2026-2027',
    totalAssignments: 4,
    completedAssignments: 4,
    averageScore: 8.8,
    nextDeadline: 'Đã hoàn thành tất cả bài thi',
    nextAssignmentTitle: 'Khảo thí cuối kỳ hoàn tất',
    status: 'completed',
    accentColor: 'blue',
  },
  {
    id: 'ie104',
    code: 'IE104',
    name: 'Thiết kế Giao diện Người dùng',
    teacher: 'ThS. Nguyễn Văn B',
    teacherTitle: 'Khoa Hệ thống Thông tin',
    semester: 'HK1 • 2026-2027',
    totalAssignments: 4,
    completedAssignments: 2,
    averageScore: 9.0,
    nextDeadline: '23:59 - 05/12/2024',
    nextAssignmentTitle: 'Bảo vệ Đồ án: Trực quan hóa Giao diện Voice AI',
    status: 'active',
    accentColor: 'violet',
  },
];

export default function StudentClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState<EnrolledClass[]>(initialClasses);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleJoinClass(e: React.FormEvent) {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    const code = classCodeInput.trim().toUpperCase();
    if (!code) {
      setJoinError('Vui lòng nhập mã lớp học.');
      return;
    }

    if (classes.some((c) => c.code === code)) {
      setJoinError('Bạn đã tham gia lớp học này rồi.');
      return;
    }

    const newClass: EnrolledClass = {
      id: code.toLowerCase(),
      code: code,
      name: code === 'AIO-8892' ? 'KTPM-K20: Kiến trúc Phần mềm Phân tán' : `Học phần khảo thí (${code})`,
      teacher: 'TS. Nguyễn Văn A',
      teacherTitle: 'Khoa Công nghệ Thông tin',
      semester: 'HK1 • 2026-2027',
      totalAssignments: 3,
      completedAssignments: 0,
      averageScore: 0,
      nextDeadline: '23:59 - 15/12/2024',
      nextAssignmentTitle: 'Bài tập 01: Giới thiệu Kiến trúc & Nhận dạng giọng nói',
      status: 'active',
      accentColor: 'indigo',
    };

    setClasses([newClass, ...classes]);
    setJoinSuccess(`Tham gia lớp học ${newClass.code} thành công!`);
    setTimeout(() => {
      setShowJoinModal(false);
      setClassCodeInput('');
      setJoinSuccess('');
    }, 1200);
  }

  const filteredClasses = classes
    .filter((c) => filterTab === 'all' || c.status === filterTab)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacher.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalClassesCount = classes.length;
  const totalPendingAssignments = classes.reduce(
    (sum, c) => sum + (c.totalAssignments - c.completedAssignments),
    0
  );
  const totalCompletedAssignments = classes.reduce((sum, c) => sum + c.completedAssignments, 0);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <StudentSidebar
        currentPage="classes"
        fullName="Sinh viên A"
        institutionalId="21520001"
        signingOut={signingOut}
        interactiveUnavailable
        onSignOut={handleSignOut}
        onUnavailable={(action) => {
          if (action === 'history') router.push('/student/history');
          if (action === 'settings') router.push('/student/profile');
        }}
      />

      <div className="md:ml-[255px]">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/student" className="hover:text-black">
              Cổng sinh viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">Lớp học của tôi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tham gia lớp bằng mã
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Hero Banner */}
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
                HỌC KỲ I • 2026-2027
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Lớp học của tôi &amp; Kế hoạch học tập
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Quản lý các học phần đang tham gia, tiến độ nộp bài vấn đáp oral và lịch nhắc hạn nộp (deadline) thời gian thực.
              </p>
            </div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 self-start rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 sm:self-auto"
            >
              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Nhập mã Class Code
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Lớp học tham gia
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{totalClassesCount}</span>
                <span className="text-xs text-gray-500">học phần</span>
              </div>
              <p className="mt-1 text-xs text-emerald-700">✓ 100% tài khoản đã đồng bộ Voiceprint</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Bài tập chưa hoàn thành
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-900">{totalPendingAssignments}</span>
                <span className="text-xs text-amber-700">bài cần nộp</span>
              </div>
              <p className="mt-1 text-xs text-amber-800">Lưu ý kiểm tra Micro trước khi vào phòng thi</p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
                Bài thi oral đã nộp
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-900">{totalCompletedAssignments}</span>
                <span className="text-xs text-indigo-700">đã chấm điểm</span>
              </div>
              <p className="mt-1 text-xs text-indigo-800">Điểm trung bình AI: 8.85 / 10.0</p>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl bg-gray-200/70 p-1">
              <button
                onClick={() => setFilterTab('all')}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  filterTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả các lớp ({classes.length})
              </button>
              <button
                onClick={() => setFilterTab('active')}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  filterTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đang diễn ra ({classes.filter((c) => c.status === 'active').length})
              </button>
              <button
                onClick={() => setFilterTab('completed')}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  filterTab === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đã hoàn tất ({classes.filter((c) => c.status === 'completed').length})
              </button>
            </div>

            <div className="relative w-full max-w-xs">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 5 5a7.5 7.5 0 0 0 11.65 11.65z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã lớp, tên môn học, giảng viên..."
                className="w-full rounded-full border border-gray-300 bg-white py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Class Cards Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredClasses.map((item) => {
              const progressPct = Math.round((item.completedAssignments / item.totalAssignments) * 100);
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-gray-900">
                          {item.code}
                        </span>
                        <span className="text-xs text-gray-500">{item.semester}</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          item.status === 'active'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-gray-200 bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.status === 'active' ? 'Đang học' : 'Đã kết thúc'}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-gray-900">{item.name}</h2>
                    <p className="mt-1 text-xs text-gray-600">
                      Giảng viên: <span className="font-medium text-gray-900">{item.teacher}</span> • {item.teacherTitle}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          Tiến độ bài tập: <b>{item.completedAssignments}/{item.totalAssignments}</b>
                        </span>
                        <span className="font-semibold text-gray-900">{progressPct}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-black transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Điểm trung bình oral:</span>
                        <span className="font-bold text-gray-900">
                          {item.averageScore > 0 ? `${item.averageScore} / 10.0` : 'Chưa có điểm'}
                        </span>
                      </div>
                    </div>

                    {/* Next assignment announcement */}
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-100 bg-[#f8f9ff] p-3 text-xs">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-semibold text-indigo-900 block">{item.nextAssignmentTitle}</span>
                        <span className="text-[11px] text-gray-500">Hạn nộp: {item.nextDeadline}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                    <Link
                      href="/student/history"
                      className="text-xs font-semibold text-gray-600 hover:text-black"
                    >
                      Xem điểm &amp; Lịch sử
                    </Link>
                    <Link
                      href="/student/exam/CS102-MID-2024-03"
                      className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                      Vào làm bài Oral
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredClasses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-4 text-base font-semibold text-gray-900">Không tìm thấy lớp học</h3>
              <p className="mt-1 text-xs text-gray-500">
                Thử kiểm tra lại từ khóa tìm kiếm hoặc tham gia lớp học mới bằng mã code do giảng viên cung cấp.
              </p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                Tham gia lớp bằng mã
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MODAL THAM GIA LỚP HỌC BẰNG MÃ */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Tham gia lớp học mới</h3>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError('');
                  setJoinSuccess('');
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinClass} className="mt-4 space-y-4">
              <p className="text-xs text-gray-600">
                Nhập mã lớp học (Class Code gồm 8 ký tự, ví dụ: <code className="rounded bg-gray-100 px-1 py-0.5 font-bold text-black">AIO-8892</code>) do giảng viên bộ môn cung cấp:
              </p>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Mã lớp học (Class Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: AIO-8892"
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-black placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {joinError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                  ✓ {joinSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Xác nhận tham gia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
