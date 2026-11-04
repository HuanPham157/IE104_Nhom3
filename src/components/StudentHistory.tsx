'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';
import { supabase } from '@/lib/supabase-browser';

interface PastExam {
  id: string;
  code: string;
  title: string;
  course: string;
  date: string;
  duration: string;
  fileSize: string;
  aiScore: number;
  teacherScoreBonus: number;
  finalScore: number;
  status: 'graded' | 'pending' | 'appealed';
  feedback: string;
  retakesUsed: number;
  maxRetakes: number;
}

const mockExams: PastExam[] = [
  {
    id: 'exam-w04',
    code: 'EXAM-CS102-W04',
    title: 'Tuần 4: Giải thuật QuickSort & Phân tích Đệ quy chia để trị',
    course: 'CS102: Lập trình Hướng đối tượng',
    date: '24/10/2024',
    duration: '01:45',
    fileSize: '2.1 MB WebM',
    aiScore: 8.5,
    teacherScoreBonus: 0.5,
    finalScore: 9.0,
    status: 'graded',
    feedback: 'Phát âm chuẩn xác thuật ngữ Partition, Pivot element. Nêu rõ độ phức tạp O(n log n) trung bình và trường hợp xấu O(n^2). Giọng nói to rõ, tự tin.',
    retakesUsed: 2,
    maxRetakes: 3,
  },
  {
    id: 'exam-w03',
    code: 'EXAM-CS102-W03',
    title: 'Tuần 3: Phân tích Cây nhị phân tìm kiếm (BST) & Cân bằng AVL',
    course: 'CS102: Lập trình Hướng đối tượng',
    date: '17/10/2024',
    duration: '01:15',
    fileSize: '1.8 MB WebM',
    aiScore: 8.5,
    teacherScoreBonus: 0.0,
    finalScore: 8.5,
    status: 'graded',
    feedback: 'Nêu rõ phép xoay trái/phải trên cây AVL. Phát âm thuật ngữ tiếng Anh chính xác.',
    retakesUsed: 1,
    maxRetakes: 3,
  },
  {
    id: 'exam-w02',
    code: 'EXAM-CS102-W02',
    title: 'Tuần 2: So sánh Ngăn xếp (Stack) vs Hàng đợi (Queue)',
    course: 'CS102: Lập trình Hướng đối tượng',
    date: '10/10/2024',
    duration: '01:30',
    fileSize: '1.9 MB WebM',
    aiScore: 9.2,
    teacherScoreBonus: 0.3,
    finalScore: 9.5,
    status: 'graded',
    feedback: 'So sánh LIFO vs FIFO trực quan bằng ví dụ thực tế. Giọng điệu rành mạch, tốc độ ổn định 140 WPM.',
    retakesUsed: 1,
    maxRetakes: 3,
  },
  {
    id: 'exam-w01',
    code: 'EXAM-CS102-W01',
    title: 'Tuần 1: Giới thiệu Kiến trúc Hướng đối tượng & Tính Đóng gói (Encapsulation)',
    course: 'CS102: Lập trình Hướng đối tượng',
    date: '03/10/2024',
    duration: '01:20',
    fileSize: '1.6 MB WebM',
    aiScore: 8.8,
    teacherScoreBonus: 0.0,
    finalScore: 8.8,
    status: 'graded',
    feedback: 'Giải thích tốt Access Specifiers (private, protected, public). Cần nói lưu loát hơn ở đoạn ví dụ Getter/Setter.',
    retakesUsed: 2,
    maxRetakes: 3,
  },
];

const mockLeaderboard = [
  { rank: 1, name: 'Nguyễn Đăng Khoa', score: 9.7, trend: '+0', avatar: '👨‍🎓', isMe: false },
  { rank: 2, name: 'Lê Thị Thu Thảo', score: 9.5, trend: '+1', avatar: '👩‍🎓', isMe: false },
  { rank: 3, name: 'Sinh viên A (Bạn)', score: 9.2, trend: '+2', avatar: '🧑‍💻', isMe: true },
  { rank: 4, name: 'Phạm Minh Đức', score: 8.9, trend: '-1', avatar: '👨‍🎓', isMe: false },
  { rank: 5, name: 'Trần Mai Linh', score: 8.7, trend: '+0', avatar: '👩‍🎓', isMe: false },
  { rank: 6, name: 'Vũ Đình Trọng', score: 8.5, trend: '+2', avatar: '👨‍🎓', isMe: false },
];

export default function StudentHistory() {
  const router = useRouter();
  const [exams, setExams] = useState<PastExam[]>(mockExams);
  const [selectedExam, setSelectedExam] = useState<PastExam>(mockExams[0]);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealCategory, setAppealCategory] = useState('ai_concept');
  const [timeStart, setTimeStart] = useState('00:42');
  const [timeEnd, setTimeEnd] = useState('01:15');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleOpenAppeal(exam: PastExam) {
    setSelectedExam(exam);
    setAppealSubmitted(false);
    setAppealReason('');
    setShowAppealModal(true);
  }

  function handleSubmitAppeal(e: React.FormEvent) {
    e.preventDefault();
    if (!appealReason.trim()) {
      alert('Vui lòng nhập lý do và căn cứ phúc khảo.');
      return;
    }

    setAppealSubmitted(true);
    setExams((prev) =>
      prev.map((item) => (item.id === selectedExam.id ? { ...item, status: 'appealed' } : item))
    );

    setTimeout(() => {
      setShowAppealModal(false);
      setAppealSubmitted(false);
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <StudentSidebar
        currentPage="overview"
        fullName="Sinh viên A"
        institutionalId="21520001"
        signingOut={signingOut}
        interactiveUnavailable
        onSignOut={handleSignOut}
        onUnavailable={(action) => {
          if (action === 'classes') router.push('/student/classes');
          if (action === 'settings') router.push('/student/profile');
        }}
      />

      <div className="md:ml-[255px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/student" className="hover:text-black">
              Cổng sinh viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">Lịch sử làm bài &amp; Bảng xếp hạng</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/classes"
              className="rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Xem lớp học
            </Link>
            <Link
              href="/student/exam/CS102-MID-2024-03"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
            >
              Phòng thi vấn đáp
            </Link>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Breadcrumb & Title */}
          <div className="mb-6 border-b border-gray-200 pb-5">
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-800">
              CS102 • LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Lịch sử làm bài thi Oral &amp; Bảng xếp hạng lớp
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Theo dõi chi tiết các lượt thi vấn đáp giọng nói, điểm số AI &amp; Giảng viên chấm, nhận xét ngữ âm học và nộp đơn phúc khảo trực tuyến.
            </p>
          </div>

          {/* Main 2-column Layout */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: Exam History List (8 of 12 cols) */}
            <div className="space-y-6 lg:col-span-8">
              {/* Highlighted Banner / Next upcoming exam */}
              <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-indigo-200 bg-[#f4f6ff] p-5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        Tuần 5: Đồ thị Dijkstra &amp; Cây khung nhỏ nhất (Prim)
                      </h3>
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                        HẠN CHÓT: 23:59 NGÀY MAI
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Yêu cầu: Giải thích thuật toán tìm đường đi ngắn nhất sử dụng Min-Heap (Tối đa 02:00 phút âm).
                    </p>
                  </div>
                </div>
                <Link
                  href="/student/exam/CS102-MID-2024-03"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  Vào phòng thu âm ngay
                </Link>
              </div>

              {/* Past Submissions Header */}
              <div className="flex items-center justify-between pt-2">
                <h2 className="text-lg font-bold text-gray-900">Các bài thi vấn đáp đã hoàn thành</h2>
                <span className="text-xs text-gray-500">Đã nộp 4/5 bài thi</span>
              </div>

              {/* Exam Cards Stack */}
              <div className="space-y-4">
                {exams.map((exam, idx) => (
                  <div
                    key={exam.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:border-gray-300 ${
                      idx === 0 ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-800">
                            {exam.code}
                          </span>
                          <span className="text-xs text-gray-500">• {exam.date}</span>
                          <span className="text-xs text-gray-500">• Thời lượng: {exam.duration}</span>
                          <span className="text-xs text-gray-500">• Lần thu: {exam.retakesUsed}/{exam.maxRetakes}</span>
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-gray-900">{exam.title}</h3>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-2">
                        {exam.status === 'appealed' ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                            ĐANG PHÚC KHẢO
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                            ĐÃ CÓ ĐIỂM
                          </span>
                        )}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1 text-center">
                          <span className="text-2xl font-black text-gray-900">{exam.finalScore}</span>
                          <span className="text-xs text-gray-500">/10</span>
                        </div>
                      </div>
                    </div>

                    {/* Audio Player and Score Decomposition */}
                    <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 md:grid-cols-12">
                      <div className="space-y-3 md:col-span-7">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            Bản ghi âm vấn đáp
                          </span>
                          <span className="font-mono text-[11px]">{exam.fileSize}</span>
                        </div>

                        {/* Visual audio player */}
                        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
                          <button
                            type="button"
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:scale-105 transition"
                          >
                            {isPlayingAudio ? '⏸' : '▶'}
                          </button>
                          <div className="flex flex-1 items-center gap-1 h-6 px-1">
                            {[4, 8, 12, 6, 14, 10, 16, 8, 12, 14, 6, 10, 8, 12, 4, 8, 14, 10, 6, 4].map((h, i) => (
                              <span
                                key={i}
                                className={`w-1 rounded-full transition-all ${
                                  i < 8 ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                                style={{ height: `${h}px` }}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-[11px] text-gray-500">00:42 / {exam.duration}</span>
                        </div>

                        {/* Breakdown */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded bg-white px-2 py-1 border border-gray-200 text-gray-700">
                            AI chấm: <b>{exam.aiScore}</b>
                          </span>
                          <span className="text-gray-400 font-bold">+</span>
                          <span className="rounded bg-indigo-50 px-2 py-1 border border-indigo-200 text-indigo-800">
                            Giảng viên cộng: <b>+{exam.teacherScoreBonus}</b>
                          </span>
                        </div>
                      </div>

                      {/* Right AI feedback */}
                      <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-3.5 md:col-span-5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                            ✦ NHẬN XÉT CỦA HỆ THỐNG
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                            {exam.feedback}
                          </p>
                        </div>
                        <span className="mt-2 text-[10px] text-gray-400">
                          Thẩm định bởi Auralis Acoustic LLM v2.4
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alert(`Xem chi tiết Rubric bài thi: ${exam.title}`)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                          Xem Rubric &amp; Transcript
                        </button>
                        <button
                          type="button"
                          onClick={() => alert('Đang tải file audio ghi âm của bạn...')}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Tải audio bài làm
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAppeal(exam)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 transition"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        Yêu cầu phúc khảo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Class Leaderboard & Multi-Dimensional Radar (4 of 12 cols) */}
            <div className="space-y-6 lg:col-span-4">
              {/* Leaderboard Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      VINH DANH HỌC TẬP
                    </span>
                    <h3 className="text-base font-bold text-gray-900">Bảng xếp hạng CS102</h3>
                  </div>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                    48 Sinh viên
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {mockLeaderboard.map((item) => (
                    <div
                      key={item.rank}
                      className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition ${
                        item.isMe
                          ? 'border border-indigo-200 bg-indigo-50/70 font-semibold text-indigo-900'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            item.rank === 1
                              ? 'bg-amber-100 text-amber-800'
                              : item.rank === 2
                              ? 'bg-gray-200 text-gray-700'
                              : item.rank === 3
                              ? 'bg-amber-50 text-amber-900 border border-amber-300'
                              : 'text-gray-400'
                          }`}
                        >
                          {item.rank}
                        </span>
                        <span>{item.avatar}</span>
                        <span className="truncate max-w-[130px] font-medium">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{item.score}</span>
                        <span
                          className={`text-[10px] font-mono ${
                            item.trend.startsWith('+') && item.trend !== '+0'
                              ? 'text-emerald-700'
                              : 'text-gray-400'
                          }`}
                        >
                          {item.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-indigo-100 bg-[#f8f9ff] p-3 text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-indigo-900 block mb-0.5">✦ Mẹo leo hạng:</span>
                  Nâng cao điểm mạch lạc bằng cách thêm từ nối chuyển tiếp (<em>&quot;Mặt khác&quot;, &quot;Hơn nữa&quot;, &quot;Cụ thể là&quot;</em>) trong bài thi Tuần 5 để bứt phá lên <b>Top #02</b>.
                </div>
              </div>

              {/* Multi-Dimensional Competency Radar Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      PHÂN TÍCH ĐA CHIỀU AI
                    </span>
                    <h3 className="text-base font-bold text-gray-900">Năng lực Khảo thí Vấn đáp</h3>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    AURALIS V2.4
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">Nắm bắt khái niệm (Concept Mastery)</span>
                      <span className="font-bold text-gray-900">92%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-black" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">Từ vựng chuyên ngành (Terminology)</span>
                      <span className="font-bold text-indigo-600">95%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-indigo-600" style={{ width: '95%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">Tốc độ &amp; Ngữ điệu (Fluency &amp; Pitch)</span>
                      <span className="font-bold text-gray-900">88%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-black" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">Độ mạch lạc &amp; Cấu trúc (Coherence)</span>
                      <span className="font-bold text-gray-900">86%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-black" style={{ width: '86%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* GRADE APPEAL MODAL (MODAL PHÚC KHẢO) */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 font-bold">
                  ⚖
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">Đơn yêu cầu phúc khảo bài thi nói</h2>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      HỢP LỆ (TRONG 48H)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{selectedExam.title}</p>
                </div>
              </div>

              <button
                onClick={() => setShowAppealModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitAppeal} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Score Summary Box */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    KẾT QUẢ HIỆN TẠI
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900">{selectedExam.finalScore}</span>
                    <span className="text-xs text-gray-500">/ 10.0</span>
                    <span className="text-xs font-mono text-gray-600 ml-2">
                      (AI chấm: <b>{selectedExam.aiScore}</b> | Giảng viên: <b>+{selectedExam.teacherScoreBonus}</b>)
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-right text-xs">
                  <span className="text-emerald-700 font-bold block">✓ Còn 34 giờ 18 phút</span>
                  <span className="text-gray-400 text-[10px]">Hạn nộp phúc khảo bài thi này</span>
                </div>
              </div>

              {/* Appeal Category Radio */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2">
                  1. Hạng mục đề nghị xem xét lại <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { id: 'ai_concept', title: 'Nhận diện & Khái niệm thuật toán (AI)' },
                    { id: 'phonetic', title: 'Âm vị học / Phát âm thuật ngữ sai' },
                    { id: 'teacher_score', title: 'Điểm đánh giá thẩm định của Giảng viên' },
                    { id: 'audio_glitch', title: 'Sự cố nhiễu mic / Băng thông ghi âm' },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs cursor-pointer transition ${
                        appealCategory === cat.id
                          ? 'border-black bg-gray-50 font-semibold text-black'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="appeal_cat"
                        value={cat.id}
                        checked={appealCategory === cat.id}
                        onChange={(e) => setAppealCategory(e.target.value)}
                        className="accent-black"
                      />
                      <span>{cat.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2">
                  2. Phân đoạn audio cần nghe lại (Timestamp)
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <span className="text-xs text-gray-600">Từ</span>
                  <input
                    type="text"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-center font-mono text-xs focus:border-black focus:outline-none"
                  />
                  <span className="text-xs text-gray-600">đến</span>
                  <input
                    type="text"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-center font-mono text-xs focus:border-black focus:outline-none"
                  />
                  <span className="text-[11px] text-gray-500 ml-auto">Tổng thời lượng bài làm: {selectedExam.duration}</span>
                </div>
              </div>

              {/* Detailed Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  3. Lý do &amp; Căn cứ phúc khảo chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Trình bày rõ luận điểm vì sao câu trả lời của bạn đúng theo Rubric, trích dẫn tài liệu giáo trình hoặc chỉ ra đoạn âm thanh AI nhận diện chưa chính xác..."
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  4. Đính kèm tài liệu minh chứng (Tùy chọn)
                </label>
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold text-black">Tải lên tệp tài liệu</span> (PDF, PNG, JPG, tối đa 10MB)
                    <p className="text-[10px] text-gray-400 mt-0.5">Ảnh chụp slide bài giảng hoặc bài mẫu đối chiếu</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Alert */}
              {appealSubmitted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  ✓ Đơn phúc khảo đã được chuyển đến Giảng viên bộ môn {selectedExam.course}. Bạn sẽ nhận thông báo khi có kết quả thẩm định.
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Gửi đơn phúc khảo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
