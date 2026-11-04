'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import TeacherSidebar from '@/components/TeacherSidebar';

interface TeacherProfile {
  full_name: string;
  faculty: string;
  institutional_id: string;
}

type IconName =
  | 'overview'
  | 'classes'
  | 'exam'
  | 'recordings'
  | 'telemetry'
  | 'settings'
  | 'help'
  | 'logout'
  | 'users'
  | 'chart'
  | 'sparkles'
  | 'checkCircle'
  | 'sliders'
  | 'bell'
  | 'download'
  | 'plus'
  | 'folder'
  | 'clock'
  | 'sound'
  | 'check'
  | 'chevron'
  | 'wave'
  | 'close'
  | 'moon';

const iconPaths: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M2 9l10-5 10 5-10 5L2 9z M6 11v5c3 2 9 2 12 0v-5 M22 9v6',
  exam: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  recordings: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  telemetry: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  chart: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
  sparkles: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M2 14h4 M10 8h4 M18 16h4',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  plus: 'M12 5v14 M5 12h14',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  sound: 'M11 5 6 9H2v6h4l5 4z M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14',
  check: 'M20 6 9 17l-5-5',
  chevron: 'm9 18 6-6-6-6',
  wave: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  close: 'M18 6 6 18 M6 6l12 12',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
};

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const widthClass = /(?:^|\s)(?:w-|size-)/.test(className) ? '' : 'w-4';
  const heightClass = /(?:^|\s)(?:h-|size-)/.test(className) ? '' : 'h-4';
  return (
    <svg aria-hidden="true" className={`${widthClass} ${heightClass} shrink-0 ${className}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d={iconPaths[name]} />
    </svg>
  );
}

const demoClasses = [
  {
    code: 'KTPM-K20',
    title: 'Kiến trúc Phần mềm Nâng cao',
    description: 'Đánh giá đồ án vấn đáp microservices & fault tolerance',
    totalStudents: 48,
    badge: 'Đang mở phòng thi',
    progress: 100,
    progressLabel: '48 / 48 bài nộp',
  },
  {
    code: 'CS102',
    title: 'Lập trình Hướng đối tượng C++',
    description: 'Khảo thí oral exam thuật toán Heap, Graph & Dynamic Programming',
    totalStudents: 56,
    badge: 'Đang mở phòng thi',
    progress: 100,
    progressLabel: '56 / 56 bài nộp',
  },
];

export default function TeacherDashboard() {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('teacher'));
  const [profile, setProfile] = useState<TeacherProfile | null>(() => cachedProfile ? {
    full_name: cachedProfile.full_name ?? '',
    faculty: cachedProfile.faculty ?? '',
    institutional_id: cachedProfile.institutional_id ?? '',
  } : null);
  const [checking, setChecking] = useState(!cachedProfile);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkTeacherAccess() {
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

        if (active) {
          setProfile({
            full_name: data.full_name ?? '',
            faculty: data.faculty ?? '',
            institutional_id: data.institutional_id ?? '',
          });
        }
      } catch {
        if (active) setErrorMessage('Không thể xác minh tài khoản. Kiểm tra kết nối rồi thử lại.');
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkTeacherAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    setErrorMessage('');

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

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 text-sm text-[#667085]">
        Đang xác minh tài khoản giảng viên...
      </main>
    );
  }

  if (errorMessage && !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p role="alert" className="text-sm text-red-700">{errorMessage}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#151617] px-4 py-2 text-sm font-medium text-white">Thử lại</button>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const initials = profile.full_name.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('');
  const titleAndName = profile.full_name;

  return (
    <main className={`min-h-screen ${darkMode ? 'bg-[#eceef3] text-[#202124]' : 'bg-[#f8f8f8] text-[#202124]'}`}>
      <TeacherSidebar currentPage="overview" signingOut={signingOut} onSignOut={handleSignOut} unavailableItemsInteractive={false} onUnavailable={(title) => setActiveDialog(title)} />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[70px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#666] sm:gap-3">
            <span className="font-medium">Tổng quan</span><span>/</span><span className="font-semibold text-[#282828]">Bảng điều khiển</span>
            <span className="ml-1 hidden rounded-full border border-[#c7c1ff] bg-[#f0efff] px-2.5 py-1 text-[9px] font-semibold text-[#3430a8] sm:inline-flex">Học kỳ I • 2026-2027</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setActiveDialog('settings')} aria-label="Cài đặt nhanh" className="hidden h-8 w-8 items-center justify-center rounded-lg text-[#555] hover:bg-[#f1f1f1] sm:flex"><Icon name="sliders" className="h-[17px] w-[17px]" /></button>
            <button type="button" onClick={() => setActiveDialog('notifications')} aria-label="Thông báo" className="relative hidden h-8 w-8 items-center justify-center rounded-lg text-[#555] hover:bg-[#f1f1f1] sm:flex"><Icon name="bell" className="h-[17px] w-[17px]" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#078344]" /></button>
            <button type="button" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Tắt chế độ dịu mắt' : 'Bật chế độ dịu mắt'} className="hidden h-8 w-8 items-center justify-center rounded-lg text-[#555] hover:bg-[#f1f1f1] sm:flex"><Icon name="moon" className="h-[17px] w-[17px]" /></button>
            <div className="hidden h-8 w-px bg-[#e6e6e6] sm:block" />
            <button type="button" onClick={() => router.push('/teacher/profile')} className="flex items-center gap-2 rounded-2xl border border-[#e3e3e3] bg-white py-1 pl-2 pr-2.5 text-left hover:bg-[#fafafa]">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#c9c4ff] bg-[#f0efff] text-[12px] font-bold text-[#3d35ae]">{initials}<i className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-[#09854e]" /></span>
              <span className="hidden sm:block"><span className="block max-w-[150px] truncate text-[10px] font-semibold">{titleAndName}</span><span className="block max-w-[150px] truncate text-[9px] text-[#666]">Giảng viên • {profile.faculty || 'Khoa'}</span></span>
              <span className="hidden text-[15px] leading-none text-[#777] sm:inline">⋮</span>
            </button>
            <button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Đăng xuất" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dedede] text-[#555] hover:bg-[#f4f4f4] disabled:opacity-60 md:hidden"><Icon name="logout" className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 pb-8 pt-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dedede] pb-3">
            <div>
              <h1 className="text-[23px] font-bold tracking-tight sm:text-[28px]">Xin chào, {titleAndName}! 🎓</h1>
              <p className="mt-1 text-[12px] text-[#5f6063]">Tổng hợp tình hình các lớp khảo thí âm học và các bài thi cần thẩm định điểm hôm nay.</p>
              <span className="mt-2 inline-flex rounded-full border border-[#eadcae] bg-[#fff9e9] px-2 py-0.5 text-[8px] font-semibold text-[#81621c]">DỮ LIỆU DASHBOARD MINH HỌA</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/teacher/profile" className="flex h-10 items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100"><Icon name="users" className="h-4 w-4" />Hồ sơ cá nhân</Link>
              <button type="button" onClick={() => setActiveDialog('report')} className="flex h-10 items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-4 text-[11px] font-medium hover:bg-[#f6f6f6]"><Icon name="download" className="h-4 w-4" />Xuất báo cáo tổng hợp</button>
            </div>
          </div>

          {errorMessage && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{errorMessage}</p>}

          <section aria-label="Thống kê dashboard demo" className="mt-6 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Tổng số sinh viên" value="186" icon="users" iconStyle="gray" />
            <MetricCard title="Bài thi chờ thẩm định" value="0" note="bài nộp mới" icon="checkCircle" iconStyle="green" footer="Tất cả bài thi đã được xử lý" green />
            <MetricCard title="Đồng thuận AI - Giảng viên" value="97.2%" icon="sparkles" iconStyle="purple" footer="Độ tương thích Rubric cao" green delta="+0.8%" />
            <MetricCard title="Điểm trung bình khóa" value="8.15" icon="chart" iconStyle="gray" suffix="/ 10.0" />
          </section>

          <div className="mt-6 grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1.42fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-[17px] font-bold">Bài thi vấn đáp cần chấm điểm</h2><p className="mt-1 text-[11px] text-[#666]">Các bài phát âm được AI chấm sơ bộ, chờ giảng viên xác thực và ký số.</p></div>
                  <span className="flex items-center gap-1.5 rounded-lg border border-[#8ee0b6] bg-[#effaf4] px-3 py-2 text-[10px] font-semibold text-[#087b48]"><Icon name="checkCircle" className="h-4 w-4" />0 bài tồn đọng</span>
                </div>
                <div className="mt-5 flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d9d9d9] bg-[#fdfdfd] px-5 py-8 text-center">
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#a5e8c5] bg-[#eafaf2] text-[#087b48]"><Icon name="wave" className="h-9 w-9" /><span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#087b48] text-white"><Icon name="checkCircle" className="h-4 w-4" /></span></span>
                  <h3 className="mt-5 text-[15px] font-bold">Không có bài thi nào đang chờ thẩm định</h3>
                  <p className="mt-2 max-w-[520px] text-[11px] leading-relaxed text-[#666]">Tất cả bài thi vấn đáp âm học từ các lớp học phần KTPM-K20 và CS102 đã được giảng viên thẩm định và ký duyệt số PKI HSM thành công.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button type="button" onClick={() => router.push('/teacher/assignments/create')} className="flex h-9 items-center gap-2 rounded-full bg-[#4f46e5] px-4 text-[10px] font-semibold text-white hover:bg-indigo-700 shadow-sm"><Icon name="plus" className="h-4 w-4" />Tạo đợt khảo thí mới</button>
                    <button type="button" onClick={() => router.push('/teacher/evaluations/CS102-MID-2024-03')} className="flex h-9 items-center gap-2 rounded-full bg-[#090909] px-4 text-[10px] font-semibold text-white hover:bg-[#333] shadow-sm"><Icon name="wave" className="h-4 w-4 text-indigo-400" />Vào thẩm định bài thi mẫu (CS102 - Trần Minh Đức)</button>
                    <button type="button" onClick={() => setActiveDialog('recordings')} className="flex h-9 items-center gap-2 rounded-full border border-[#d0d0d0] bg-white px-4 text-[10px] font-medium hover:bg-[#f5f5f5]"><Icon name="folder" className="h-4 w-4" />Xem kho lưu trữ bản ghi âm</button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="text-[17px] font-bold">Lớp học đang phụ trách</h2><p className="mt-1 text-[11px] text-[#666]">Tiến độ hoàn thành ca thi vấn đáp theo từng học phần.</p></div>
                  <button type="button" onClick={() => router.push('/teacher/classes')} className="flex items-center gap-1 text-[10px] font-medium hover:underline">Xem tất cả lớp <span aria-hidden="true">→</span></button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {demoClasses.map((classItem) => (
                    <article
                      key={classItem.code}
                      onClick={() => router.push(`/teacher/classes/${classItem.code}`)}
                      className="cursor-pointer rounded-xl border border-[#dedede] bg-[#fdfdfd] p-4 transition hover:border-indigo-300 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[9px]">
                        <span className="rounded border border-[#d6d1ff] bg-[#f2f0ff] px-2 py-1 font-semibold text-[#4942b4]">Mã: {classItem.code}</span>
                        <span className="flex items-center gap-1 text-[#126d43]"><i className="h-1.5 w-1.5 rounded-full bg-[#078344]" />{classItem.badge}</span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-bold leading-snug">{classItem.title}</h3>
                      <p className="mt-1.5 min-h-[32px] text-[10px] leading-relaxed text-[#666]">{classItem.description}</p>
                      <div className="mt-3 border-t border-[#e5e5e5] pt-3">
                        <div className="flex justify-between text-[10px]"><span className="text-[#666]">Tiến độ chấm:</span><b className="font-semibold text-[#181818]">{classItem.progressLabel}</b></div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e8e8e8]"><div className="h-full rounded-full bg-[#111]" style={{ width: `${classItem.progress}%` }} /></div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
                <h2 className="text-[15px] font-bold">Thao tác quản trị ca thi</h2>
                <div className="mt-3 space-y-2">
                  <button type="button" onClick={() => router.push('/teacher/assignments/create')} className="flex h-9 w-full items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100 transition"><span className="flex items-center gap-2"><Icon name="plus" className="h-4 w-4 text-indigo-600" />Tạo đợt khảo thí âm học mới</span><Icon name="chevron" className="h-3.5 w-3.5 text-indigo-400" /></button>
                  <button type="button" onClick={() => router.push('/teacher/evaluations/CS102-MID-2024-03')} className="flex h-9 w-full items-center justify-between rounded-xl border border-[#d8d8d8] bg-white px-3.5 text-[11px] font-medium text-[#222] hover:bg-[#f6f6f6]"><span className="flex items-center gap-2"><Icon name="wave" className="h-4 w-4 text-indigo-600" />Thẩm định bài thi mẫu</span><Icon name="chevron" className="h-3.5 w-3.5 text-[#999]" /></button>
                  <button type="button" onClick={() => setActiveDialog('recordings')} className="flex h-9 w-full items-center justify-between rounded-xl border border-[#d8d8d8] bg-white px-3.5 text-[11px] font-medium text-[#222] hover:bg-[#f6f6f6]"><span className="flex items-center gap-2"><Icon name="folder" className="h-4 w-4" />Kho lưu trữ bản ghi âm FLAC</span><Icon name="chevron" className="h-3.5 w-3.5 text-[#999]" /></button>
                  <button type="button" onClick={() => setActiveDialog('exportScore')} className="flex h-9 w-full items-center justify-between rounded-xl border border-[#d8d8d8] bg-white px-3.5 text-[11px] font-medium text-[#222] hover:bg-[#f6f6f6]"><span className="flex items-center gap-2"><Icon name="download" className="h-4 w-4" />Xuất bảng điểm LMS / Moodle</span><Icon name="chevron" className="h-3.5 w-3.5 text-[#999]" /></button>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold">Trạng thái hạ tầng Khảo thí AI</h2>
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-[#098347]"><i className="h-1.5 w-1.5 rounded-full bg-[#078344]" />Hoạt động ổn định</span>
                </div>
                <div className="mt-4 space-y-3 text-[10px]">
                  <div className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-2.5">
                    <span className="flex items-center gap-2"><Icon name="sound" className="h-3.5 w-3.5 text-[#555]" />Khử ồn Whisper ASR Realtime</span>
                    <b className="text-[#078344]">Độ trễ: 12ms</b>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-2.5">
                    <span className="flex items-center gap-2"><Icon name="sparkles" className="h-3.5 w-3.5 text-[#555]" />Mô hình Rubric LLM Đánh giá</span>
                    <b className="text-[#078344]">Sẵn sàng (v2.4)</b>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {activeDialog && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs" onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveDialog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="teacher-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 id="teacher-dialog-title" className="text-base font-bold text-[#1f2024]">Thông báo hệ thống</h2>
              <button type="button" onClick={() => setActiveDialog(null)} className="rounded-lg p-1 text-[#666] hover:bg-gray-100"><Icon name="close" /></button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#555]">Tính năng <b>{activeDialog}</b> đang ở chế độ xem trước dữ liệu mẫu. Dữ liệu thực sẽ được kết nối theo lịch thi của phòng đào tạo.</p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setActiveDialog(null)} className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">Đã hiểu</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MetricCard({ title, value, suffix, note, footer, icon, iconStyle, green = false, delta }: { title: string; value: string; suffix?: string; note?: string; footer?: string; icon: IconName; iconStyle: 'gray' | 'green' | 'purple'; green?: boolean; delta?: string }) {
  const iconBg = {
    gray: 'bg-[#f0f0f0] text-[#555]',
    green: 'bg-[#effaf4] text-[#087b48]',
    purple: 'bg-[#f0efff] text-[#4239b8]',
  }[iconStyle];

  return (
    <article className="rounded-2xl border border-[#dedede] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#666]">{title}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}><Icon name={icon} className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <b className="text-[26px] font-bold leading-none tracking-tight">{value}</b>
        {suffix && <span className="text-[11px] text-[#777]">{suffix}</span>}
        {note && <span className="text-[11px] text-[#777]">{note}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] pt-2 text-[10px]">
        {footer && <span className={green ? 'font-medium text-[#078344]' : 'text-[#777]'}>{footer}</span>}
        {delta && <span className="font-semibold text-[#078344]">{delta}</span>}
      </div>
    </article>
  );
}
