'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import StudentSidebar from '@/components/StudentSidebar';
import PageLoadingScreen from '@/components/PageLoadingScreen';

interface StudentProfile {
  full_name: string;
  institutional_id: string;
}

interface ClassRecord {
  id: string;
  class_name: string;
  class_code: string;
  status: 'active' | 'pending' | 'rejected';
}

interface AssignmentRecord {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
}

interface DashboardAssignment extends AssignmentRecord {
  classId: string;
  className: string;
  classCode: string;
}

type IconName = 'overview' | 'classes' | 'assignments' | 'mic' | 'history' | 'settings' | 'logout' | 'search' | 'key' | 'play' | 'clock' | 'calendar' | 'chart' | 'fire' | 'star' | 'users' | 'check' | 'brain' | 'award' | 'book' | 'sound' | 'chevron' | 'close';

const icons: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  assignments: 'M9 5h10 M9 12h10 M9 19h10 M4 5h.01 M4 12h.01 M4 19h.01',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  search: 'm21 21-4.34-4.34 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L18 10',
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

export default function StudentDashboard() {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('student'));
  const [profile, setProfile] = useState<StudentProfile | null>(() => cachedProfile ? {
    full_name: cachedProfile.full_name ?? '',
    institutional_id: cachedProfile.institutional_id ?? '',
  } : null);
  const [checking, setChecking] = useState(!cachedProfile);
  const [errorMessage, setErrorMessage] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([]);

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

        const { data: enrolledClasses } = await oralcheckFetch<{ data: ClassRecord[] }>('/api/classes');
        const activeClasses = enrolledClasses.filter((item) => item.status === 'active');
        const assignmentGroups = await Promise.all(activeClasses.map(async (classItem) => {
          const { data } = await oralcheckFetch<{ data: AssignmentRecord[] }>(`/api/classes/${classItem.id}/assignments`);
          return data
            .filter((assignment) => assignment.status === 'published')
            .map((assignment) => ({
              ...assignment,
              classId: classItem.id,
              className: classItem.class_name,
              classCode: classItem.class_code,
            }));
        }));
        if (active) {
          setClasses(activeClasses);
          setAssignments(assignmentGroups.flat());
        }
      } catch {
        if (active) setErrorMessage('Không thể tải dữ liệu tài khoản hoặc lớp học. Vui lòng kiểm tra kết nối và thử lại.');
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

  if (checking) return <PageLoadingScreen title="Đang tải trang tổng quan" description="Đang chuẩn bị lớp học và bài tập của bạn." />;
  if (errorMessage && !profile) return <main className="flex min-h-screen items-center justify-center p-5"><div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center"><p role="alert" className="text-sm text-red-700">{errorMessage}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Thử lại</button></div></main>;
  if (!profile) return null;

  const name = profile.full_name || 'Sinh viên';
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <StudentSidebar
        currentPage="overview"
        fullName={name}
        institutionalId={profile.institutional_id}
        signingOut={signingOut}
        interactiveUnavailable
        onSignOut={handleSignOut}
      />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[62px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="min-w-0 text-[11px] text-gray-500">Phân hệ Sinh viên <span className="mx-1">›</span> <b className="text-gray-800">Trang chủ Tổng quan</b></div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/student/classes" className="hidden h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-[11px] font-medium hover:bg-gray-50 sm:flex">
              <Icon name="key" />Tham gia lớp học mới bằng mã
            </Link>
            <span className="hidden h-10 items-center rounded-full border border-gray-200 px-4 text-[10px] text-gray-500 sm:flex">Ghi âm đang tạm hoãn</span>
            <button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Đăng xuất" className="flex h-9 w-9 items-center justify-center rounded-full border md:hidden">
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          <section className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <h1 className="text-[24px] font-bold leading-tight sm:text-[28px]">Chào buổi sáng, {name}! 👋</h1>
              <p className="mt-2 text-[13px] text-gray-600">Bạn có <b className="text-gray-900">{assignments.length} bài tập</b> được giao trong các lớp đang tham gia.</p>
            </div>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-gray-600">Học kỳ hiện tại</span>
          </section>

          <section aria-label="Thống kê học tập" className="mt-5 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 2xl:grid-cols-4">
            <StudentMetric title="Lớp đang tham gia" value={String(classes.length)} suffix="lớp học" footer="Dữ liệu từ hệ thống" icon="book" />
            <StudentMetric title="Bài tập được giao" value={String(assignments.length)} suffix="bài" footer="Bài đã được giảng viên công bố" icon="users" />
            <StudentMetric title="Điểm đã công bố" value="—" suffix="" footer="Chưa có dữ liệu điểm" icon="chart" />
            <StudentMetric title="Ghi âm và AI" value="—" suffix="" footer="Tính năng đang tạm hoãn" icon="sound" />
          </section>

          <div className="mt-5 grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1.8fr)_minmax(290px,0.9fr)]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <h2 className="flex items-center gap-2 text-[17px] font-bold">
                    <Icon name="clock" className="text-red-600" />Bài tập vấn đáp cần nộp gấp (Deadlines)
                  </h2>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-semibold text-gray-600">{assignments.length} bài được giao</span>
                </div>
                <div className="mt-4 space-y-3">
                  {assignments.map((item) => (
                    <article key={item.id} className="rounded-xl border border-[#e2e2e2] bg-[#fafafa] p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#efefef] text-gray-600">
                          <Icon name="calendar" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="rounded bg-[#111] px-2 py-1 text-[9px] font-semibold text-white">{item.classCode}</span>
                          <p className="mt-2 text-[11px] text-gray-600">{item.ends_at ? `Hạn nộp: ${new Date(item.ends_at).toLocaleString('vi-VN')}` : 'Chưa đặt hạn nộp'}</p>
                          <h3 className="mt-1 text-[15px] font-bold">{item.title}</h3>
                          <p className="mt-2 text-[10px] text-gray-600">{item.className}</p>
                        </div>
                        <Link href={`/student/classes/${item.classId}`} className="flex h-9 items-center rounded-full border bg-white px-4 text-[10px] font-semibold hover:bg-gray-100">Xem lớp</Link>
                      </div>
                    </article>
                  ))}
                  {assignments.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-600">Chưa có bài tập nào được công bố.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <h2 className="flex items-center gap-2 text-[17px] font-bold"><Icon name="classes" />Lớp học đang ghi danh</h2>
                  <Link href="/student/classes" className="text-[10px] font-semibold text-indigo-800 hover:underline">
                    Xem tất cả ({classes.length}) →
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {classes.map((course) => (
                    <Link href={`/student/classes/${course.id}`} key={course.id} className="block rounded-xl border border-[#e0e0e0] bg-[#fafafa] p-4 hover:border-indigo-300">
                      <div className="flex justify-between">
                        <span className="rounded bg-[#eee] px-2 py-0.5 text-[9px] font-semibold">{course.class_code}</span>
                        <span className="rounded-full border border-[#98dfb9] bg-[#eefaf3] px-2 py-0.5 text-[9px] font-semibold text-[#087b48]">Đang học</span>
                      </div>
                      <h3 className="mt-3 truncate text-[14px] font-bold">{course.class_name}</h3>
                    </Link>
                  ))}
                  {classes.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-600">Bạn chưa tham gia lớp học nào. Dùng mã lớp để tham gia.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Kết quả học tập</p>
                    <h2 className="text-[17px] font-bold">Điểm đã công bố</h2>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[9px] font-bold text-gray-600">CHƯA TÍCH HỢP</span>
                </div>
                <p className="mt-4 rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-600">Điểm số sẽ hiển thị sau khi có luồng nộp bài và giảng viên công bố kết quả.</p>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="flex items-center gap-2 text-[15px] font-bold"><Icon name="settings" />Ghi âm và phân tích</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] text-gray-600">Tạm hoãn</span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-gray-600">Tính năng ghi âm, Speech-to-Text và chấm điểm AI chưa được bật.</p>
              </section>

              <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="flex items-center gap-2 text-[15px] font-bold"><Icon name="award" />Bảng xếp hạng</h2>
                </div>
                <p className="mt-3 text-[11px] text-gray-600">Chưa có dữ liệu xếp hạng được công bố.</p>
              </section>
            </aside>
          </div>
          <footer className="mt-7 border-t border-gray-200 pt-4 text-[9px] text-gray-500">
            OralCheck • Quản lý lớp học và bài tập <span className="float-right font-medium text-gray-700">Hệ thống học tập</span>
          </footer>
        </div>
      </div>
    </main>
  );
}

function StudentMetric({ title, value, suffix, footer, icon, progress = false }: { title: string; value: string; suffix: string; footer: string; icon: IconName; progress?: boolean }) {
  return <article className="rounded-2xl border border-[#e2e2e2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-medium text-gray-600">{title}</p><Icon name={icon} className="h-4 w-4 text-gray-500" /></div><div className="mt-2 flex flex-wrap items-baseline gap-2"><b className={`text-[29px] leading-none ${value === '92%' ? 'text-indigo-900' : ''}`}>{value}</b><span className="text-[10px] text-gray-600">{suffix}</span></div><div className="mt-3 border-t pt-2 text-[9px] text-gray-600">{progress ? <><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-gray-200"><div className="h-full w-[85.7%] rounded-full bg-indigo-500" /></div><b className="text-gray-800">{footer}</b></div></> : footer}</div></article>;
}
