'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile } from '@/lib/profile-cache';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import TeacherSidebar from '@/components/TeacherSidebar';
import PageLoadingScreen from '@/components/PageLoadingScreen';

interface TeacherProfile {
  full_name: string;
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
  id: string;
  code: string;
  secondaryCode: string;
  faculty: string;
  title: string;
  lab: string;
  schedule: string;
  students: string;
  voiceprint: string;
  assignmentCount: number;
  average: string;
  kind: 'teaching' | 'advisory';
  status: string;
  canEnter: boolean;
}

interface ClassRecord {
  id: string;
  class_name: string;
  class_code: string;
  description: string | null;
  status: 'pending' | 'active' | 'rejected' | 'archived';
  lecturer_name: string | null;
}

const faculties = [
  'Khoa Công nghệ Phần mềm',
  'Khoa Khoa học Máy tính',
  'Khoa Kỹ thuật Máy tính',
  'Khoa Hệ thống Thông tin',
  'Khoa Mạng máy tính và Truyền thông',
  'Khoa Khoa học và Kỹ thuật Thông tin',
];

function getClassMetadata(description: string | null, fallbackFaculty: string) {
  const lines = (description ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const secondaryCode = lines.find((line) => /^Mã môn:/i.test(line))?.replace(/^Mã môn:\s*/i, '') ?? '';
  const classFaculty = lines.find((line) => /^Khoa:/i.test(line))?.replace(/^Khoa:\s*/i, '') ?? fallbackFaculty;
  const schedule = lines.filter((line) => !/^(Mã môn|Khoa):/i.test(line)).join(' • ');
  return { secondaryCode, faculty: classFaculty, schedule };
}

export default function TeacherClasses() {
  const router = useRouter();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'teaching' | 'advisory'>('all');
  const [faculty, setFaculty] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('schedule');
  const [courses, setCourses] = useState<Course[]>([]);
  const [adminMode, setAdminMode] = useState(false);

  // Modal Create Class state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [classCodeInput, setClassCodeInput] = useState('');
  const [classFacultyInput, setClassFacultyInput] = useState('');
  const [classLabInput, setClassLabInput] = useState('');
  const [classScheduleInput, setClassScheduleInput] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const creatingClassRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = session?.user;
        if (!user) {
          router.replace('/login');
          return;
        }
        const profileData = await getCachedProfile(user.id);
        if (profileData.role !== 'teacher' && profileData.role !== 'admin') {
          router.replace(profileData.role === 'student' ? '/student' : '/login');
          return;
        }
        if (!active) return;
        const isAdministrator = profileData.role === 'admin';
        setAdminMode(isAdministrator);
        setProfile({
          full_name: profileData.full_name ?? '',
        });
        const response = await oralcheckFetch<{ data: ClassRecord[] }>('/api/classes');
        const assignmentCounts = await Promise.all(response.data.map(async (classItem) => {
          if (!isAdministrator && classItem.status === 'pending') return 0;
          const { data: assignments } = await oralcheckFetch<{ data: Array<{ id: string }> }>(
            `/api/classes/${classItem.id}/assignments`,
          );
          return assignments.length;
        }));
        if (!active) return;
        setCourses(response.data.map((item, index) => ({
          ...getClassMetadata(item.description, ''),
          id: item.id,
          code: item.class_code,
          title: item.class_name,
          lab: item.status === 'active' ? 'Đang hoạt động' : item.status === 'pending' ? 'Chờ duyệt' : item.status === 'archived' ? 'Đã lưu trữ' : 'Đã từ chối',
          students: '—',
          voiceprint: '—',
          assignmentCount: assignmentCounts[index],
          average: 'Chưa có điểm',
          kind: 'teaching',
          status: item.status === 'active' ? 'Đang giảng dạy' : item.status === 'pending' ? 'Chờ duyệt' : item.status === 'archived' ? 'Đã lưu trữ' : 'Bị từ chối',
          canEnter: isAdministrator || item.status === 'active',
        })));
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải lớp học.');
      } finally {
        if (active) {
          setChecking(false);
          setLoading(false);
        }
      }
    }
    void load();
    return () => { active = false; };
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

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (creatingClassRef.current) return;
    creatingClassRef.current = true;
    setCreatingClass(true);
    setErrorMessage('');
    setCreateSuccess('');
    try {
      const description = [
        `Mã môn: ${classCodeInput.trim().toUpperCase()}`,
        `Khoa: ${classFacultyInput.trim()}`,
        classLabInput.trim() && `Phòng: ${classLabInput.trim()}`,
        classScheduleInput.trim() && `Lịch: ${classScheduleInput.trim()}`,
      ].filter(Boolean).join('\n');
      const response = await oralcheckFetch<{ data: { class: ClassRecord } }>('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ class_name: classNameInput.trim(), description }),
      });
      const item = response.data.class;
      setCourses((current) => [{
        ...getClassMetadata(item.description, classFacultyInput.trim()),
        id: item.id,
        code: item.class_code,
        title: item.class_name,
        lab: item.status === 'active' ? 'Đang hoạt động' : 'Chờ duyệt',
        students: '—',
        voiceprint: '—',
        assignmentCount: 0,
        average: 'Chưa có điểm',
        kind: 'teaching',
        status: item.status === 'active' ? 'Đang giảng dạy' : 'Chờ duyệt',
        canEnter: adminMode || item.status === 'active',
      }, ...current]);
      setCreateSuccess(adminMode
        ? `Lớp "${item.class_name}" đã được tạo và kích hoạt.`
        : `Yêu cầu mở lớp "${item.class_name}" đã được gửi để quản trị viên phê duyệt.`);
      setShowCreateModal(false);
      setClassNameInput('');
      setClassCodeInput('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi yêu cầu tạo lớp.');
    } finally {
      creatingClassRef.current = false;
      setCreatingClass(false);
    }
  }

  const visibleCourses = useMemo(() => courses
    .filter((item) => tab === 'all' || item.kind === tab)
    .filter((item) => faculty === 'all' || item.faculty === faculty)
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => `${item.code} ${item.secondaryCode} ${item.title} ${item.faculty}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'vi') : sort === 'students' ? Number.parseInt(b.students, 10) - Number.parseInt(a.students, 10) : courses.indexOf(a) - courses.indexOf(b)), [courses, faculty, query, sort, status, tab]);

  if (checking || loading) {
    return <PageLoadingScreen title="Đang tải lớp học" description="Đang chuẩn bị danh sách lớp và bài tập của bạn." />;
  }
  if (errorMessage && !profile) return <main className="flex min-h-screen items-center justify-center p-5"><div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center"><p role="alert" className="text-sm text-red-700">{errorMessage}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Thử lại</button></div></main>;
  if (!profile) return null;

  const initials = profile.full_name.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('');

  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <TeacherSidebar currentPage="classes" signingOut={signingOut} onSignOut={handleSignOut} adminMode={adminMode} />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[68px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-7">
          <div className="text-[11px] text-gray-500">
            {adminMode ? 'Quản lý lớp & bài tập' : 'Lớp học & Hội đồng'} <span className="mx-2">/</span><b className="text-gray-800">Quản lý lớp học</b>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <Icon name="add" className="h-3.5 w-3.5" />
              Tạo lớp mới
            </button>
            {adminMode
              ? <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefff] text-[10px] font-bold text-indigo-800">{initials}</span>
              : <Link href="/teacher/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efefff] text-[10px] font-bold text-indigo-800 hover:ring-2 hover:ring-indigo-400">{initials}</Link>}
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-7">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          {createSuccess && !showCreateModal && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{createSuccess}</p>}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="mt-2 text-[23px] font-bold tracking-tight sm:text-[27px]">
                  {adminMode ? 'Quản lý lớp học' : 'Lớp học phụ trách & Cố vấn học tập'}
                </h1>
                <p className="mt-1 text-xs text-gray-600">
                  {adminMode
                    ? 'Xem lớp học, quản lý sinh viên và bài tập trong toàn hệ thống.'
                    : 'Quản lý danh sách lớp, tạo lớp học mới chờ Admin phê duyệt và vào từng lớp để quản lý sinh viên, bài tập.'}
                </p>
              </div>

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
                  Soạn bài tập
                </Link>
              </div>
            </div>
          </div>

          <section aria-label="Thống kê lớp học" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard title={adminMode ? 'Lớp học quản lý' : 'Lớp học phụ trách'} value={String(courses.length)} suffix="lớp học" icon="book" footer="Dữ liệu từ hệ thống" />
            <MetricCard title="Yêu cầu chờ phê duyệt" value={String(courses.filter((course) => course.status === 'Chờ duyệt').length)} suffix="yêu cầu" icon="users" footer={adminMode ? 'Yêu cầu mở lớp đang chờ xử lý' : 'Quản trị viên sẽ cập nhật trạng thái'} purple />
          </section>

          <section className="mt-5 flex flex-col gap-3 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 rounded-xl bg-[#ededed] p-1">
                {([
                  { id: 'all', text: 'Tất cả các lớp' },
                  { id: 'teaching', text: 'Lớp giảng dạy chuyên môn' },
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
                      Tạo lớp học và quản lý bài tập. Ghi âm và chấm điểm AI hiện chưa được bật.
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
                    onOpen={() => router.push(`/teacher/classes/${item.id}`)}
                  />
                ))}
                {!loading && visibleCourses.length === 0 && (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
                    {adminMode ? 'Chưa có lớp học trong hệ thống.' : 'Chưa có lớp học phù hợp. Tạo lớp mới để gửi yêu cầu phê duyệt.'}
                  </p>
                )}
              </div>
            </section>
          )}

          <footer className="mt-8 border-t border-gray-200 pt-4 text-[9px] text-gray-500">
            AIOralCheck Studio v2.4.2 • Hệ thống khảo thí âm học &amp; Khảo thí tự động AI <span className="float-right">Bản quyền © 2025 Đại học Bách Khoa</span>
          </footer>
        </div>
      </div>

      {/* Class creation dialog */}
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
                    {adminMode ? 'Lớp mới sẽ được kích hoạt ngay sau khi tạo.' : 'Lớp mới sẽ chờ quản trị viên phê duyệt.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={creatingClass}
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClass} aria-busy={creatingClass} className="mt-4 space-y-4">
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
                  <label htmlFor="class-faculty" className="block text-xs font-bold text-gray-700">
                    Khoa / Viện quản lý *
                  </label>
                  <select
                    id="class-faculty"
                    required
                    value={classFacultyInput}
                    onChange={(e) => setClassFacultyInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                  >
                    <option value="" disabled>Chọn khoa quản lý</option>
                    {faculties.map((item) => <option key={item} value={item}>{item}</option>)}
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
                <span className="font-bold text-indigo-900 block mb-0.5">{adminMode ? 'Thông tin lớp học:' : 'Quy trình phê duyệt:'}</span>
                {adminMode
                  ? 'Lớp sẽ hoạt động ngay và được gắn với tài khoản quản trị viên đang tạo.'
                  : 'Lớp sẽ chờ quản trị viên phê duyệt trước khi sinh viên có thể tham gia.'}
              </div>

              {createSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  ✓ {createSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={creatingClass}
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingClass}
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
                >
                  {creatingClass ? 'Đang gửi...' : adminMode ? 'Tạo lớp học' : 'Gửi yêu cầu tạo lớp'}
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
  return (
    <article data-testid={`teacher-course-${item.code}`} className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${highlighted ? 'border-2 border-indigo-300' : 'border-[#dedede]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono font-bold text-gray-900">
              {item.code}{item.secondaryCode && ` • ${item.secondaryCode}`}
            </span>
            {item.faculty && <span className="text-gray-500">• {item.faculty}</span>}
          </div>
          <h3 className="mt-2 text-base font-bold text-gray-900 leading-tight">{item.title}</h3>
        </div>
        <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-[9px] font-semibold text-green-800 shrink-0">
          {item.lab}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-y border-gray-100 py-2.5 text-xs text-gray-600">
        {item.schedule && <span className="flex items-center gap-1"><Icon name="calendar" className="h-3.5 w-3.5" />{item.schedule}</span>}
        <span>•</span>
        <span className="flex items-center gap-1"><Icon name="users" className="h-3.5 w-3.5" />Sĩ số: <b>{item.students}</b></span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-700"><Icon name="fingerprint" className="h-3.5 w-3.5" />{item.voiceprint}</span>
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-gray-600">Bài tập đã tạo: <b>{item.assignmentCount}</b></span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500 text-[11px]">Chấm điểm AI: <b className="font-medium text-gray-700">Tạm hoãn</b></span>
        <span className="text-gray-700">Điểm TB: <b className="text-sm font-bold text-gray-900">{item.average}</b></span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        {item.canEnter ? (
          <>
            <Link
              href={`/teacher/classes/${item.id}`}
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
          </>
        ) : (
          <p role="status" className="text-xs font-medium text-amber-800">
            Đang chờ duyệt — chưa thể vào lớp
          </p>
        )}
      </div>
    </article>
  );
}
