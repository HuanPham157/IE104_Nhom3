'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';
import { supabase } from '@/lib/supabase-browser';

interface AssignmentItem {
  id: string;
  code: string;
  title: string;
  deadline: string;
  questionCount: number;
  timePerQuestion: string;
  maxRetakes: number;
  status: 'pending' | 'completed';
  score?: number;
  aiScore?: number;
  teacherBonus?: number;
  submittedAt?: string;
  feedback?: string;
  examRouteId: string;
}

interface ClassCourseInfo {
  id: string;
  code: string;
  name: string;
  teacher: string;
  teacherTitle: string;
  faculty: string;
  semester: string;
  credits: number;
  classCode: string;
  schedule: string;
  room: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  averageScore: number;
  assignments: AssignmentItem[];
}

const mockClassData: Record<string, ClassCourseInfo> = {
  cs102: {
    id: 'cs102',
    code: 'CS102',
    name: 'Lập trình Hướng đối tượng C++',
    teacher: 'TS. Nguyễn Văn A',
    teacherTitle: 'Khoa Khoa học Máy tính',
    faculty: 'Khoa Khoa học Máy tính • UIT',
    semester: 'Học kỳ 1 • 2026-2027',
    credits: 4,
    classCode: 'AIO-8892',
    schedule: 'Thứ Tư • Tiết 3 - 5 (09:00 - 11:30)',
    room: 'Phòng B2.14 • Giảng đường B',
    totalAssignments: 6,
    completedAssignments: 4,
    pendingAssignments: 2,
    averageScore: 9.1,
    assignments: [
      {
        id: 'asg-05',
        code: 'ASG-CS102-05',
        title: 'Kiểm tra Vấn đáp Giữa kỳ: Kiến trúc Web Frontend & Cấu trúc Dữ liệu OOP',
        deadline: '23:59 - 25/11/2024',
        questionCount: 3,
        timePerQuestion: '90 giây/câu',
        maxRetakes: 3,
        status: 'pending',
        examRouteId: 'CS102-MID-2024-03',
      },
      {
        id: 'asg-06',
        code: 'ASG-CS102-06',
        title: 'Oral Check: Design Patterns (Singleton, Factory, Observer in C++)',
        deadline: '20:00 - 05/12/2024',
        questionCount: 2,
        timePerQuestion: '120 giây/câu',
        maxRetakes: 2,
        status: 'pending',
        examRouteId: 'CS102-ASG-06',
      },
      {
        id: 'asg-04',
        code: 'ASG-CS102-04',
        title: 'Tuần 4: Giải thuật QuickSort & Phân tích Đệ quy chia để trị',
        deadline: '24/10/2024',
        questionCount: 2,
        timePerQuestion: '90 giây/câu',
        maxRetakes: 3,
        status: 'completed',
        score: 9.0,
        aiScore: 8.5,
        teacherBonus: 0.5,
        submittedAt: '24/10/2024 21:15',
        feedback: 'Phát âm chuẩn xác thuật ngữ Partition, Pivot element. Nêu rõ độ phức tạp O(n log n). Giọng nói to rõ, tự tin.',
        examRouteId: 'CS102-MID-2024-03',
      },
      {
        id: 'asg-03',
        code: 'ASG-CS102-03',
        title: 'Tuần 3: Phân tích Cây nhị phân tìm kiếm (BST) & Cân bằng AVL',
        deadline: '17/10/2024',
        questionCount: 2,
        timePerQuestion: '90 giây/câu',
        maxRetakes: 3,
        status: 'completed',
        score: 8.5,
        aiScore: 8.5,
        teacherBonus: 0.0,
        submittedAt: '17/10/2024 20:45',
        feedback: 'Nêu rõ phép xoay trái/phải trên cây AVL. Phát âm thuật ngữ tiếng Anh chính xác.',
        examRouteId: 'CS102-ASG-03',
      },
      {
        id: 'asg-02',
        code: 'ASG-CS102-02',
        title: 'Tuần 2: So sánh Ngăn xếp (Stack) vs Hàng đợi (Queue)',
        deadline: '10/10/2024',
        questionCount: 2,
        timePerQuestion: '60 giây/câu',
        maxRetakes: 3,
        status: 'completed',
        score: 9.5,
        aiScore: 9.2,
        teacherBonus: 0.3,
        submittedAt: '10/10/2024 22:10',
        feedback: 'So sánh LIFO vs FIFO trực quan bằng ví dụ thực tế. Giọng điệu rành mạch, tốc độ ổn định 140 WPM.',
        examRouteId: 'CS102-ASG-02',
      },
      {
        id: 'asg-01',
        code: 'ASG-CS102-01',
        title: 'Tuần 1: Giới thiệu Kiến trúc Hướng đối tượng & Tính Đóng gói (Encapsulation)',
        deadline: '03/10/2024',
        questionCount: 2,
        timePerQuestion: '60 giây/câu',
        maxRetakes: 3,
        status: 'completed',
        score: 8.8,
        aiScore: 8.8,
        teacherBonus: 0.0,
        submittedAt: '03/10/2024 19:30',
        feedback: 'Giải thích tốt Access Specifiers (private, protected, public). Cần nói lưu loát hơn ở đoạn ví dụ Getter/Setter.',
        examRouteId: 'CS102-ASG-01',
      },
    ],
  },
  ie104: {
    id: 'ie104',
    code: 'IE104',
    name: 'Thiết kế Giao diện Người dùng',
    teacher: 'ThS. Nguyễn Văn B',
    teacherTitle: 'Khoa Hệ thống Thông tin',
    faculty: 'Khoa Hệ thống Thông tin • UIT',
    semester: 'Học kỳ 1 • 2026-2027',
    credits: 3,
    classCode: 'IE104-N21',
    schedule: 'Thứ Sáu • Tiết 1 - 3 (07:30 - 10:00)',
    room: 'Phòng A3.02 • Giảng đường A',
    totalAssignments: 4,
    completedAssignments: 2,
    pendingAssignments: 2,
    averageScore: 9.0,
    assignments: [
      {
        id: 'ie-03',
        code: 'ASG-IE104-03',
        title: 'Kiểm tra Vấn đáp Giữa kỳ: Nguyên lý Thiết kế & Voice AI UX',
        deadline: '23:59 - 28/11/2024',
        questionCount: 3,
        timePerQuestion: '90 giây/câu',
        maxRetakes: 3,
        status: 'pending',
        examRouteId: 'CS102-MID-2024-03',
      },
      {
        id: 'ie-04',
        code: 'ASG-IE104-04',
        title: 'Bảo vệ Đồ án Cuối kỳ: Kiến trúc Giao diện Âm học Đa phương thức',
        deadline: '23:59 - 15/12/2024',
        questionCount: 4,
        timePerQuestion: '120 giây/câu',
        maxRetakes: 2,
        status: 'pending',
        examRouteId: 'IE104-FINAL',
      },
      {
        id: 'ie-02',
        code: 'ASG-IE104-02',
        title: 'Thực hành 2: Heuristic Evaluation & Thiết kế Accessibility WCAG 2.1',
        deadline: '20/10/2024',
        questionCount: 2,
        timePerQuestion: '90 giây/câu',
        maxRetakes: 3,
        status: 'completed',
        score: 9.2,
        aiScore: 9.0,
        teacherBonus: 0.2,
        submittedAt: '20/10/2024 21:00',
        feedback: 'Phân tích rất tốt 10 nguyên tắc Nielsen, liên hệ chuẩn xác ví dụ tương phản màu sắc.',
        examRouteId: 'IE104-ASG-02',
      },
      {
        id: 'ie-01',
        code: 'ASG-IE104-01',
        title: 'Thực hành 1: Nguyên lý thị giác Gestalt trong thiết kế UI',
        deadline: '06/10/2024',
        questionCount: 2,
        timePerQuestion: '60 giây/câu',
        maxRetakes: 3,
        status: 'completed',
        score: 8.8,
        aiScore: 8.8,
        teacherBonus: 0.0,
        submittedAt: '06/10/2024 18:45',
        feedback: 'Nắm chắc Proximity, Similarity. Giọng điệu rõ ràng, không bị ngắc ngứ.',
        examRouteId: 'IE104-ASG-01',
      },
    ],
  },
};

export default function StudentClassDetail({ classId }: { classId: string }) {
  const router = useRouter();
  const normalizedId = classId?.toLowerCase() || 'cs102';
  const course = mockClassData[normalizedId] || mockClassData['cs102'];

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [signingOut, setSigningOut] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(course.classCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const filteredAssignments = course.assignments.filter((asg) => {
    if (activeTab === 'pending') return asg.status === 'pending';
    if (activeTab === 'completed') return asg.status === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <StudentSidebar
        currentPage="classes"
        fullName="Sinh viên A"
        institutionalId="21520001"
        signingOut={signingOut}
        onSignOut={handleSignOut}
      />

      <div className="md:pl-[255px]">
        {/* TOP BAR / BREADCRUMB */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#e6e6e6] bg-white/95 px-6 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/student/classes" className="hover:text-black transition">
              Lớp học của tôi
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-900">{course.code}</span>
            <span>/</span>
            <span className="truncate max-w-[200px] sm:max-w-none text-gray-700">{course.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/student/classes"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại danh sách lớp
            </Link>
          </div>
        </header>

        {/* HERO BANNER LỚP HỌC */}
        <div className="border-b border-[#e6e6e6] bg-white">
          <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-black px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                    {course.code}
                  </span>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {course.semester}
                  </span>
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {course.credits} Tín chỉ
                  </span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                  {course.name}
                </h1>

                <p className="text-xs text-gray-600">
                  Giảng viên phụ trách: <strong className="text-gray-900">{course.teacher}</strong> • {course.teacherTitle}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {course.schedule}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {course.room}
                  </span>
                </div>
              </div>

              {/* Class Code Box */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 shrink-0 sm:min-w-[240px]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  MÃ THAM GIA LỚP (CLASS CODE)
                </span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-mono text-xl font-black text-gray-900 tracking-wider">
                    {course.classCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-xs"
                  >
                    {copiedCode ? '✓ Đã chép' : 'Sao chép'}
                  </button>
                </div>
                <span className="mt-2 block text-[10px] text-gray-400">
                  Dùng mã này để chia sẻ cho các thành viên trong nhóm
                </span>
              </div>
            </div>

            {/* BENTO 4 CHỈ SỐ TIẾN ĐỘ HỌC TẬP */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  TỔNG SỐ BÀI TẬP
                </span>
                <div className="mt-1 text-2xl font-black text-gray-900">{course.totalAssignments}</div>
                <span className="text-[11px] text-gray-500 font-medium">Toàn bộ kỳ học</span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  ĐÃ HOÀN THÀNH
                </span>
                <div className="mt-1 text-2xl font-black text-emerald-900">
                  {course.completedAssignments}
                  <span className="text-xs text-emerald-700 font-semibold ml-1">
                    ({Math.round((course.completedAssignments / course.totalAssignments) * 100)}%)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">Đã chấm &amp; công bố</span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  CHƯA HOÀN THÀNH
                </span>
                <div className="mt-1 text-2xl font-black text-amber-900">
                  {course.pendingAssignments}
                  <span className="text-xs text-amber-700 font-semibold ml-1">bài cần nộp</span>
                </div>
                <span className="text-[11px] text-amber-700 font-medium">Cần hoàn thành đúng hạn</span>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                  ĐIỂM TRUNG BÌNH
                </span>
                <div className="mt-1 text-2xl font-black text-indigo-950 font-mono">
                  {course.averageScore}
                  <span className="text-xs text-indigo-600 font-sans font-medium"> / 10.0</span>
                </div>
                <span className="text-[11px] text-indigo-700 font-semibold">Xếp loại: Xuất sắc</span>
              </div>
            </div>

            {/* TAB BỘ LỌC BÀI TẬP */}
            <div className="mt-8 flex border-b border-gray-200 gap-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`pb-3 transition ${
                  activeTab === 'all'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Tất cả bài tập ({course.assignments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`pb-3 transition flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <span>Chưa hoàn thành</span>
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.2 text-[10px] font-bold">
                  {course.pendingAssignments}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`pb-3 transition flex items-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <span>Đã hoàn thành</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[10px] font-bold">
                  {course.completedAssignments}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* DANH SÁCH BÀI TẬP VẤN ĐÁP */}
        <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
          <div className="space-y-4">
            {filteredAssignments.map((asg) => {
              const isPending = asg.status === 'pending';

              return (
                <div
                  key={asg.id}
                  className={`rounded-2xl border p-5 sm:p-6 transition shadow-xs ${
                    isPending
                      ? 'border-amber-200 bg-white hover:border-amber-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-500">
                          {asg.code}
                        </span>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            CHƯA HOÀN THÀNH • CẦN NỘP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            ĐÃ CÓ ĐIỂM CHÍNH THỨC
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          • {asg.questionCount} câu hỏi ({asg.timePerQuestion})
                        </span>
                        <span className="text-xs text-gray-400">
                          • Tối đa {asg.maxRetakes} lần thu âm
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 leading-snug">
                        {asg.title}
                      </h3>

                      {isPending ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Hạn nộp chính thức: {asg.deadline}</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500">
                            Thời gian nộp bài: <strong className="text-gray-700">{asg.submittedAt}</strong>
                          </p>
                          {asg.feedback && (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
                              <span className="font-bold text-indigo-700 block mb-0.5">
                                💬 Nhận xét của giảng viên &amp; AI:
                              </span>
                              <p className="text-gray-600 leading-relaxed italic">
                                &quot;{asg.feedback}&quot;
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: Score or Action */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 shrink-0">
                      {isPending ? (
                        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                          <Link
                            href={`/student/exam/${asg.examRouteId}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-gray-800 transition active:scale-95"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                            </svg>
                            Vào phòng thi vấn đáp
                          </Link>
                          <span className="text-[10px] text-gray-400">
                            Kiểm tra micro trước khi bắt đầu
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-right">
                              <span className="font-mono text-2xl font-black text-gray-900">
                                {asg.score?.toFixed(1)}
                              </span>
                              <span className="font-mono text-xs text-gray-400"> / 10.0</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <span>AI: <strong>{asg.aiScore}</strong></span>
                            <span>+</span>
                            <span className="text-indigo-600 font-bold">GV: +{asg.teacherBonus}</span>
                          </div>

                          <Link
                            href="/student/history"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                          >
                            <span>Xem chi tiết &amp; Rubric</span>
                            <span>→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAssignments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="text-xs text-gray-500">Không có bài tập nào trong mục này.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
