'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/TeacherSidebar';
import { supabase } from '@/lib/supabase-browser';

interface StudentRosterItem {
  id: string;
  name: string;
  studentId: string;
  voiceprintStatus: 'verified' | 'unregistered' | 'flagged';
  voiceprintConfidence: number;
  recentScore: number;
  status: 'passed' | 'pending' | 'flagged';
  submissionDate: string;
  flagReason?: string;
  avatar: string;
}

const mockStudents: StudentRosterItem[] = [
  {
    id: 'sv-01',
    name: 'Nguyễn Đăng Khoa',
    studentId: '21520012',
    voiceprintStatus: 'verified',
    voiceprintConfidence: 99.4,
    recentScore: 9.7,
    status: 'passed',
    submissionDate: '24/10 21:15',
    avatar: '👨‍🎓',
  },
  {
    id: 'sv-02',
    name: 'Lê Thị Thu Thảo',
    studentId: '21520045',
    voiceprintStatus: 'verified',
    voiceprintConfidence: 98.8,
    recentScore: 9.5,
    status: 'passed',
    submissionDate: '24/10 21:40',
    avatar: '👩‍🎓',
  },
  {
    id: 'sv-03',
    name: 'Trần Minh Đức',
    studentId: '21520188',
    voiceprintStatus: 'verified',
    voiceprintConfidence: 98.1,
    recentScore: 8.8,
    status: 'passed',
    submissionDate: '24/10 22:05',
    avatar: '🧑‍💻',
  },
  {
    id: 'sv-04',
    name: 'Vũ Đình Trọng',
    studentId: '21520330',
    voiceprintStatus: 'flagged',
    voiceprintConfidence: 61.2,
    recentScore: 6.5,
    status: 'flagged',
    submissionDate: '24/10 23:10',
    flagReason: 'Phát hiện tạp âm nền & lệch phổ âm tần số cao',
    avatar: '👨‍🎓',
  },
  {
    id: 'sv-05',
    name: 'Trần Mai Linh',
    studentId: '21520412',
    voiceprintStatus: 'verified',
    voiceprintConfidence: 97.5,
    recentScore: 8.5,
    status: 'passed',
    submissionDate: '24/10 22:30',
    avatar: '👩‍🎓',
  },
  {
    id: 'sv-06',
    name: 'Phạm Quốc Bảo',
    studentId: '21520551',
    voiceprintStatus: 'unregistered',
    voiceprintConfidence: 0,
    recentScore: 0,
    status: 'pending',
    submissionDate: 'Chưa nộp bài',
    flagReason: 'Chưa đăng ký Voiceprint sinh trắc',
    avatar: '👨‍🎓',
  },
];

export default function TeacherClassDetail({
  classCode,
  classId,
}: {
  classCode?: string;
  classId?: string;
} = {}) {
  const router = useRouter();
  const effectiveCode = classCode || classId || 'AIO-8892';
  const [students] = useState<StudentRosterItem[]>(mockStudents);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'assignments' | 'spectrogram'>('roster');
  const [filter, setFilter] = useState<'all' | 'flagged' | 'highScore' | 'pending'>('all');
  const [signingOut, setSigningOut] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(effectiveCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const filteredStudents = students
    .filter((s) => {
      if (filter === 'flagged') return s.status === 'flagged';
      if (filter === 'highScore') return s.recentScore >= 9.0;
      if (filter === 'pending') return s.status === 'pending';
      return true;
    })
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.includes(search)
    );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <TeacherSidebar
        currentPage="classes"
        signingOut={signingOut}
        onSignOut={handleSignOut}
      />

      <div className="md:ml-[255px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/teacher/classes" className="hover:text-black">
              Lớp học phụ trách
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">
              KTPM-K20: Kiến trúc Phần mềm ({effectiveCode})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher/assignments/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <span>+</span>
              <span>Tạo đề thi mới</span>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="border-b border-gray-200 bg-white px-6 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-black px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {effectiveCode}
                  </span>
                  <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                    IT4409 • Khoa Công nghệ Phần mềm
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    ● Đang giảng dạy
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  KTPM-K20: Kiến trúc Phần mềm Hiện đại
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                  Lịch học: Thứ 3, Tiết 1 - 4 • Phòng Lab A3.04 • Giảng viên: TS. Nguyễn Văn A
                </p>
              </div>

              {/* Class Code & Invite Action Box */}
              <div className="flex items-center gap-2 self-start rounded-2xl border border-indigo-200 bg-[#f8f9ff] p-3 md:self-center">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    MÃ LỚP THAM GIA (CLASS CODE)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-gray-900">{effectiveCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-indigo-900 shadow-xs border border-indigo-200 hover:bg-indigo-50 transition"
                    >
                      {copiedCode ? '✓ Đã sao chép' : 'Sao chép'}
                    </button>
                    <button
                      onClick={() => setShowQR(true)}
                      className="rounded-lg bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                    >
                      Mã QR
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Metrics Cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Sĩ số lớp</span>
                <div className="mt-1 text-2xl font-black text-gray-900">48 / 50</div>
                <span className="text-[11px] text-emerald-700 font-medium">96% ghi danh</span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">Đồng bộ Voiceprint</span>
                <div className="mt-1 text-2xl font-black text-emerald-950">98.2%</div>
                <span className="text-[11px] text-emerald-700 font-medium">47/48 sinh viên</span>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase">Điểm TB Oral</span>
                <div className="mt-1 text-2xl font-black text-indigo-950">8.35 / 10</div>
                <span className="text-[11px] text-indigo-700 font-medium">+0.4 so với tuần trước</span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <span className="text-[11px] font-semibold text-amber-800 uppercase">Cần lưu ý</span>
                <div className="mt-1 text-2xl font-black text-amber-950">02</div>
                <span className="text-[11px] text-amber-700 font-medium">Lệch phổ âm / Chưa nộp</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex border-b border-gray-200 gap-6 text-xs font-bold">
              <button
                onClick={() => setActiveTab('roster')}
                className={`pb-3 transition ${
                  activeTab === 'roster'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Danh sách Sinh viên ({students.length})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`pb-3 transition ${
                  activeTab === 'assignments'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Đợt thi &amp; Barem khảo thí (4)
              </button>
              <button
                onClick={() => setActiveTab('spectrogram')}
                className={`pb-3 transition ${
                  activeTab === 'spectrogram'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Phổ âm học &amp; Biểu đồ lớp
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Student Roster Content */}
        {activeTab === 'roster' && (
          <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
            {/* Filter Toolbar */}
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Tất cả sinh viên' },
                  { id: 'highScore', label: 'Điểm ≥ 9.0 (Top đầu)' },
                  { id: 'flagged', label: 'Cảnh báo âm học (Flagged)' },
                  { id: 'pending', label: 'Chưa nộp bài' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id as typeof filter)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filter === item.id
                        ? 'bg-black text-white shadow-xs'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo MSSV hoặc họ tên..."
                  className="w-full rounded-full border border-gray-300 bg-white py-1.5 pl-4 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-600">
                      <th className="py-3 pl-6 pr-4">Sinh viên &amp; MSSV</th>
                      <th className="py-3 px-4">Voiceprint Sinh trắc</th>
                      <th className="py-3 px-4">Bài thi gần nhất</th>
                      <th className="py-3 px-4">Điểm Oral</th>
                      <th className="py-3 px-4">Trạng thái thẩm định</th>
                      <th className="py-3 pr-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{student.avatar}</span>
                            <div>
                              <span className="font-bold text-gray-900 block">{student.name}</span>
                              <span className="font-mono text-[11px] text-gray-500">
                                MSSV: {student.studentId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {student.voiceprintStatus === 'verified' && (
                            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Khớp {student.voiceprintConfidence}%
                            </div>
                          )}
                          {student.voiceprintStatus === 'flagged' && (
                            <div className="flex items-center gap-1.5 text-red-700 font-semibold">
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                              Lệch phổ ({student.voiceprintConfidence}%)
                            </div>
                          )}
                          {student.voiceprintStatus === 'unregistered' && (
                            <span className="text-gray-400 font-medium">Chưa có mẫu giọng</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-gray-600">
                          <span>{student.submissionDate}</span>
                          {student.flagReason && (
                            <p className="text-[10px] text-red-600">{student.flagReason}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {student.recentScore > 0 ? (
                            <span className="font-mono text-sm font-black text-gray-900">
                              {student.recentScore}
                              <span className="text-[10px] text-gray-400 font-normal"> / 10</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {student.status === 'passed' && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Đã ký số duyệt
                            </span>
                          )}
                          {student.status === 'flagged' && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              Cảnh báo AI
                            </span>
                          )}
                          {student.status === 'pending' && (
                            <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                              Chờ nộp
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 pr-6 text-right space-x-2">
                          <Link
                            href="/teacher/evaluations/CS102-MID-2024-03"
                            className="inline-flex rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                          >
                            Xem bài &amp; Chấm
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* Tab 2: Assignments */}
        {activeTab === 'assignments' && (
          <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                      ĐỢT THI SỐ 03
                    </span>
                    <h3 className="mt-1.5 text-base font-bold text-gray-900">
                      Kiểm tra Vấn đáp Giữa kỳ: Kiến trúc Web Frontend &amp; State Management
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Hạn nộp: 23:59 - 25/11/2024 • Thời gian trả lời: 90s/câu • Số câu: 2 câu hỏi
                    </p>
                  </div>
                  <Link
                    href="/teacher/assignments/create"
                    className="rounded-full border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Chỉnh sửa Barem &amp; Từ khóa
                  </Link>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Tab 3: Spectrogram */}
        {activeTab === 'spectrogram' && (
          <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
              <h3 className="text-base font-bold text-gray-900">Phổ âm thanh toàn lớp (STFT Spectrogram Matrix)</h3>
              <p className="mt-1 text-xs text-gray-500">
                Ma trận tần số âm học 128-band FFT thể hiện độ đồng nhất phát âm thuật ngữ kỹ thuật của 48 sinh viên.
              </p>
              <div className="mt-6 flex h-36 items-end justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-950 p-4">
                {Array.from({ length: 48 }, (_, idx) => (
                  <span
                    key={idx}
                    className="w-2 rounded-t bg-gradient-to-t from-indigo-500 via-purple-400 to-emerald-400"
                    style={{ height: `${20 + ((idx * 23) % 80)}%` }}
                  />
                ))}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Mã QR Tham gia Lớp học</h3>
            <p className="mt-1 text-xs text-gray-500">
              Sinh viên quét mã này để tham gia trực tiếp lớp {effectiveCode}
            </p>
            <div className="my-5 flex justify-center">
              <div className="flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-2 font-mono text-xs">
                [ QR Code: aioralcheck.edu.vn/join/{effectiveCode} ]
              </div>
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="w-full rounded-full bg-black py-2 text-xs font-semibold text-white hover:bg-gray-800"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
