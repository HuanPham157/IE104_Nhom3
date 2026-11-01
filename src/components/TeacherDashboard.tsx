'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import TeacherSidebar from '@/components/TeacherSidebar';

interface TeacherProfile {
  full_name: string;
  faculty: string;
  institutional_id: string;
}

type IconName =
  | 'overview' | 'classes' | 'exam' | 'recordings' | 'telemetry' | 'settings' | 'help' | 'logout'
  | 'sliders' | 'bell' | 'moon' | 'users' | 'checkCircle' | 'sparkles' | 'chart' | 'wave' | 'file'
  | 'folder' | 'plus' | 'headphones' | 'play' | 'rewind' | 'forward' | 'microphone'
  | 'mail' | 'key' | 'download' | 'close';

const iconPaths: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M2 9l10-5 10 5-10 5L2 9z M6 11v5c3 2 9 2 12 0v-5 M22 9v6',
  exam: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  recordings: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  telemetry: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.7.67l-.05.07h-3.4l-.05-.07a1.7 1.7 0 0 0-1.7-.67l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.6 15l-.09-.03v-3.4l.09-.03a1.7 1.7 0 0 0-.34-1.88L9.2 9.6l1.7-2.94.08.02a1.7 1.7 0 0 0 1.7-.67l.05-.07h3.4l.05.07a1.7 1.7 0 0 0 1.7.67l.08-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.4 12l.09.03v3.4z',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M2 14h4 M10 8h4 M18 16h4',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3',
  sparkles: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z M19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z',
  chart: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
  wave: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  folder: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8',
  plus: 'M12 5v14 M5 12h14',
  headphones: 'M3 14v-3a9 9 0 0 1 18 0v3 M3 14h4v7H5a2 2 0 0 1-2-2z M17 14h4v5a2 2 0 0 1-2 2h-2z',
  play: 'm7 4 13 8-13 8z',
  rewind: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  forward: 'M21 12a9 9 0 1 1-2.64-6.36L21 8 M21 3v5h-5 M12 17v-5l-3-2',
  microphone: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  mail: 'M4 4h16v16H4z M22 6l-10 7L2 6',
  key: 'M21 2l-2 2 M7.5 14.5 3 19v3h3l4.5-4.5 M16 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  close: 'M18 6 6 18 M6 6l12 12',
};

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d={iconPaths[name]} />
    </svg>
  );
}

interface DemoClass {
  code: string;
  title: string;
  description: string;
  badge: string;
  status: string;
  submitted: string;
}

const demoClasses: DemoClass[] = [
  {
    code: 'AIO-8892',
    title: 'KTPM-K20: Kiến trúc Phần mềm',
    description: 'Đợt thi vấn đáp chuyên đề kiến trúc microservice.',
    badge: 'Đã chốt kết quả',
    status: '50 / 50 SV (100%)',
    submitted: '50 / 50 SV',
  },
  {
    code: 'CS-1020',
    title: 'CS102: Lập trình Hướng đối tượng',
    description: 'Khảo thí âm học phân tích mã nguồn và tính đa hình C++.',
    badge: 'Đã thẩm định xong',
    status: '62 / 62 SV (100%)',
    submitted: '62 / 62 SV',
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
            <button type="button" onClick={() => setActiveDialog('profile')} className="flex items-center gap-2 rounded-2xl border border-[#e3e3e3] bg-white py-1 pl-2 pr-2.5 text-left hover:bg-[#fafafa]">
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
            <button type="button" onClick={() => setActiveDialog('report')} className="flex h-10 items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-4 text-[11px] font-medium hover:bg-[#f6f6f6]"><Icon name="download" className="h-4 w-4" />Xuất báo cáo tổng hợp</button>
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
                    <button type="button" onClick={() => setActiveDialog('recordings')} className="flex h-9 items-center gap-2 rounded-full border border-[#d0d0d0] bg-white px-4 text-[10px] font-medium hover:bg-[#f5f5f5]"><Icon name="folder" className="h-4 w-4" />Xem kho lưu trữ bản ghi âm</button>
                    <button type="button" onClick={() => setActiveDialog('newExam')} className="flex h-9 items-center gap-2 rounded-full bg-[#090909] px-4 text-[10px] font-medium text-white hover:bg-[#333]"><Icon name="plus" className="h-4 w-4" />Tạo đợt khảo thí mới</button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="text-[17px] font-bold">Lớp học đang phụ trách</h2><p className="mt-1 text-[11px] text-[#666]">Tiến độ hoàn thành ca thi vấn đáp theo từng học phần.</p></div>
                  <button type="button" onClick={() => setActiveDialog('classes')} className="flex items-center gap-1 text-[10px] font-medium hover:underline">Xem tất cả lớp <span aria-hidden="true">→</span></button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {demoClasses.map((classItem) => (
                    <article key={classItem.code} className="rounded-xl border border-[#dedede] bg-[#fdfdfd] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[9px]">
                        <span className="rounded border border-[#d6d1ff] bg-[#f2f0ff] px-2 py-1 font-semibold text-[#4942b4]">Mã: {classItem.code}</span>
                        <span className="flex items-center gap-1 text-[#126d43]"><i className="h-1.5 w-1.5 rounded-full bg-[#078344]" />{classItem.badge}</span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-bold leading-snug">{classItem.title}</h3>
                      <p className="mt-1.5 min-h-[32px] text-[10px] leading-relaxed text-[#666]">{classItem.description}</p>
                      <div className="mt-3 border-t border-[#e5e5e5] pt-3">
                        <div className="flex items-center justify-between gap-2 text-[10px]"><span className="text-[#686868]">Tiến độ nộp &amp; duyệt bài:</span><strong className="text-[#087b48]">{classItem.status}</strong><Icon name="checkCircle" className="h-3.5 w-3.5 text-[#087b48]" /></div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7e7e7]"><div className="h-full w-full rounded-full bg-[#087b48]" /></div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#e6e6e6] pb-3">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f0f0]"><Icon name="wave" className="h-4 w-4" /></span>AI Chấm điểm thời gian thực</h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#f0f0f0] px-3 py-2 text-[9px] text-[#555]"><i className="h-1.5 w-1.5 rounded-full bg-[#078344]" />Sẵn sàng đón ca thi mới</span>
                </div>
                <div className="mt-3 space-y-2.5 text-[10px]">
                  <StatusRow label="Trạng thái công cụ:" value="Idle / Standby mode" green />
                  <StatusRow label="Model phân tích:" value="Whisper Auralis V4 (Sẵn sàng)" purple />
                  <StatusRow label="Độ trễ phản hồi:" value="< 50ms (Tối ưu)" />
                </div>
                <div className="mt-4 rounded-xl border border-[#e0e0e0] bg-[#fafafa] p-3">
                  <div className="flex justify-between gap-3 text-[9px] text-[#777]"><span>Phân tích phổ âm thanh<br />(STFT Standby)</span><span>48.0 kHz • 24-bit (Đang lắng nghe)</span></div>
                  <div aria-label="Biểu đồ âm thanh demo" className="mt-5 flex h-8 items-end gap-1 overflow-hidden">
                    {[8, 10, 9, 12, 8, 7, 9, 12, 7, 8, 6, 10, 8, 11, 7, 9, 12, 8, 6, 10, 7, 11, 8, 9].map((height, index) => <span key={index} className="min-w-[7px] flex-1 rounded-t-sm bg-[#c4c7c7]" style={{ height: `${height * 2}px` }} />)}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2 border-b border-[#e6e6e6] pb-3">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f0f0]"><Icon name="file" className="h-4 w-4" /></span>Yêu cầu phúc khảo mới</h2>
                  <span className="rounded-full border border-[#93dfb6] bg-[#effaf4] px-2.5 py-1 text-[9px] font-semibold text-[#087b48]">0 đơn chờ</span>
                </div>
                <div className="mt-3 flex min-h-[154px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dedede] bg-[#fdfdfd] px-4 py-5 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f0f0] text-[#555]"><Icon name="mail" className="h-4 w-4" /></span>
                  <h3 className="mt-2 text-[11px] font-semibold">Không có khiếu nại hoặc phúc khảo tồn đọng</h3>
                  <p className="mt-1 max-w-[300px] text-[10px] leading-relaxed text-[#777]">Tất cả phản hồi và thắc mắc điểm số của sinh viên các học phần đã được giải quyết thỏa đáng.</p>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 border-b border-[#e6e6e6] pb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0efff] text-[#4942b4]"><Icon name="key" className="h-4 w-4" /></span><h2 className="text-[13px] font-bold">Chứng thư số &amp; Ký duyệt nhanh</h2>
                </div>
                <div className="mt-3 space-y-2 rounded-xl border border-[#e0e0e0] bg-[#fafafa] p-3 text-[10px]">
                  <StatusRow label="Token HSM Cloud:" value="Sẵn sàng" green />
                  <StatusRow label="Dấu thời gian (TSA):" value="RFC 3161 Sync" />
                  <StatusRow label="Trạng thái ký:" value="Toàn bộ bảng điểm đã ký số" green />
                </div>
                <button type="button" onClick={() => setActiveDialog('signatures')} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d2d2d2] text-[10px] font-semibold hover:bg-[#f5f5f5]"><Icon name="checkCircle" className="h-4 w-4 text-[#087b48]" />Đã hoàn tất ký số toàn bộ</button>
              </section>
            </aside>
          </div>

          <section aria-label="Trình nghe bản thu âm demo" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#dedede] bg-white px-4 py-3 shadow-[0_2px_5px_rgba(0,0,0,0.08)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0f0f0] text-[#555]"><Icon name="headphones" className="h-5 w-5" /></span>
            <div className="min-w-[180px] flex-1"><p className="text-[10px] font-semibold">Trình nghe bản thu âm: <span className="font-normal text-[#777]">Chế độ chờ</span></p><p className="mt-1 text-[10px] text-[#777]">Chưa chọn bản thu nào để phát. Bấm vào bài thi trong kho lưu trữ để kiểm tra phổ âm.</p></div>
            <div className="flex items-center gap-2 text-[#9a9a9a]">
              <button type="button" onClick={() => setActiveDialog('player')} aria-label="Tua lùi" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f1f1f1]"><Icon name="rewind" className="h-4 w-4" /></button>
              <button type="button" onClick={() => setActiveDialog('player')} aria-label="Phát bản thu" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f1f1] hover:bg-[#e8e8e8]"><Icon name="play" className="h-4 w-4" /></button>
              <button type="button" onClick={() => setActiveDialog('player')} aria-label="Tua tới" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f1f1f1]"><Icon name="forward" className="h-4 w-4" /></button>
            </div>
            <span className="hidden text-[10px] text-[#888] sm:inline">--:-- / --:--</span>
            <span className="hidden h-7 w-px bg-[#e5e5e5] sm:block" />
            <button type="button" onClick={() => setActiveDialog('recordings')} className="flex h-10 items-center gap-2 rounded-full border border-[#d5d5d5] px-3 text-[10px] text-[#555] hover:bg-[#f5f5f5]"><Icon name="folder" className="h-4 w-4" />Kho bản ghi âm</button>
          </section>
        </div>
      </div>

      {activeDialog && <TeacherPreviewDialog type={activeDialog} onClose={() => setActiveDialog(null)} />}
    </main>
  );
}

function MetricCard({ title, value, icon, iconStyle, note, footer, green = false, delta, suffix }: {
  title: string;
  value: string;
  icon: IconName;
  iconStyle: 'gray' | 'green' | 'purple';
  note?: string;
  footer?: string;
  green?: boolean;
  delta?: string;
  suffix?: string;
}) {
  const iconClass = iconStyle === 'green' ? 'bg-[#e8f8ef] text-[#078344]' : iconStyle === 'purple' ? 'bg-[#f0efff] text-[#5449c6]' : 'bg-[#eeeeee] text-[#333]';
  return (
    <article className={`min-h-[142px] rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${iconStyle === 'green' ? 'border-[#c9ebd7]' : 'border-[#e1e1e1]'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="max-w-[170px] text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-[#484848]">{title}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon name={icon} className="h-[17px] w-[17px]" /></span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <strong className="text-[39px] leading-none tracking-tight">{value}</strong>
        {note && <span className="text-[10px] text-[#666]">{note}</span>}
        {suffix && <span className="text-[10px] text-[#555]">{suffix}</span>}
        {delta && <span className="text-[10px] font-semibold text-[#078344]">{delta}</span>}
      </div>
      {footer && <div className={`mt-2 flex items-center gap-1.5 text-[10px] ${green ? 'text-[#087b48]' : 'text-[#666]'}`}>{green && <Icon name="checkCircle" className="h-3.5 w-3.5" />}{!green && <span className="h-1.5 w-1.5 rounded-full bg-[#087b48]" />}{footer}</div>}
    </article>
  );
}

function StatusRow({ label, value, green = false, purple = false }: { label: string; value: string; green?: boolean; purple?: boolean }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f2f2f2] px-2.5 py-2"><span className="text-[#606060]">{label}</span><span className={`font-semibold ${green ? 'text-[#087b48]' : purple ? 'text-[#292493]' : 'text-[#333]'}`}>{green && <span aria-hidden="true">✓ </span>}{purple && <span aria-hidden="true" className="text-[#7167ff]">• </span>}{value}</span></div>;
}

function TeacherPreviewDialog({ type, onClose }: { type: string; onClose: () => void }) {
  const details: Record<string, { title: string; body: string }> = {
    settings: { title: 'Cài đặt nhanh', body: 'Các tùy chọn hệ thống đang được minh họa theo dashboard thiết kế.' },
    notifications: { title: 'Thông báo', body: 'Danh sách thông báo đang là dữ liệu minh họa.' },
    profile: { title: 'Hồ sơ giảng viên', body: 'Hồ sơ thật được lấy từ Supabase. Các số liệu dashboard còn lại là dữ liệu minh họa.' },
    report: { title: 'Xuất báo cáo tổng hợp', body: 'Chức năng xuất báo cáo chưa được kết nối với dữ liệu khảo thí.' },
    recordings: { title: 'Kho bản ghi âm', body: 'Kho bản ghi âm sẽ khả dụng khi hệ thống có dữ liệu bài nộp.' },
    newExam: { title: 'Tạo đợt khảo thí mới', body: 'Chức năng tạo đợt khảo thí chưa được triển khai.' },
    classes: { title: 'Lớp học đang phụ trách', body: 'Các lớp và số liệu trên dashboard hiện là dữ liệu minh họa.' },
    signatures: { title: 'Chứng thư số & ký duyệt', body: 'Tích hợp HSM/TSA chưa được kết nối với dự án hiện tại.' },
    player: { title: 'Trình nghe bản thu âm', body: 'Chưa có bản ghi âm thật để phát.' },
  };
  const detail = details[type] ?? details.profile;

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="teacher-preview-title" className="w-full max-w-md rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-[#fff8e6] px-2 py-1 text-[9px] font-semibold text-[#866313]">BẢN XEM TRƯỚC</span><h2 id="teacher-preview-title" className="mt-2 text-[17px] font-bold">{detail.title}</h2></div><button type="button" onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] hover:bg-[#f2f2f2]"><Icon name="close" className="h-4 w-4" /></button></div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#666]">{detail.body}</p>
        <button type="button" onClick={onClose} className="mt-5 h-9 rounded-lg bg-[#111] px-4 text-[11px] font-semibold text-white hover:bg-[#333]">Đã hiểu</button>
      </section>
    </div>
  );
}
