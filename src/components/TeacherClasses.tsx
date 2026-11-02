'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import TeacherSidebar from '@/components/TeacherSidebar';

interface TeacherProfile {
  full_name: string;
  faculty: string;
}

type IconName = 'overview' | 'classes' | 'exam' | 'recordings' | 'telemetry' | 'settings' | 'help' | 'logout' | 'search' | 'users' | 'fingerprint' | 'signature' | 'alert' | 'filter' | 'sort' | 'book' | 'mic' | 'check' | 'chart' | 'dots' | 'roster' | 'folder' | 'calendar' | 'message' | 'badge' | 'close';

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

const courses: Course[] = [
  { code: 'AIO-8892', secondaryCode: 'IT4409', faculty: 'Khoa CNTT', title: 'KTPM-K20: Kiến trúc Phần mềm', lab: 'Lab A3.04', schedule: 'Thứ 3, Tiết 1 - 4', students: '48 / 50 SV', voiceprint: 'Voiceprint 100%', exams: '3/4 đợt thi', submissions: '93.3% nộp bài', engine: 'Whisper-v4 • Auralis LLM', average: '8.35/10', kind: 'teaching', status: 'Đang giảng dạy' },
  { code: 'AIO-3419', secondaryCode: 'CS102', faculty: 'Khoa KHMT', title: 'OOP-K21: Lập trình Hướng đối tượng C++', lab: 'Lab B1.02', schedule: 'Thứ 5, Tiết 5 - 8', students: '53 / 60 SV', voiceprint: 'Voiceprint 98%', exams: '2/4 đợt thi', submissions: '88.3% nộp bài', engine: 'C++ Pronounce AI', average: '9.10/10', kind: 'teaching', status: 'Đang giảng dạy' },
  { code: 'AIO-5510', secondaryCode: 'IT3080', faculty: 'Khoa KTMT', title: 'HDH-K21: Hệ điều hành & Mạng máy tính', lab: 'Lab A2.01', schedule: 'Thứ 2, Tiết 7 - 10', students: '45 / 45 (Đầy)', voiceprint: '100% Voiceprint', exams: '1/3 đợt thi', submissions: '4 bài nộp mới chờ ký số HSM', engine: 'Kernel Voiceprint v2', average: '8.50/10', kind: 'teaching', status: 'Đang giảng dạy' },
  { code: 'AIO-9012', secondaryCode: 'IT4100', faculty: 'Khoa KTMT', title: 'KTMT-K19: Thiết kế Hệ thống Nhúng & IoT', lab: 'Lab C3.08', schedule: 'Thứ 6, Tiết 1 - 4', students: '42 / 45 SV', voiceprint: '100% Hoàn thành', exams: '3/3 đợt thi (Kết thúc)', submissions: '100% Hoàn tất', engine: 'Hardware VQA', average: '8.80/10', kind: 'teaching', status: 'Hoàn tất' },
];

const advisoryClasses = [
  { term: 'KHÓA 2020 - 2025', faculty: 'Khoa Công nghệ Thông tin', level: 'Năm thứ 4 (Sắp tốt nghiệp)', title: 'K65-CNTT-02: Lớp Sinh hoạt Cố vấn K65 CNTT 2', count: '62', leader: 'Trần Quốc Bảo', contact: 'bao.tq20@sis.hust.edu.vn', cpa: '3.18', gpa: '86.4', grade: 'Khá - Tốt', alerts: '2 sinh viên', alertDetail: 'Nợ bài Oral Tiếng Anh B2', accent: 'indigo' },
  { term: 'KHÓA 2021 - 2026', faculty: 'Khoa Khoa học Máy tính', level: 'Năm thứ 3 (Chuyên ngành)', title: 'K66-KHMT-01: Lớp Sinh hoạt Cố vấn K66 KHMT 1', count: '61', leader: 'Lê Minh Cường', contact: '0914.882.xxx', cpa: '3.25', gpa: '88.2', grade: 'Giỏi', alerts: '0 sinh viên', alertDetail: '100% An toàn học vụ', accent: 'green' },
];

function PreviewDialog({ title, onClose }: { title: string; onClose: () => void }) {
  return <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="class-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between"><div><span className="rounded-full bg-[#fff8e6] px-2 py-1 text-[9px] font-semibold text-[#866313]">BẢN XEM TRƯỚC</span><h2 id="class-dialog-title" className="mt-2 text-lg font-bold">{title}</h2></div><button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-gray-100"><Icon name="close" /></button></div><p className="mt-3 text-sm leading-relaxed text-gray-600">Thông tin lớp và nghiệp vụ khảo thí đang được minh họa theo thiết kế, chưa được kết nối với dữ liệu Supabase.</p><button type="button" onClick={onClose} className="mt-5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white">Đã hiểu</button></section></div>;
}

export default function TeacherClasses() {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('teacher'));
  const [profile, setProfile] = useState<TeacherProfile | null>(() => cachedProfile ? {
    full_name: cachedProfile.full_name ?? '',
    faculty: cachedProfile.faculty ?? '',
  } : null);
  const [checking, setChecking] = useState(!cachedProfile);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'teaching' | 'advisory'>('all');
  const [faculty, setFaculty] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('schedule');
  const [dialog, setDialog] = useState('');

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.replace('/login');
          return;
        }
        const data = await getCachedProfile(session.user.id);
        if (data?.role !== 'teacher') {
          router.replace(data?.role === 'student' ? '/student' : '/login');
          return;
        }
        if (active) setProfile({ full_name: data.full_name ?? '', faculty: data.faculty ?? '' });
      } catch {
        if (active) setErrorMessage('Không thể xác minh tài khoản. Vui lòng kiểm tra kết nối và thử lại.');
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (!session) router.replace('/login'); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router]);

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

  const visibleCourses = useMemo(() => courses
    .filter((item) => tab === 'all' || item.kind === tab)
    .filter((item) => faculty === 'all' || item.faculty === faculty)
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => `${item.code} ${item.secondaryCode} ${item.title} ${item.faculty}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'vi') : sort === 'students' ? Number.parseInt(b.students, 10) - Number.parseInt(a.students, 10) : courses.indexOf(a) - courses.indexOf(b)), [faculty, query, sort, status, tab]);

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] text-sm text-gray-600">Đang xác minh tài khoản giảng viên...</main>;
  if (errorMessage && !profile) return <main className="flex min-h-screen items-center justify-center p-5"><div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center"><p role="alert" className="text-sm text-red-700">{errorMessage}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Thử lại</button></div></main>;
  if (!profile) return null;

  const initials = profile.full_name.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('');
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <TeacherSidebar currentPage="classes" signingOut={signingOut} onSignOut={handleSignOut} unavailableItemsInteractive onUnavailable={setDialog} />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[68px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-7"><div className="text-[11px] text-gray-500">Lớp học &amp; Hội đồng <span className="mx-2">/</span><b className="text-gray-800">Dashboard</b></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[9px] font-semibold text-indigo-800 sm:inline-flex">HỌC KỲ I • 2026-2027</span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefff] text-[10px] font-bold text-indigo-800">{initials}</span><button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Đăng xuất" className="rounded-lg border p-2 text-gray-600 md:hidden"><Icon name="logout" /></button></div></header>
        <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-7">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          <div className="border-b border-gray-200 pb-4">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[8px] font-bold text-indigo-800">HỌC KỲ I • 2026-2027</span>
            <h1 className="mt-2 text-[23px] font-bold tracking-tight sm:text-[27px]">Lớp học phụ trách &amp; Cố vấn học tập</h1>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex h-9 min-w-[220px] max-w-[360px] flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-gray-500"><Icon name="search" className="h-4 w-4" /><input aria-label="Tìm lớp học" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên môn học, mã lớp..." className="w-full bg-transparent text-[10px] outline-none" /></label>
              <div className="flex flex-wrap gap-2"><select aria-label="Học kỳ" className="h-9 rounded-full border border-gray-300 bg-white px-3 text-[10px]"><option>HK I (2026 - 2027)</option></select><button type="button" onClick={() => setDialog('Xuất báo cáo (Excel/PDF)')} className="flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 text-[10px] hover:bg-gray-50"><Icon name="chart" />Xuất báo cáo (Excel/PDF)</button></div>
            </div>
          </div>

          <span className="mt-3 inline-flex rounded-full border border-[#eadcae] bg-[#fff9e9] px-2 py-0.5 text-[8px] font-semibold text-[#81621c]">DỮ LIỆU LỚP HỌC MINH HỌA</span>
          <section aria-label="Thống kê lớp học demo" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard title="Tổng sinh viên phụ trách" value="348" suffix="sinh viên" icon="users" footer="225 SV giảng dạy  /  123 SV cố vấn" />
            <MetricCard title="Xác thực sinh trắc giọng nói" value="98.6%" suffix="Chuẩn hóa" icon="fingerprint" footer="343/348 đã đồng bộ mẫu âm học" green />
            <MetricCard title="Bài thi Oral chờ ký số HSM" value="14" suffix="bài nộp mới" icon="signature" footer="Cần thẩm định âm học AI trong 48h" purple />
            <MetricCard title="Cảnh báo học vụ / Cố vấn" value="06" suffix="sinh viên" icon="alert" footer="2 nợ bài oral, 4 CPA < 2.0 cần tư vấn" red />
          </section>

          <section className="mt-5 flex flex-col gap-3 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-1 rounded-xl bg-[#ededed] p-1">{([{ id: 'all', text: 'Tất cả các lớp (7 lớp)' }, { id: 'teaching', text: 'Lớp trực tiếp giảng dạy (5 lớp)' }, { id: 'advisory', text: 'Lớp Cố vấn học tập (2 lớp)' }] as const).map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id} className={`min-h-9 rounded-lg px-3 text-[9px] ${tab === item.id ? 'bg-white font-semibold shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}>{item.text}</button>)}</div><span className="text-[9px] text-gray-500">✓ Đang hiển thị toàn bộ {visibleCourses.length + (tab === 'teaching' ? 0 : tab === 'advisory' ? advisoryClasses.length : advisoryClasses.length)} lớp</span></div>
            <div className="flex flex-wrap items-center gap-2"><label className="flex h-9 items-center gap-2 rounded-lg border bg-white px-2.5 text-[9px]"><Icon name="filter" /><span>Khoa/Viện:</span><select aria-label="Lọc khoa" value={faculty} onChange={(event) => setFaculty(event.target.value)} className="max-w-[160px] bg-transparent outline-none"><option value="all">Tất cả Viện CNTT&amp;TT</option><option>Khoa CNTT</option><option>Khoa KHMT</option><option>Khoa KTMT</option></select></label><label className="flex h-9 items-center gap-2 rounded-lg border bg-white px-2.5 text-[9px]"><Icon name="sort" /><span>Trạng thái:</span><select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)} className="bg-transparent outline-none"><option value="all">Tất cả trạng thái thi</option><option>Đang giảng dạy</option><option>Hoàn tất</option></select></label><label className="ml-auto flex h-9 items-center gap-2 rounded-lg border bg-white px-2.5 text-[9px]"><Icon name="sort" /><span className="hidden sm:inline">Sắp xếp:</span><select aria-label="Sắp xếp lớp" value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none"><option value="schedule">Theo lịch học thứ trong tuần</option><option value="name">Tên lớp A–Z</option><option value="students">Sĩ số giảm dần</option></select></label></div>
          </section>

          {(tab === 'all' || tab === 'teaching') && <section className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#efefef]"><Icon name="book" /></span><div><h2 className="text-[16px] font-bold">Lớp trực tiếp giảng dạy chuyên môn <span className="ml-1 rounded-full bg-black px-2 py-1 text-[8px] text-white">5 LỚP HỌC PHẦN</span></h2><p className="mt-1 text-[10px] text-gray-600">Giảng dạy lý thuyết &amp; thực hành phòng lab, tổ chức các đợt thi oral examination với chấm điểm tự động Auralis Acoustic LLM.</p></div></div><button type="button" onClick={() => setDialog('Quản lý đề thi & Rubric chung')} className="flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-[10px] hover:bg-gray-50"><Icon name="filter" />Quản lý đề thi &amp; Rubric chung</button></div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">{visibleCourses.map((item, index) => <CourseCard key={item.code} item={item} index={index} onAction={setDialog} />)}</div>
            {visibleCourses.length === 0 && <p className="mt-3 rounded-xl border border-dashed bg-white p-8 text-center text-xs text-gray-500">Không tìm thấy lớp học phù hợp.</p>}
          </section>}

          {(tab === 'all' || tab === 'advisory') && <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-[#f4f3ff] p-4 sm:p-5"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-800"><Icon name="users" /></span><div><h2 className="text-[15px] font-bold">Lớp Cố vấn học tập &amp; Chủ nhiệm (Academic Advisory)</h2><p className="mt-1 max-w-[720px] text-[10px] leading-relaxed text-gray-600">Theo dõi tình hình học tập toàn diện, cảnh báo học vụ, lịch sinh hoạt lớp định kỳ và tư vấn kế hoạch khảo thí chuẩn âm học cho sinh viên theo từng khóa đào tạo.</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[8px] font-bold text-indigo-800">2 LỚP CHUYÊN BAN • 123 SINH VIÊN</span><button type="button" onClick={() => setDialog('Gửi thông báo toàn khối Cố vấn')} className="flex h-9 items-center gap-2 rounded-full bg-indigo-900 px-4 text-[9px] font-semibold text-white hover:bg-indigo-800"><Icon name="message" />Gửi thông báo toàn khối Cố vấn</button></div></div>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">{advisoryClasses.map((item) => <AdvisoryCard key={item.term} item={item} onAction={setDialog} />)}</div>
          </section>}
          {errorMessage && <p role="alert" className="mt-4 text-xs text-red-700">{errorMessage}</p>}
          <footer className="mt-8 border-t border-gray-200 pt-4 text-[9px] text-gray-500">AIOralCheck Studio v2.4.2 • Hệ thống khảo thí âm học &amp; Khảo thí tự động AI <span className="float-right">Bản quyền © 2025 Đại học Bách Khoa</span></footer>
        </div>
      </div>
      {dialog && <PreviewDialog title={dialog} onClose={() => setDialog('')} />}
    </main>
  );
}

function MetricCard({ title, value, suffix, icon, footer, green = false, purple = false, red = false }: { title: string; value: string; suffix: string; icon: IconName; footer: string; green?: boolean; purple?: boolean; red?: boolean }) {
  const color = green ? 'text-[#078344]' : purple ? 'text-indigo-700' : red ? 'text-red-600' : 'text-[#222]';
  return <article className={`min-h-[126px] rounded-2xl border bg-white p-4 shadow-sm ${green ? 'border-[#a9e3c2]' : 'border-[#e1e1e1]'}`}><div className="flex justify-between gap-2"><p className="max-w-[190px] text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-gray-600">{title}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${green ? 'bg-green-50 text-green-700' : purple ? 'bg-indigo-50 text-indigo-700' : red ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}><Icon name={icon} /></span></div><div className="mt-1 flex items-baseline gap-2"><b className={`text-[30px] leading-none ${color}`}>{value}</b><span className={`text-[9px] ${green ? 'text-green-700' : purple ? 'text-indigo-700' : red ? 'text-red-600' : 'text-gray-500'}`}>{suffix}</span></div><p className={`mt-2 flex items-center gap-1.5 text-[9px] ${green ? 'text-green-700' : purple ? 'text-indigo-700' : red ? 'text-red-600' : 'text-gray-600'}`}><span>{green ? '✓' : purple ? '⌁' : red ? 'ⓘ' : '•'}</span>{footer}</p></article>;
}

function CourseCard({ item, index, onAction }: { item: Course; index: number; onAction: (title: string) => void }) {
  const highlighted = index === 2;
  const done = item.status === 'Hoàn tất';
  return <article data-testid={`teacher-course-${item.code}`} className={`rounded-2xl border bg-white p-4 shadow-sm ${highlighted ? 'border-2 border-indigo-300' : 'border-[#dedede]'}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5 text-[9px]"><span className="rounded bg-gray-100 px-2 py-1 font-semibold">{item.code} • {item.secondaryCode}</span><span className="text-gray-500">• {item.faculty}</span></div><h3 className="mt-1.5 text-[16px] font-bold leading-tight">{item.title}</h3></div><div className="flex items-center gap-1"><span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-[8px] font-semibold text-green-800">{item.lab}</span><button type="button" onClick={() => onAction(`Tùy chọn lớp ${item.code}`)} aria-label={`Tùy chọn lớp ${item.code}`} className="rounded p-1 text-gray-500 hover:bg-gray-100"><Icon name="dots" /></button></div></div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-y border-gray-200 py-2 text-[9px] text-gray-600"><span className="flex items-center gap-1"><Icon name="calendar" className="h-3 w-3" />{item.schedule}</span><span>•</span><span className="flex items-center gap-1"><Icon name="users" className="h-3 w-3" />Sĩ số: <b className={item.students.includes('45 / 45') ? 'text-red-600' : ''}>{item.students}</b></span><span className="flex items-center gap-1 text-green-700"><Icon name="fingerprint" className="h-3 w-3" />{item.voiceprint}</span></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px]"><span>Tiến độ khảo thí Oral: <b>{item.exams}</b></span><b className={done ? 'text-green-700' : highlighted ? 'text-indigo-700' : 'text-gray-800'}>{item.submissions}</b></div><div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-gray-200"><span className={`${done ? 'bg-green-700' : 'bg-black'}`} style={{ width: done ? '100%' : item.submissions.startsWith('93') ? '73%' : item.submissions.startsWith('88') ? '54%' : '70%' }} /><span className="bg-indigo-500" style={{ width: done ? '0%' : '18%' }} /></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9px]"><span className="text-gray-500">AI Engine: <b className="rounded bg-gray-100 px-1.5 py-1 text-gray-800">{item.engine}</b></span><span className="text-gray-600">Điểm TB AI: <b className="text-[11px] text-gray-900">{item.average}</b></span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">  <Link href={`/teacher/classes/${item.code}`} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[9px] ${highlighted ? 'border border-indigo-300 bg-indigo-50 text-indigo-800' : 'text-gray-600 hover:bg-gray-100'}`}><Icon name="roster" className="h-3.5 w-3.5" />{highlighted ? 'Chi tiết & thẩm định' : 'Danh sách SV'}</Link><button type="button" onClick={() => onAction(`Vào lớp & Chấm thi • ${item.code}`)} className="flex h-8 items-center gap-1.5 rounded-full bg-black px-3.5 text-[9px] font-semibold text-white hover:bg-gray-800"><Icon name="mic" className="h-3.5 w-3.5" />Vào lớp &amp; Chấm thi</button>{done && <button type="button" onClick={() => onAction('Kho lưu trữ bài thi')} className="flex h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-[9px]"><Icon name="folder" />Kho lưu trữ bài thi</button>}</div></article>;
}

function AdvisoryCard({ item, onAction }: { item: typeof advisoryClasses[number]; onAction: (title: string) => void }) {
  const tone = item.accent === 'green';
  return <article className="rounded-2xl border border-[#dedede] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 text-[9px]"><span className="rounded bg-gray-100 px-2 py-1 font-semibold">{item.term}</span><span className="text-gray-500">• {item.faculty}</span><span className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold ${tone ? 'border-green-300 bg-green-50 text-green-800' : 'border-indigo-300 bg-indigo-50 text-indigo-800'}`}>{item.level}</span></div><h3 className="mt-2 text-[16px] font-bold leading-tight">{item.title}</h3><div className="mt-3 rounded-xl border bg-[#f5f5f5] p-3"><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-[9px] text-gray-500">Sĩ số quản lý</p><p className="mt-1 text-[13px] font-bold">{item.count} <span className="text-[9px] font-normal text-gray-500">sinh viên</span></p><p className="mt-1 text-[9px] text-green-700">✓ 100% TK OralCheck kích hoạt</p></div><div><p className="text-[9px] text-gray-500">Lớp trưởng / Ban cán sự</p><b className="mt-1 block text-[10px]">{item.leader}</b><span className="text-[9px] text-gray-500">✉ {item.contact}</span></div></div><div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3"><div><p className="text-[9px] font-semibold text-gray-500">Học lực &amp; Rèn luyện</p><p className="mt-1 text-[10px]"><b>CPA: {item.cpa}</b> <span className="text-gray-500">| ĐRL: {item.gpa}</span></p><p className="mt-1 text-[9px] text-green-700">Xếp loại: {item.grade}</p></div><div><p className={`text-[9px] font-semibold ${tone ? 'text-gray-500' : 'text-red-600'}`}>Cảnh báo học vụ / Oral</p><p className={`mt-1 text-[10px] font-bold ${tone ? 'text-green-700' : 'text-red-600'}`}>{item.alerts}</p><p className="mt-1 text-[9px] text-gray-600">{item.alertDetail}</p></div></div></div><div className="mt-3 flex items-center gap-2 rounded-xl border bg-white p-3"><Icon name="calendar" className="h-4 w-4 shrink-0 text-gray-500" /><div className="min-w-0 flex-1"><b className="block text-[9px]">Lịch sinh hoạt lớp cố vấn tiếp theo</b><span className="text-[9px] text-gray-600">Thứ 7, 24/05 lúc 09:00 • Phòng D9-401 &amp; Online MS Teams</span></div><span className="rounded bg-gray-100 px-2 py-1 text-[8px]">Sắp diễn ra</span></div><div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4">{[['Hồ sơ Lớp','users'],['Sổ tay Cố vấn','book'],['Thông báo','message'],[tone ? 'Thống kê CPA' : 'Lên lịch họp','calendar']].map(([label, icon]) => <button key={label} type="button" onClick={() => onAction(label)} className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-[8px] ${label.startsWith('Lên lịch') || label.startsWith('Thống kê') ? 'bg-black text-white' : 'bg-[#efefef] hover:bg-gray-200'}`}><Icon name={icon as IconName} className="h-3.5 w-3.5" />{label}</button>)}</div></article>;
}
