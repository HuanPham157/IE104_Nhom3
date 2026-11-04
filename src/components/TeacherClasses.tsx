'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfileForRole } from '@/lib/profile-cache';
import TeacherSidebar from '@/components/TeacherSidebar';

interface TeacherProfile {
  full_name: string;
  faculty: string;
}

type IconName = 'overview' | 'classes' | 'exam' | 'recordings' | 'telemetry' | 'settings' | 'help' | 'logout' | 'search' | 'users' | 'fingerprint' | 'signature' | 'alert' | 'filter' | 'sort' | 'book' | 'mic' | 'check' | 'chart' | 'dots' | 'roster' | 'folder' | 'calendar' | 'message' | 'badge' | 'close' | 'add';

const iconPaths: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M2 9l10-5 10 5-10 5L2 9z M6 11v5c3 2 9 2 12 0v-5 M22 9v6',
  exam: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  recordings: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  telemetry: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  search: 'm21 21-4.34-4.34 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87',
  fingerprint: 'M12 11a2 2 0 0 0-2 2c0 2-.5 4-1.5 5.5 M14 13c0 3-.7 5.5-2 8 M8 13a4 4 0 0 1 8 0c0 4-.5 6.5-1.5 8 M6 13a6 6 0 0 1 12 0c0 2-.1 3.7-.4 5.2 M4 13a8 8 0 0 1 16 0',
  signature: 'M4 20h16 M4 16l4-1 9-9a2 2 0 0 0-3-3l-9 9z M13 5l3 3',
  alert: 'M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  filter: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M2 14h4 M10 8h4 M18 16h4',
  sort: 'M4 6h16 M7 12h10 M10 18h4',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  check: 'M20 6 9 17l-5-5',
  chart: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
  dots: 'M12 5h.01 M12 12h.01 M12 19h.01',
  roster: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 11l2 2 4-4',
  folder: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
  message: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
  badge: 'M12 3 14.5 5l3.2-.2.5 3.2 2.3 2.3-1.7 2.8.2 3.2-3.2.5-2.3 2.3-2.8-1.7-3.2.2-.5-3.2-2.3-2.3 1.7-2.8-.2-3.2 3.2-.5z M9 12l2 2 4-4',
  close: 'M18 6 6 18 M6 6l12 12',
  add: 'M12 4v16m8-8H4',
};

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d={iconPaths[name]} /></svg>;
}

interface Course {
  code: string;
  secondaryCode: string;
  faculty: string;
  title: string;
  lab: string;
  schedule: string;
  students: string;
  voiceprint: string;
  exams: string;
  submissions: string;
  engine: string;
  average: string;
  kind: 'teaching' | 'advisory';
  status: string;
}

const initialCourses: Course[] = [
  { code: 'AIO-8892', secondaryCode: 'IT4409', faculty: 'Khoa CNTT', title: 'KTPM-K20: Kiến trúc Phần mềm', lab: 'Lab A3.04', schedule: 'Thứ 3, Tiết 1 - 4', students: '48 / 50 SV', voiceprint: 'Voiceprint 100%', exams: '3/4 đợt thi', submissions: '93.3% nộp bài', engine: 'Whisper-v4 • Auralis LLM', average: '8.35/10', kind: 'teaching', status: 'Đang giảng dạy' },
  { code: 'AIO-3419', secondaryCode: 'CS102', faculty: 'Khoa KHMT', title: 'OOP-K21: Lập trình Hướng đối tượng C++', lab: 'Lab B1.02', schedule: 'Thứ 5, Tiết 5 - 8', students: '53 / 60 SV', voiceprint: 'Voiceprint 98%', exams: '2/4 đợt thi', submissions: '88.3% nộp bài', engine: 'C++ Pronounce AI', average: '9.10/10', kind: 'teaching', status: 'Đang giảng dạy' },
  { code: 'AIO-5510', secondaryCode: 'IT3080', faculty: 'Khoa KTMT', title: 'HDH-K21: Hệ điều hành & Mạng máy tính', lab: 'Lab A2.01', schedule: 'Thứ 2, Tiết 7 - 10', students: '45 / 45 (Đầy)', voiceprint: '100% Voiceprint', exams: '1/3 đợt thi', submissions: '4 bài nộp mới chờ ký số HSM', engine: 'Kernel Voiceprint v2', average: '8.50/10', kind: 'teaching', status: 'Đang giảng dạy' },
  { code: 'AIO-9012', secondaryCode: 'IT4100', faculty: 'Khoa KTMT', title: 'KTMT-K19: Thiết kế Hệ thống Nhúng & IoT', lab: 'Lab C3.08', schedule: 'Thứ 6, Tiết 1 - 4', students: '42 / 45 SV', voiceprint: '100% Hoàn thành', exams: '3/3 đợt thi (Kết thúc)', submissions: '100% Hoàn tất', engine: 'Hardware VQA', average: '8.80/10', kind: 'teaching', status: 'Hoàn tất' },
];

const advisoryClasses = [
  { term: 'KHÓA 2020 - 2025', faculty: 'Khoa Công nghệ Thông tin', level: 'Năm thứ 4 (Sắp tốt nghiệp)', title: 'K65-CNTT-02: Lớp Sinh hoạt Cố vấn K65 CNTT 2', count: '62', leader: 'Trần Quốc Bảo', contact: 'bao.tq20@sis.hust.edu.vn', cpa: '3.18', gpa: '86.4', grade: 'Khá - Tốt', alerts: '2 sinh viên', alertDetail: 'Nợ bài Oral Tiếng Anh B2', accent: 'indigo' },
  { term: 'KHÓA 2021 - 2026', faculty: 'Khoa Khoa học Máy tính', level: 'Năm thứ 3 (Chuyên ngành)', title: 'K66-KHMT-01: Lớp Sinh hoạt Cố vấn K66 KHMT 1', count: '61', leader: 'Lê Minh Cường', contact: '0914.882.xxx', cpa: '3.25', gpa: '88.2', grade: 'Giỏi', alerts: '0 sinh viên', alertDetail: '100% An toàn học vụ', accent: 'green' },
];

export default function TeacherClasses() {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('teacher'));
  const [profile] = useState<TeacherProfile | null>(() => cachedProfile ? {
    full_name: cachedProfile.full_name ?? 'Th.S Nguyễn Văn B',
    faculty: cachedProfile.faculty ?? 'Khoa Công nghệ Phần mềm',
  } : { full_name: 'Th.S Nguyễn Văn B', faculty: 'Khoa Công nghệ Phần mềm' });
  const [checking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'teaching' | 'advisory'>('all');
  const [faculty, setFaculty] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('schedule');
  const [courses, setCourses] = useState<Course[]>(initialCourses);

  // Modal Create Class state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [classCodeInput, setClassCodeInput] = useState('');
  const [classFacultyInput, setClassFacultyInput] = useState('Khoa Công nghệ Phần mềm');
  const [classLabInput, setClassLabInput] = useState('Lab B2.04');
  const [classScheduleInput, setClassScheduleInput] = useState('Thứ 4, Tiết 1 - 4');
  const [createSuccess, setCreateSuccess] = useState('');

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/login');
      router.refresh();
    } catch {
      setErrorMessage('Đăng xuất chưa thành công. Vui lòng thử lại.');
      setSigningOut(false);
    }
  }

  function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    const generatedCode = `AIO-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCourse: Course = {
      code: generatedCode,
      secondaryCode: classCodeInput.toUpperCase() || 'IT4999',
      faculty: classFacultyInput,
      title: classNameInput,
      lab: classLabInput,
      schedule: classScheduleInput,
      students: '0 / 45 SV',
      voiceprint: 'Chờ đồng bộ',
      exams: '0 đợt thi',
      submissions: '0 bài nộp',
      engine: 'Whisper-v4 • Auralis LLM',
      average: 'Chưa có điểm',
      kind: 'teaching',
      status: 'Đang giảng dạy',
    };

    setCourses([newCourse, ...courses]);
    setCreateSuccess(`Lớp học "${classNameInput}" (${generatedCode}) đã được tạo! Yêu cầu cấp mã lớp chính thức đã gửi tới Quản trị viên (Admin) phê duyệt.`);

    setTimeout(() => {
      setShowCreateModal(false);
      setCreateSuccess('');
      setClassNameInput('');
      setClassCodeInput('');
    }, 2000);
  }

  const visibleCourses = useMemo(() => courses
    .filter((item) => tab === 'all' || item.kind === tab)
    .filter((item) => faculty === 'all' || item.faculty === faculty)
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => `${item.code} ${item.secondaryCode} ${item.title} ${item.faculty}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'vi') : sort === 'students' ? Number.parseInt(b.students, 10) - Number.parseInt(a.students, 10) : courses.indexOf(a) - courses.indexOf(b)), [courses, faculty, query, sort, status, tab]);

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] text-sm text-gray-600">Đang xác minh tài khoản giảng viên...</main>;
  if (errorMessage && !profile) return <main className="flex min-h-screen items-center justify-center p-5"><div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center"><p role="alert" className="text-sm text-red-700">{errorMessage}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Thử lại</button></div></main>;
  if (!profile) return null;

  const initials = profile.full_name.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('');

  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <TeacherSidebar currentPage="classes" signingOut={signingOut} onSignOut={handleSignOut} />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[68px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-7">
          <div className="text-[11px] text-gray-500">
            Lớp học &amp; Hội đồng <span className="mx-2">/</span><b className="text-gray-800">Quản lý lớp học</b>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <Icon name="add" className="h-3.5 w-3.5" />
              Tạo lớp học mới (Popup)
            </button>
            <span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[9px] font-semibold text-indigo-800 sm:inline-flex">
              HỌC KỲ I • 2026-2027
            </span>
            <Link href="/teacher/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefff] text-[10px] font-bold text-indigo-800 hover:ring-2 hover:ring-indigo-400">
              {initials}
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-7">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[8px] font-bold text-indigo-800">
                  HỌC KỲ I • 2026-2027
                </span>
                <h1 className="mt-2 text-[23px] font-bold tracking-tight sm:text-[27px]">
                  Lớp học phụ trách &amp; Cố vấn học tập
                </h1>
                <p className="mt-1 text-xs text-gray-600">
                  Quản lý danh sách lớp, tạo lớp học mới chờ Admin phê duyệt, và vào từng lớp để xem danh sách sinh viên &amp; điểm oral.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                <span className="text-emerald-700 font-bold">+</span>
                Tạo lớp học mới
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex h-9 min-w-[220px] max-w-[360px] flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-gray-500">
                <Icon name="search" className="h-4 w-4" />
                <input
                  aria-label="Tìm lớp học"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tên môn học, mã lớp..."
                  className="w-full bg-transparent text-[10px] outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Học kỳ" className="h-9 rounded-full border border-gray-300 bg-white px-3 text-[10px]">
                  <option>HK I (2026 - 2027)</option>
                </select>
                <Link
                  href="/teacher/assignments/create"
                  className="flex h-9 items-center gap-2 rounded-full bg-black px-4 text-[10px] font-semibold text-white hover:bg-gray-800"
                >
                  <Icon name="exam" className="h-3.5 w-3.5 text-indigo-400" />
                  Soạn đề thi &amp; Barem LLM
                </Link>
              </div>
            </div>
          </div>

          <section aria-label="Thống kê lớp học demo" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard title="Tổng sinh viên phụ trách" value="348" suffix="sinh viên" icon="users" footer="225 SV giảng dạy / 123 SV cố vấn" />
            <MetricCard title="Xác thực sinh trắc giọng nói" value="98.6%" suffix="Chuẩn hóa" icon="fingerprint" footer="343/348 đã đồng bộ mẫu âm học" green />
            <MetricCard title="Bài thi Oral chờ ký số HSM" value="14" suffix="bài nộp mới" icon="signature" footer="Cần thẩm định âm học AI trong 48h" purple />
            <MetricCard title="Cảnh báo học vụ / Cố vấn" value="06" suffix="sinh viên" icon="alert" footer="2 nợ bài oral, 4 CPA < 2.0 cần tư vấn" red />
          </section>

          <section className="mt-5 flex flex-col gap-3 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 rounded-xl bg-[#ededed] p-1">
                {([
                  { id: 'all', text: 'Tất cả các lớp' },
                  { id: 'teaching', text: 'Lớp giảng dạy chuyên môn' },
                  { id: 'advisory', text: 'Lớp Cố vấn học tập' },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={tab === item.id}
                    className={`min-h-9 rounded-lg px-3 text-[9px] ${tab === item.id ? 'bg-white font-semibold shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-gray-500">
                ✓ Đang hiển thị {visibleCourses.length} lớp học
              </span>
            </div>
          </section>

          {(tab === 'all' || tab === 'teaching') && (
            <section className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#efefef]">
                    <Icon name="book" />
                  </span>
                  <div>
                    <h2 className="text-[16px] font-bold">
                      Lớp trực tiếp giảng dạy chuyên môn
                    </h2>
                    <p className="mt-1 text-[10px] text-gray-600">
                      Tổ chức khảo thí vấn đáp oral, phân tích phổ âm thanh AI và duyệt điểm số chính thức.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {visibleCourses.map((item, index) => (
                  <CourseCard
                    key={item.code}
                    item={item}
                    index={index}
                    onOpen={() => router.push(`/teacher/classes/${item.code}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {(tab === 'all' || tab === 'advisory') && (
            <section className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-[#f4f3ff] p-4 sm:p-5">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-800">
                    <Icon name="users" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-bold">Lớp Cố vấn học tập &amp; Chủ nhiệm (Academic Advisory)</h2>
                    <p className="mt-1 max-w-[720px] text-[10px] leading-relaxed text-gray-600">
                      Theo dõi tình hình học tập toàn diện, cảnh báo học vụ và tư vấn kế hoạch khảo thí chuẩn âm học cho sinh viên.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                {advisoryClasses.map((item) => (
                  <AdvisoryCard key={item.term} item={item} />
                ))}
              </div>
            </section>
          )}

          <footer className="mt-8 border-t border-gray-200 pt-4 text-[9px] text-gray-500">
            AIOralCheck Studio v2.4.2 • Hệ thống khảo thí âm học &amp; Khảo thí tự động AI <span className="float-right">Bản quyền © 2025 Đại học Bách Khoa</span>
          </footer>
        </div>
      </div>

      {/* POPUP MODAL TẠO LỚP HỌC MỚI (CHỜ ADMIN DUYỆT) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                  <Icon name="add" className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Tạo Lớp Học Mới</h3>
                  <span className="text-[10px] text-indigo-700 font-semibold">
                    Quy trình Giảng viên tạo → Chờ Admin duyệt cấp mã Class Code
                  </span>
                </div>
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
                <label className="block text-xs font-bold text-gray-700">
                  Tên học phần / Lớp môn học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: KTPM-K20: Kiến trúc Phần mềm Phân tán"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Mã môn học (Secondary Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: IT4409"
                    value={classCodeInput}
                    onChange={(e) => setClassCodeInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Khoa / Viện quản lý
                  </label>
                  <select
                    value={classFacultyInput}
                    onChange={(e) => setClassFacultyInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  >
                    <option>Khoa Công nghệ Phần mềm</option>
                    <option>Khoa Khoa học Máy tính</option>
                    <option>Khoa Kỹ thuật Máy tính</option>
                    <option>Khoa Hệ thống Thông tin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Phòng Lab / Giảng đường
                  </label>
                  <input
                    type="text"
                    value={classLabInput}
                    onChange={(e) => setClassLabInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Lịch học định kỳ
                  </label>
                  <input
                    type="text"
                    value={classScheduleInput}
                    onChange={(e) => setClassScheduleInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-[#f8f9ff] p-3 text-xs text-gray-600">
                <span className="font-bold text-indigo-900 block mb-0.5">ℹ Lưu ý quản trị:</span>
                Sau khi gửi, yêu cầu tạo lớp sẽ được chuyển đến Dashboard Admin để cấp mã Class Code chính thức và kích hoạt tài nguyên AI Voice Token.
              </div>

              {createSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  ✓ {createSuccess}
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
                  Gửi yêu cầu tạo lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({ title, value, suffix, icon, footer, green = false, purple = false, red = false }: { title: string; value: string; suffix: string; icon: IconName; footer: string; green?: boolean; purple?: boolean; red?: boolean }) {
  const color = green ? 'text-[#078344]' : purple ? 'text-indigo-700' : red ? 'text-red-600' : 'text-[#222]';
  return <article className={`min-h-[126px] rounded-2xl border bg-white p-4 shadow-sm ${green ? 'border-[#a9e3c2]' : 'border-[#e1e1e1]'}`}><div className="flex justify-between gap-2"><p className="max-w-[190px] text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-gray-600">{title}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${green ? 'bg-green-50 text-green-700' : purple ? 'bg-indigo-50 text-indigo-700' : red ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}><Icon name={icon} /></span></div><div className="mt-1 flex items-baseline gap-2"><b className={`text-[30px] leading-none ${color}`}>{value}</b><span className={`text-[9px] ${green ? 'text-green-700' : purple ? 'text-indigo-700' : red ? 'text-red-600' : 'text-gray-500'}`}>{suffix}</span></div><p className={`mt-2 flex items-center gap-1.5 text-[9px] ${green ? 'text-green-700' : purple ? 'text-indigo-700' : red ? 'text-red-600' : 'text-gray-600'}`}><span>{green ? '✓' : purple ? '⌁' : red ? 'ⓘ' : '•'}</span>{footer}</p></article>;
}

function CourseCard({ item, index, onOpen }: { item: Course; index: number; onOpen: () => void }) {
  const highlighted = index === 0;
  const done = item.status === 'Hoàn tất';
  return (
    <article data-testid={`teacher-course-${item.code}`} className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${highlighted ? 'border-2 border-indigo-300' : 'border-[#dedede]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono font-bold text-gray-900">{item.code} • {item.secondaryCode}</span>
            <span className="text-gray-500">• {item.faculty}</span>
          </div>
          <h3 className="mt-2 text-base font-bold text-gray-900 leading-tight">{item.title}</h3>
        </div>
        <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-[9px] font-semibold text-green-800 shrink-0">
          {item.lab}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-y border-gray-100 py-2.5 text-xs text-gray-600">
        <span className="flex items-center gap-1"><Icon name="calendar" className="h-3.5 w-3.5" />{item.schedule}</span>
        <span>•</span>
        <span className="flex items-center gap-1"><Icon name="users" className="h-3.5 w-3.5" />Sĩ số: <b>{item.students}</b></span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-700"><Icon name="fingerprint" className="h-3.5 w-3.5" />{item.voiceprint}</span>
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-gray-600">Tiến độ khảo thí: <b>{item.exams}</b></span>
        <b className={done ? 'text-emerald-700' : 'text-indigo-800'}>{item.submissions}</b>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500 text-[11px]">AI Engine: <b className="text-gray-800">{item.engine}</b></span>
        <span className="text-gray-700">Điểm TB: <b className="text-sm font-bold text-gray-900">{item.average}</b></span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <Link
          href={`/teacher/classes/${item.code}`}
          className="flex h-8 items-center gap-1.5 rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Icon name="roster" className="h-3.5 w-3.5 text-gray-500" />
          Danh sách SV (Roster)
        </Link>

        <button
          type="button"
          onClick={onOpen}
          className="flex h-8 items-center gap-1.5 rounded-full bg-black px-4 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          <Icon name="mic" className="h-3.5 w-3.5 text-indigo-400" />
          Vào lớp &amp; Chấm thi
        </button>
      </div>
    </article>
  );
}

function AdvisoryCard({ item }: { item: typeof advisoryClasses[number] }) {
  const tone = item.accent === 'green';
  return (
    <article className="rounded-2xl border border-[#dedede] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded bg-gray-100 px-2 py-0.5 font-semibold text-gray-800">{item.term}</span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${tone ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-indigo-300 bg-indigo-50 text-indigo-800'}`}>
          {item.level}
        </span>
      </div>
      <h3 className="mt-2 text-base font-bold text-gray-900">{item.title}</h3>
      <div className="mt-3 rounded-xl border border-gray-100 bg-[#fafafa] p-3.5 text-xs">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-gray-500 text-[11px]">Sĩ số cố vấn</p>
            <p className="mt-0.5 font-bold text-gray-900">{item.count} sinh viên</p>
          </div>
          <div>
            <p className="text-gray-500 text-[11px]">Ban cán sự lớp</p>
            <p className="mt-0.5 font-bold text-gray-900">{item.leader}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
