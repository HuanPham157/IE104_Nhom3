'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import StudentSidebar from '@/components/StudentSidebar';

interface StudentProfile {
  full_name: string;
  institutional_id: string;
}

type IconName = 'overview' | 'classes' | 'assignments' | 'mic' | 'history' | 'settings' | 'logout' | 'search' | 'qr' | 'play' | 'clock' | 'calendar' | 'chart' | 'fire' | 'star' | 'users' | 'check' | 'brain' | 'award' | 'book' | 'sound' | 'chevron' | 'close';

const icons: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  assignments: 'M9 5h10 M9 12h10 M9 19h10 M4 5h.01 M4 12h.01 M4 19h.01',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  search: 'm21 21-4.34-4.34 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z',
  qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v2 M17 20h4 M20 18v3',
  play: 'm7 4 13 8-13 8z',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
  chart: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
  fire: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-3 3-4 6-4 9a7 7 0 0 0 7 7z',
  star: 'm12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87',
  check: 'M20 6 9 17l-5-5',
  brain: 'M12 18V5 M12 8a3 3 0 0 0-5.8-1 3.5 3.5 0 0 0-1.7 6.4A3.5 3.5 0 0 0 7 20h5 M12 8a3 3 0 0 1 5.8-1 3.5 3.5 0 0 1 1.7 6.4A3.5 3.5 0 0 1 17 20h-5',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8.2 14.7 7 22l5-3 5 3-1.2-7.3',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  sound: 'M11 5 6 9H2v6h4l5 4z M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14',
  chevron: 'm9 18 6-6-6-6',
  close: 'M18 6 6 18 M6 6l12 12',
};

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const widthClass = /(?:^|\s)(?:w-|size-)/.test(className) ? '' : 'w-4';
  const heightClass = /(?:^|\s)(?:h-|size-)/.test(className) ? '' : 'h-4';
  return <svg aria-hidden="true" className={`${widthClass} ${heightClass} shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d={icons[name]} /></svg>;
}

const upcoming = [
  { code: 'CS101 • Tuần 5', title: 'Giải thuật Dijkstra & Cây khung nhỏ nhất', due: 'Hạn chót: 23:59 hôm nay', info: 'Thời lượng: 2 phút', language: 'Song ngữ Anh/Việt', urgent: true },
  { code: 'CS101 • Tuần 6', title: 'Quy hoạch động & Bài toán Ba lô (Knapsack Problem)', due: 'Mở sau 2 ngày (08:00 Thứ Sáu)', info: 'Thời lượng: 3 phút', language: 'Hội đồng AI: Thang rubric 4 cấp độ', urgent: false },
];

const courses = [
  { code: 'CS101', title: 'Cấu trúc Dữ liệu & Giải thuật', teacher: 'TS. Nguyễn Văn A', progress: 85, students: 45, tasks: 14, color: 'bg-[#111]' },
  { code: 'ENG-IT', title: 'Tiếng Anh Chuyên ngành IT', teacher: 'ThS. Trần Mai Lan', progress: 70, students: 38, tasks: 10, color: 'bg-[#7167ff]' },
];

function DemoDialog({ title, onClose }: { title: string; onClose: () => void }) {
  return <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="student-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between"><div><span className="rounded-full bg-[#fff8e6] px-2 py-1 text-[9px] font-semibold text-[#866313]">BẢN XEM TRƯỚC</span><h2 id="student-dialog-title" className="mt-2 text-lg font-bold">{title}</h2></div><button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-gray-100"><Icon name="close" /></button></div><p className="mt-3 text-sm leading-relaxed text-gray-600">Chức năng này đang được thiết kế. Các thông tin trên dashboard là dữ liệu minh họa, chưa được kết nối với Supabase.</p><button type="button" onClick={onClose} className="mt-5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white">Đã hiểu</button></section></div>;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('student'));
  const [profile, setProfile] = useState<StudentProfile | null>(() => cachedProfile ? {
    full_name: cachedProfile.full_name ?? '',
    institutional_id: cachedProfile.institutional_id ?? '',
  } : null);
  const [checking, setChecking] = useState(!cachedProfile);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialog, setDialog] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkStudentAccess() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.replace('/login');
          return;
        }
        const studentProfile = await getCachedProfile(session.user.id);
        if (studentProfile.role !== 'student') {
          router.replace(studentProfile.role === 'teacher' ? '/teacher' : '/login');
          return;
        }
        if (active) setProfile({ full_name: studentProfile.full_name ?? '', institutional_id: studentProfile.institutional_id ?? '' });
      } catch {
        if (active) setErrorMessage('Không thể xác minh tài khoản. Vui lòng kiểm tra kết nối và thử lại.');
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkStudentAccess();
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

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] text-sm text-gray-600">Đang xác minh tài khoản sinh viên...</main>;
  if (errorMessage && !profile) return <main className="flex min-h-screen items-center justify-center p-5"><div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center"><p role="alert" className="text-sm text-red-700">{errorMessage}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Thử lại</button></div></main>;
  if (!profile) return null;

  const name = profile.full_name || 'Sinh viên';
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <StudentSidebar currentPage="overview" fullName={name} institutionalId={profile.institutional_id} signingOut={signingOut} interactiveUnavailable onSignOut={handleSignOut} onUnavailable={(action) => {
        const titles = { classes: 'Lớp học của tôi', audio: 'Phòng thu âm AI', history: 'Lịch sử & Bảng xếp hạng', settings: 'Cài đặt' };
        setDialog(titles[action]);
      }} />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[62px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="min-w-0 text-[11px] text-gray-500">Phân hệ Sinh viên <span className="mx-1">›</span> <b className="text-gray-800">Trang chủ Tổng quan</b></div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setDialog('Tham gia lớp học mới bằng mã')} className="hidden h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-[11px] font-medium hover:bg-gray-50 sm:flex"><Icon name="qr" />Tham gia lớp học mới bằng mã</button>
            <button type="button" onClick={() => setDialog('Audio Lab')} className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-[10px] font-semibold text-white hover:bg-gray-800"><Icon name="mic" className="text-indigo-400" /><span className="hidden sm:inline">Vào phòng thi thử nghiệm (Audio Lab)</span><span className="sm:hidden">Audio Lab</span></button>
            <button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Đăng xuất" className="flex h-9 w-9 items-center justify-center rounded-full border md:hidden"><Icon name="logout" /></button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          <section className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
            <div><h1 className="text-[24px] font-bold leading-tight sm:text-[28px]">Chào buổi sáng, {name}! 👋</h1><p className="mt-2 text-[13px] text-gray-600">Hôm nay bạn có <b className="text-red-600">2 bài tập vấn đáp AI</b> cần hoàn thành trước thời hạn.</p><span className="mt-2 inline-flex rounded-full border border-[#eadcae] bg-[#fff9e9] px-2 py-0.5 text-[8px] font-semibold text-[#81621c]">DỮ LIỆU DASHBOARD MINH HỌA</span></div>
            <span className="rounded-full border border-[#94dfb7] bg-[#effaf4] px-3 py-1.5 text-[10px] font-semibold text-[#087b48]">Kỳ 1 • 2024</span>
          </section>

          <section aria-label="Thống kê học tập minh họa" className="mt-5 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 2xl:grid-cols-4">
            <StudentMetric title="Điểm GPA Vấn đáp" value="8.8" suffix="/ 10.0" footer="+0.3 • Top 5% toàn lớp" icon="star" />
            <StudentMetric title="Bài tập Oral" value="12" suffix="/ 14 hoàn thành" footer="85.7% (2 bài mở)" icon="users" progress />
            <StudentMetric title="Mức độ hiểu bài & Barem AI" value="92%" suffix="mức độ hiểu" footer="Ý đúng: 4/4 • Độ mạch lạc: Tốt" icon="sound" />
            <StudentMetric title="Huy hiệu & Chuỗi học tập" value="7 ngày" suffix="liên tiếp 🔥" footer='Danh hiệu "Bậc thầy diễn đạt"' icon="fire" />
          </section>

          <div className="mt-5 grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1.8fr)_minmax(290px,0.9fr)]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3"><h2 className="flex items-center gap-2 text-[17px] font-bold"><Icon name="clock" className="text-red-600" />Bài tập vấn đáp cần nộp gấp (Deadlines)</h2><span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-semibold text-red-600">2 bài chờ thực hiện</span></div>
                <div className="mt-4 space-y-3">
                  {upcoming.map((item) => <article key={item.code} className={`rounded-xl border p-4 ${item.urgent ? 'border-[#f2b1b1] bg-[#fffafa]' : 'border-[#e2e2e2] bg-[#fafafa]'}`}><div className="flex flex-wrap items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.urgent ? 'bg-[#fde8e8] text-red-600' : 'bg-[#efefef] text-gray-600'}`}><Icon name={item.urgent ? 'mic' : 'calendar'} /></span><div className="min-w-0 flex-1"><span className="rounded bg-[#111] px-2 py-1 text-[9px] font-semibold text-white">{item.code}</span><p className={`mt-2 text-[11px] font-semibold ${item.urgent ? 'text-red-600' : 'text-gray-600'}`}>{item.due}</p><h3 className="mt-1 text-[15px] font-bold">{item.title}</h3><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600"><span className="flex items-center gap-1"><Icon name="clock" className="h-3 w-3" />{item.info}</span><span>•</span><span>{item.language}</span></div>{item.urgent && <p className="mt-2 text-[10px] text-gray-500">Tiêu chí: Độ trôi chảy, Kiến trúc thuật toán</p>}</div>{item.urgent ? <button type="button" onClick={() => setDialog('Phòng thu âm AI')} className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-[10px] font-semibold text-white hover:bg-gray-800"><Icon name="play" className="h-3.5 w-3.5 text-indigo-400" />Vào phòng thu âm ngay</button> : <button type="button" disabled className="h-9 rounded-full border bg-white px-4 text-[10px] text-gray-500">Chưa mở đề thi</button>}</div></article>)}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3"><h2 className="flex items-center gap-2 text-[17px] font-bold"><Icon name="classes" />Lớp học đang ghi danh</h2><button type="button" onClick={() => setDialog('Lớp học của tôi')} className="text-[10px] font-semibold text-indigo-800 hover:underline">Xem tất cả (2) →</button></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">{courses.map((course) => <article key={course.code} className="rounded-xl border border-[#e0e0e0] bg-[#fafafa] p-4"><div className="flex justify-between"><span className="rounded bg-[#eee] px-2 py-0.5 text-[9px] font-semibold">{course.code}</span><span className="rounded-full border border-[#98dfb9] bg-[#eefaf3] px-2 py-0.5 text-[9px] font-semibold text-[#087b48]">Đang học</span></div><h3 className="mt-3 truncate text-[14px] font-bold">{course.title}</h3><p className="mt-1 flex items-center gap-1 text-[10px] text-gray-600"><Icon name="users" className="h-3 w-3" />Giảng viên: {course.teacher}</p><div className="mt-3 border-t border-gray-200 pt-3"><div className="flex justify-between text-[10px]"><span className="text-gray-600">Tiến độ vấn đáp</span><b>{course.progress}%</b></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className={`h-full rounded-full ${course.color}`} style={{ width: `${course.progress}%` }} /></div><div className="mt-2 flex justify-between text-[9px] text-gray-500"><span>{course.students} sinh viên</span><span>{course.tasks} bài tập oral</span></div></div></article>)}</div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3"><div><p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Báo cáo đánh giá</p><h2 className="text-[17px] font-bold">Bài nộp gần nhất đã có điểm</h2></div><span className="rounded-full border border-[#c9c4ff] bg-[#f0efff] px-3 py-1 text-[9px] font-bold text-indigo-800">ĐÃ THẨM ĐỊNH BỞI GIẢNG VIÊN</span></div>
                <article className="mt-4 rounded-xl border border-[#e0e0e0] bg-[#fafafa] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="rounded bg-black px-2 py-1 text-[9px] font-bold text-white">Tuần 4</span><h3 className="text-[14px] font-bold">Ngăn xếp (Stack) &amp; Hàng đợi (Queue) trong xử lý đa luồng</h3></div><p className="mt-2 text-[10px] text-gray-500">Nộp lúc 21:15 • 12/10/2024 • File: rec_stack_tuan_210345.wav</p></div><span className="rounded-lg border bg-white px-3 py-2 text-[9px] text-gray-500">Điểm số: <b className="text-[21px] text-gray-900">9.0</b> / 10</span></div>
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3"><div className="flex items-center gap-3"><button type="button" onClick={() => setDialog('Trình phát bản thu')} aria-label="Phát bản thu" className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"><Icon name="play" className="h-3.5 w-3.5" /></button><span className="text-[10px]">00:48 / 02:00</span><span className="ml-auto rounded bg-gray-100 px-2 py-1 text-[9px]">1.0x</span><Icon name="sound" className="h-4 w-4" /></div><div aria-label="Dạng sóng bản thu demo" className="mt-2 flex h-6 items-center gap-[2px] overflow-hidden">{Array.from({ length: 48 }, (_, index) => <span key={index} className={`w-[3px] shrink-0 rounded-full ${index < 17 ? 'bg-indigo-700' : 'bg-gray-300'}`} style={{ height: `${7 + ((index * 17) % 18)}px` }} />)}</div></div>
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-900 text-white"><Icon name="brain" className="h-4 w-4" /></span><b className="text-[10px]">Nhận xét từ Trợ lý AIOralCheck</b><span className="rounded-full bg-[#eeebff] px-2 py-0.5 text-[8px] font-semibold text-indigo-800">Tin cậy 98.4%</span></div><p className="mt-2 text-[10px] leading-relaxed text-gray-600">“Trình bày cấu trúc mạch lạc, thuật ngữ LIFO và FIFO phát âm chuẩn quốc tế. Cần chú ý giảm các đoạn ngừng ngập ngừng ở mốc 01:15 khi phân tích độ phức tạp thời gian.”</p></div>
                </article>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b pb-3"><h2 className="flex items-center gap-2 text-[15px] font-bold"><Icon name="settings" />Kiểm tra âm thanh nhanh</h2><i className="h-2.5 w-2.5 rounded-full bg-[#078344]" /></div><p className="mt-3 text-[11px] leading-relaxed text-gray-600">Đảm bảo micro khử ồn tốt trước khi bắt đầu phiên vấn đáp AI chính thức.</p><div className="mt-3 rounded-xl border bg-[#fafafa] p-3"><div className="flex justify-between text-[9px] text-gray-500"><span>NOISE FLOOR: -42 dB</span><b className="text-[#087b48]">SIGNAL: OK</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-300"><div className="h-full w-[65%] rounded-full bg-[#087b48]" /></div><div className="mt-3 flex h-8 items-end justify-around">{[12, 24, 17, 30, 21, 28, 14, 25, 16, 20].map((height, index) => <span key={index} className="w-1 rounded-t bg-indigo-500" style={{ height }} />)}</div></div><button type="button" onClick={() => setDialog('Thử giọng 5s với AI')} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-gray-300 text-[10px] font-semibold hover:bg-gray-50"><Icon name="mic" className="text-indigo-700" />Thử giọng 5s với AI</button></section>
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b pb-3"><h2 className="flex items-center gap-2 text-[15px] font-bold"><Icon name="award" />Bảng xếp hạng lớp CS101</h2><span className="rounded bg-gray-100 px-2 py-1 text-[9px] text-gray-600">Tuần 4</span></div><div className="mt-3 space-y-2">{[['1','Nguyễn Hoàng Yến','20210112','9.6'],['2','Đỗ Quang','20210289','9.2'],['3',`Bạn (${name})`,profile.institutional_id || 'MSSV','8.8']].map(([rank, student, id, score]) => <div key={rank} className={`flex items-center gap-2 rounded-xl border p-2.5 ${rank === '3' ? 'border-indigo-300 bg-[#f8f7ff]' : 'border-gray-200 bg-[#fafafa]'}`}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eee6c9] text-[10px] font-bold">{rank}</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold">{student.slice(0,1)}</span><span className="min-w-0 flex-1"><b className="block truncate text-[10px]">{student}</b><small className="text-[9px] text-gray-500">{id}</small></span><b className="text-[12px]">{score}<small className="ml-0.5 text-[8px]">đ</small></b></div>)}</div></section>
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b pb-3"><h2 className="flex items-center gap-2 text-[15px] font-bold"><Icon name="calendar" />Lịch thi vấn đáp trực tiếp</h2><span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[8px] font-semibold text-indigo-800">Hội đồng</span></div><div className="mt-3 rounded-xl border bg-[#fafafa] p-3"><div className="flex gap-3"><div className="rounded-lg border bg-white px-2 py-1 text-center"><span className="block text-[8px] font-bold text-red-600">THÁNG 11</span><b className="text-[18px]">15</b></div><div><b className="text-[11px]">Bảo vệ đồ án giữa kỳ</b><p className="mt-1 flex items-center gap-1 text-[9px] text-gray-600"><Icon name="clock" className="h-3 w-3" />09:30 - 10:15 Sáng</p></div></div><div className="mt-3 border-t pt-2 text-[9px]"><div className="flex justify-between gap-2"><span className="text-gray-500">Giảng viên chấm thi:</span><b>TS. Nguyễn Văn A</b></div><div className="mt-1 flex justify-between gap-2"><span className="text-gray-500">Địa điểm:</span><b>Phòng Hội đồng A1-302</b></div></div><button type="button" onClick={() => setDialog('Đồng bộ Google Calendar')} className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#eee] text-[9px] font-semibold hover:bg-gray-200"><Icon name="calendar" className="h-3.5 w-3.5" />Đồng bộ vào Google Calendar</button></div></section>
            </aside>
          </div>
          <footer className="mt-7 border-t border-gray-200 pt-4 text-[9px] text-gray-500">AIOralCheck Studio v2.4.2 • Hệ thống khảo thí âm học &amp; Khảo thí tự động AI <span className="mx-2">•</span> Chuẩn bảo mật ISO/IEC 2382-37 <span className="float-right font-medium text-gray-700">Bản quyền © 2025 Đại học Bách Khoa</span></footer>
        </div>
      </div>
      {dialog && <DemoDialog title={dialog} onClose={() => setDialog('')} />}
    </main>
  );
}

function StudentMetric({ title, value, suffix, footer, icon, progress = false }: { title: string; value: string; suffix: string; footer: string; icon: IconName; progress?: boolean }) {
  return <article className="rounded-2xl border border-[#e2e2e2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-medium text-gray-600">{title}</p><Icon name={icon} className="h-4 w-4 text-gray-500" /></div><div className="mt-2 flex flex-wrap items-baseline gap-2"><b className={`text-[29px] leading-none ${value === '92%' ? 'text-indigo-900' : ''}`}>{value}</b><span className="text-[10px] text-gray-600">{suffix}</span></div><div className="mt-3 border-t pt-2 text-[9px] text-gray-600">{progress ? <><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-gray-200"><div className="h-full w-[85.7%] rounded-full bg-indigo-500" /></div><b className="text-gray-800">{footer}</b></div></> : footer}</div></article>;
}
