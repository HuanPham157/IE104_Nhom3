'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import StudentSidebar from '@/components/StudentSidebar';
import PageLoadingScreen from '@/components/PageLoadingScreen';

export interface TaskItemData {
  id: string;
  title: string;
  is_done: boolean;
  created_at?: string;
}

type DemoStatus = 'pending' | 'grading' | 'completed';
type DemoFilter = 'all' | DemoStatus;
type TaskSort = 'deadline' | 'newest' | 'title';
type IconName =
  | 'grid' | 'users' | 'task' | 'mic' | 'history' | 'settings' | 'help' | 'logout'
  | 'search' | 'plus' | 'refresh' | 'check' | 'clock' | 'trash' | 'edit' | 'close'
  | 'calendar' | 'bell' | 'sliders' | 'clipboard' | 'brain' | 'chart' | 'book'
  | 'headphones' | 'file' | 'arrow' | 'sparkles' | 'sound' | 'badge' | 'chevron';

const iconPaths: Record<IconName, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  task: 'M9 5h10 M9 12h10 M9 19h10 M4 5h.01 M4 12h.01 M4 19h.01',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.7.67l-.05.07h-3.4l-.05-.07a1.7 1.7 0 0 0-1.7-.67l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.6 15l-.09-.03v-3.4l.09-.03a1.7 1.7 0 0 0-.34-1.88L9.2 9.6l1.7-2.94.08.02a1.7 1.7 0 0 0 1.7-.67l.05-.07h3.4l.05.07a1.7 1.7 0 0 0 1.7.67l.08-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.4 12l.09.03v3.4z',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  search: 'm21 21-4.34-4.34 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z',
  plus: 'M12 5v14 M5 12h14',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M5.6 9a7 7 0 0 1 11.55-2.6L20 12 M4 12l2.85 5.6A7 7 0 0 0 18.4 15',
  check: 'M20 6 9 17l-5-5',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v5 M14 11v5',
  edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z',
  close: 'M18 6 6 18 M6 6l12 12',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M2 14h4 M10 8h4 M18 16h4',
  clipboard: 'M9 4h6 M9 2h6v4H9z M5 4H4v18h16V4h-1 M8 11h8 M8 15h8',
  brain: 'M12 18V5 M12 8a3 3 0 0 0-5.8-1 3.5 3.5 0 0 0-1.7 6.4A3.5 3.5 0 0 0 7 20h5 M12 8a3 3 0 0 1 5.8-1 3.5 3.5 0 0 1 1.7 6.4A3.5 3.5 0 0 1 17 20h-5',
  chart: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  headphones: 'M3 14v-3a9 9 0 0 1 18 0v3 M3 14h4v7H5a2 2 0 0 1-2-2z M17 14h4v5a2 2 0 0 1-2 2h-2z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  sparkles: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z M19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z',
  sound: 'M11 5 6 9H2v6h4l5 4z M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14',
  badge: 'M12 3 14.5 5l3.2-.2.5 3.2 2.3 2.3-1.7 2.8.2 3.2-3.2.5-2.3 2.3-2.8-1.7-3.2.2-.5-3.2-2.3-2.3 1.7-2.8-.2-3.2 3.2-.5z M9 12l2 2 4-4',
  chevron: 'm9 18 6-6-6-6',
};

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d={iconPaths[name]} />
    </svg>
  );
}

interface DemoAssignment {
  id: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  title: string;
  status: DemoStatus;
  due: string;
  dueMeta: string;
  duration: string;
  language: string;
  rubrics: { label: string; value: string }[];
  badge?: string;
  record?: string;
}

const demoAssignments: DemoAssignment[] = [];

const filterOptions: { id: DemoFilter; label: string; count: string }[] = [
  { id: 'all', label: 'Tất cả bài tập', count: '0' },
  { id: 'pending', label: 'Cần nộp gấp', count: '0' },
  { id: 'grading', label: 'Đã nộp - Chờ GV', count: '0' },
  { id: 'completed', label: 'Đã có kết quả', count: '0' },
];

export default function TaskDashboard() {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('student'));
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState(cachedProfile?.full_name ?? '');
  const [institutionalId, setInstitutionalId] = useState(cachedProfile?.institutional_id ?? '');
  const [authChecking, setAuthChecking] = useState(!cachedProfile);
  const [tasks, setTasks] = useState<TaskItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<DemoFilter>('all');
  const [sort, setSort] = useState<TaskSort>('deadline');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editError, setEditError] = useState('');
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.replace('/login');
      throw new Error('Chưa đăng nhập');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${session.access_token}`);
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(endpoint, { ...options, headers });
    if (response.status === 401) {
      await supabase.auth.signOut();
      router.replace('/login');
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'Có lỗi xảy ra từ máy chủ.');
    return result;
  }, [router]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const result = await apiFetch('/api/tasks');
      setTasks(result.data ?? []);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Không thể tải danh sách công việc.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.replace('/login');
          return;
        }

        const profile = await getCachedProfile(session.user.id);

        if (profile?.role === 'teacher') {
          router.replace('/teacher');
          return;
        }
        if (profile?.role !== 'student') {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        if (active) {
          setUserEmail(session.user.email ?? '');
          setFullName(profile.full_name ?? '');
          setInstitutionalId(profile.institutional_id ?? '');
          setAuthChecking(false);
          await loadTasks();
        }
      } catch {
        if (active) {
          setApiError('Không thể xác minh tài khoản. Kiểm tra kết nối rồi thử lại.');
          setAuthChecking(false);
          setLoading(false);
        }
      }
    }

    void checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setTasks([]);
        router.replace('/login');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadTasks, router]);

  async function handleSignOut() {
    setIsSubmitting(true);
    setApiError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/login');
      router.refresh();
    } catch {
      setApiError('Đăng xuất chưa thành công. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  }

  async function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (title.length < 1 || title.length > 120) {
      setAddError('Tên công việc phải dài từ 1–120 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setAddError('');
    try {
      await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) });
      setNewTitle('');
      await loadTasks();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Không thể thêm công việc.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTask(task: TaskItemData) {
    setIsSubmitting(true);
    setApiError('');
    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_done: !task.is_done }),
      });
      await loadTasks();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTask(task: TaskItemData) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${task.title}"?`)) return;

    setIsSubmitting(true);
    setApiError('');
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (editingId === task.id) setEditingId(null);
      await loadTasks();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Không thể xóa công việc.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const title = editTitle.trim();
    if (title.length < 1 || title.length > 120) {
      setEditError('Tên công việc phải dài từ 1–120 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setEditError('');
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
      setEditingId(null);
      await loadTasks();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Không thể lưu thay đổi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredAssignments = useMemo(() => demoAssignments
    .filter((assignment) => filter === 'all' || assignment.status === filter)
    .filter((assignment) => course === 'all' || assignment.courseCode === course)
    .filter((assignment) => {
      const query = search.trim().toLocaleLowerCase();
      return !query || `${assignment.courseCode} ${assignment.courseName} ${assignment.title} ${assignment.instructor}`.toLocaleLowerCase().includes(query);
    })
    .sort((first, second) => {
      if (sort === 'title') return first.title.localeCompare(second.title, 'vi');
      if (sort === 'newest') return demoAssignments.indexOf(first) - demoAssignments.indexOf(second);
      return demoAssignments.indexOf(first) - demoAssignments.indexOf(second);
    }), [course, filter, search, sort]);

  if (authChecking) {
    return <PageLoadingScreen title="Đang tải bài tập" description="Đang chuẩn bị danh sách bài tập của bạn." />;
  }

  const displayName = fullName || userEmail;
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <StudentSidebar currentPage="tasks" fullName={displayName} institutionalId={institutionalId} signingOut={isSubmitting} interactiveUnavailable={false} onSignOut={handleSignOut} onUnavailable={() => undefined} />

      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[62px] items-center gap-3 border-b border-[#e5e5e5] bg-white/95 px-4 backdrop-blur sm:px-7">
          <label className="flex h-9 min-w-0 max-w-[390px] flex-1 items-center gap-2 rounded-full border border-[#e1e1e1] bg-white px-3 text-[#818181] shadow-sm focus-within:border-[#a6a6a6]">
            <Icon name="search" className="h-4 w-4 shrink-0" />
            <input aria-label="Tìm kiếm bài tập" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm bài tập oral, mã môn học..." className="w-full min-w-0 bg-transparent text-[11px] text-[#333] outline-none placeholder:text-[#999]" />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <label className="hidden h-9 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#f6f6f6] px-3 text-[10px] text-[#555] sm:flex">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              <select aria-label="Học kỳ" className="max-w-[145px] bg-transparent outline-none">
                <option>Học kỳ hiện tại</option>
              </select>
            </label>
            <button type="button" onClick={() => setActiveDialog('audio')} className="hidden h-9 items-center gap-1.5 rounded-full border border-[#dcdcdc] bg-white px-3 text-[10px] font-medium text-[#333] shadow-sm hover:bg-[#f8f8f8] sm:flex">
              <Icon name="sliders" className="h-3.5 w-3.5 text-[#5865f2]" /> Kiểm tra Micro &amp; Audio
            </button>
            <button type="button" onClick={() => setActiveDialog('notifications')} aria-label="Thông báo" className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#555] hover:bg-[#f4f4f4]">
              <Icon name="bell" className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full border border-white bg-[#d61f26]" />
            </button>
            <button type="button" onClick={handleSignOut} disabled={isSubmitting} aria-label="Đăng xuất" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dedede] text-[#666] hover:bg-[#f4f4f4] disabled:opacity-60 md:hidden">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-5 sm:px-7 lg:px-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-[#777]">
                <span>Sinh viên</span><Icon name="chevron" className="h-3 w-3" />
                <span>Phòng thi vấn đáp</span><Icon name="chevron" className="h-3 w-3" />
                <span className="font-semibold text-[#343434]">Danh sách bài tập oral</span>
              </div>
              <h1 className="text-[22px] font-bold tracking-tight sm:text-[27px]">Danh sách Bài tập &amp; Thi Vấn đáp (Oral)</h1>
              <p className="mt-1 max-w-[620px] text-[12px] leading-relaxed text-[#6f7175]">
                Theo dõi các đợt thi vấn đáp, luyện tập giọng nói, tiêu chí Rubric Auralis LLM và hạn nộp bài (deadline) theo thời gian thực.
              </p>
            </div>
            <div className="mt-1 flex h-8 items-center gap-2 rounded-full border border-[#9be3be] bg-[#eafaf1] px-3.5 text-[10px] font-semibold text-[#087b48]">
              <span className="flex items-end gap-[2px]"><i className="h-2 w-[3px] rounded-sm bg-current" /><i className="h-3 w-[3px] rounded-sm bg-current" /><i className="h-2 w-[3px] rounded-sm bg-current" /></span>
              Tính năng AI: Tạm hoãn
            </div>
          </div>

          {apiError && (
            <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-700">
              <span>{apiError}</span>
              <button type="button" onClick={() => setApiError('')} aria-label="Đóng thông báo lỗi" className="rounded p-1 hover:bg-red-100"><Icon name="close" className="h-3.5 w-3.5" /></button>
            </div>
          )}

          <section aria-label="Thống kê bài tập oral" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <article className="rounded-2xl border border-[#e3e3e3] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#4c4c4c]">
                <span>Tổng bài tập Oral</span><Icon name="clipboard" className="h-4 w-4 text-[#777]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2"><strong className="text-[30px] leading-none">—</strong><span className="text-[11px] text-[#858585]">chưa có dữ liệu bài tập</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-[#e7e7e7] pt-2 text-[10px] text-[#858585]"><span>Bài tập thực tế nằm trong từng lớp</span></div>
            </article>
            <article className="rounded-2xl border border-[#ffb5b5] bg-[#fffafa] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#d02020]"><span>Cần nộp ngay (&lt;48h)</span><Icon name="clock" className="h-4 w-4" /></div>
              <div className="mt-2 flex items-baseline gap-2"><strong className="text-[30px] leading-none">—</strong><span className="text-[11px]">chưa có dữ liệu hạn nộp</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-[#f4cccc] pt-2 text-[10px] text-[#b42318]"><span>Hạn nộp sẽ hiển thị theo bài tập thật</span></div>
            </article>
            <article className="rounded-2xl border border-[#e3e3e3] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#4c4c4c]"><span>Đang chấm / Chờ AI</span><Icon name="brain" className="h-4 w-4 text-[#7167ff]" /></div>
              <div className="mt-2 flex items-baseline gap-2"><strong className="text-[30px] leading-none">—</strong><span className="text-[11px] text-[#858585]">chưa tích hợp chấm bài</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-[#e7e7e7] pt-2 text-[10px] text-[#858585]"><span>AI đang tạm hoãn</span></div>
            </article>
            <article className="rounded-2xl border border-[#e3e3e3] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#4c4c4c]"><span>Điểm trung bình AI</span><Icon name="badge" className="h-4 w-4 text-[#07834b]" /></div>
              <div className="mt-2 flex items-baseline gap-2"><strong className="text-[30px] leading-none">—</strong><span className="text-[11px] text-[#858585]">chưa có điểm</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-[#e7e7e7] pt-2 text-[10px] text-[#858585]"><span>Điểm sẽ có sau khi giảng viên công bố</span></div>
            </article>
          </section>

          <section className="mt-6 flex flex-col gap-3 border-b border-[#e1e1e1] pb-3.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#efefef] p-1" aria-label="Lọc bài tập oral">
              {filterOptions.map((option) => (
                <button key={option.id} type="button" onClick={() => setFilter(option.id)} aria-pressed={filter === option.id} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] transition ${filter === option.id ? 'bg-white font-semibold text-[#252525] shadow-sm' : 'text-[#606060] hover:bg-white/60'}`}>
                  <span>{option.label} ({option.count})</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-[#666]">
              <label className="flex items-center gap-2">
                <span>Môn:</span>
                <select aria-label="Lọc theo môn học" value={course} onChange={(event) => setCourse(event.target.value)} className="h-9 min-w-[180px] rounded-lg border border-[#dedede] bg-white px-3 text-[10px] text-[#333] shadow-sm outline-none focus:border-[#777]">
                  <option value="all">Tất cả lớp học</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="hidden sm:inline">Xếp theo:</span>
                <select aria-label="Sắp xếp danh sách" value={sort} onChange={(event) => setSort(event.target.value as TaskSort)} className="h-9 max-w-[190px] rounded-lg border border-[#dedede] bg-white px-3 text-[10px] text-[#333] shadow-sm outline-none focus:border-[#777]">
                  <option value="deadline">Hạn nộp gần nhất (Deadline)</option>
                  <option value="newest">Thứ tự đề xuất</option>
                  <option value="title">Tên bài tập A–Z</option>
                </select>
              </label>
            </div>
          </section>

          <div className="mt-6 grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(270px,0.96fr)]">
            <section aria-label="Danh sách bài tập" className="min-w-0 space-y-4">
              {filteredAssignments.map((assignment) => (
                <DemoAssignmentCard key={assignment.id} assignment={assignment} onAction={setActiveDialog} />
              ))}
              {filteredAssignments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#d5d5d5] bg-white px-5 py-12 text-center text-sm text-[#777]">
                  Danh sách bài tập thực tế được xem trong từng lớp học.
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-[22px] border border-[#e2e2e2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold"><Icon name="sound" className="h-5 w-5" /> Ghi âm và phân tích</h2>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-[9px] font-bold uppercase text-gray-600">Tạm hoãn</span>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-[#666]">Ghi âm, Speech-to-Text và chấm điểm AI chưa được bật.</p>
              </section>

              <section className="rounded-[22px] border border-[#e2e2e2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h2 className="flex items-center gap-2 text-[13px] font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eeebff] text-[#5747ca]"><Icon name="sparkles" className="h-4 w-4" /></span>Tips đạt điểm cao AI Oral</h2>
                <div className="mt-3 space-y-2.5">
                  <TipCard title="1. Tốc độ nói chuẩn (Tempo)">Duy trì khoảng 130 - 150 từ/phút. Tránh nói quá nhanh gây méo phổ âm hoặc nói quá chậm làm giảm điểm trôi chảy.</TipCard>
                  <TipCard title="2. Nhấn âm thuật ngữ (Keywords)">Nhấn rõ các thuật ngữ chuyên ngành (ví dụ: Polymorphism, Sharding, Invariant). AI sẽ gán trọng số từ vựng cao hơn.</TipCard>
                  <TipCard title="3. Tránh khoảng lặng chết (Silence)">Không ngắt quãng quá 3 giây. Nếu cần suy nghĩ, dùng từ nối tự nhiên để thuật toán không trừ điểm Pause-Rate.</TipCard>
                </div>
              </section>

              <section className="rounded-[22px] border border-[#e2e2e2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-bold">Lịch thi Oral sắp tới</h2>
                </div>
                <p className="mt-3 text-[10px] text-[#666]">Lịch thi sẽ hiển thị khi được kết nối với dữ liệu bài tập.</p>
              </section>
            </aside>
          </div>

          <section className="mt-8 border-t border-[#e4e4e4] pt-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-[16px] font-bold">Công việc cá nhân</h2>
                <p className="mt-1 text-[10px] text-[#777]">Các công việc bạn tạo sẽ được lưu trong tài khoản của mình.</p>
              </div>
              <button type="button" onClick={() => void loadTasks()} disabled={loading || isSubmitting} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#dedede] bg-white px-3 text-[10px] hover:bg-[#f5f5f5] disabled:opacity-60"><Icon name="refresh" className="h-3.5 w-3.5" />{loading ? 'Đang tải...' : 'Làm mới'}</button>
            </div>

            <form onSubmit={handleAddTask} className="mb-3 rounded-xl border border-[#e3e3e3] bg-white p-3.5">
              <label htmlFor="new-task-input" className="mb-2 block text-[11px] font-semibold">Thêm công việc cá nhân</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="new-task-input" type="text" value={newTitle} maxLength={120} disabled={isSubmitting} onChange={(event) => { setNewTitle(event.target.value); if (addError) setAddError(''); }} placeholder="Nhập tên câu hỏi hoặc việc cần làm (1–120 ký tự)..." className="h-10 min-w-0 flex-1 rounded-lg border border-[#d9dadd] bg-[#fafafa] px-3 text-[11px] outline-none focus:border-[#777] focus:bg-white focus:ring-2 focus:ring-[#777]/10 disabled:opacity-60" />
                <button type="submit" aria-label="+ Thêm công việc" disabled={isSubmitting} className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#151617] px-4 text-[10px] font-semibold text-white hover:bg-[#303234] disabled:opacity-60"><Icon name="plus" className="h-3.5 w-3.5" />{isSubmitting ? 'Đang lưu...' : 'Thêm công việc'}</button>
              </div>
              {addError && <p role="alert" className="mt-2 text-[10px] text-red-600">{addError}</p>}
            </form>

            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d9dadd] bg-white px-5 py-8 text-center">
                <h3 className="text-[12px] font-semibold">Bạn chưa có công việc cá nhân nào</h3>
                <p className="mt-1 text-[10px] text-[#777]">Bài tập được công bố sẽ hiển thị trong lớp học tương ứng.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isEditing = editingId === task.id;
                  const createdAt = task.created_at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(task.created_at)) : '';
                  return (
                    <article key={task.id} data-testid="task-item" className="rounded-xl border border-[#e2e2e2] bg-white p-3.5">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={task.is_done} disabled={isSubmitting} onChange={() => void handleToggleTask(task)} aria-label={`Đánh dấu hoàn thành ${task.title}`} className="mt-1 h-4 w-4 shrink-0 accent-[#111] disabled:opacity-50" />
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <>
                              <label className="sr-only" htmlFor={`edit-text-${task.id}`}>Sửa tiêu đề công việc</label>
                              <textarea id={`edit-text-${task.id}`} rows={2} maxLength={120} value={editTitle} disabled={isSubmitting} onChange={(event) => { setEditTitle(event.target.value); if (editError) setEditError(''); }} className="w-full resize-y rounded-lg border border-[#d9dadd] px-3 py-2 text-[12px] outline-none focus:border-[#777]" />
                              {editError && <p role="alert" className="mt-1 text-[10px] text-red-600">{editError}</p>}
                              <div className="mt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => { setEditingId(null); setEditError(''); }} disabled={isSubmitting} className="h-8 rounded-lg border border-[#dedfe2] px-3 text-[9px]">Hủy</button>
                                <button type="button" onClick={() => void handleSaveEdit(task.id)} disabled={isSubmitting} className="h-8 rounded-lg bg-[#151617] px-3 text-[9px] font-semibold text-white">{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <h3 className={`break-words text-[12px] font-semibold ${task.is_done ? 'text-[#888] line-through' : ''}`}>{task.title}</h3>
                              <div className="mt-1.5 flex flex-wrap gap-3 text-[9px] text-[#777]"><span>{task.is_done ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span>{createdAt && <span>Tạo ngày {createdAt}</span>}</div>
                            </>
                          )}
                        </div>
                        {!isEditing && <div className="flex gap-1">
                          <button type="button" onClick={() => { setEditingId(task.id); setEditTitle(task.title); setEditError(''); }} disabled={isSubmitting} aria-label={`Sửa ${task.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] hover:bg-[#f3f3f4]"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => void handleDeleteTask(task)} disabled={isSubmitting} aria-label={`Xóa ${task.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777] hover:bg-[#fff1f0] hover:text-[#b42318]"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                        </div>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {activeDialog && <PreviewDialog type={activeDialog} onClose={() => setActiveDialog(null)} />}
    </main>
  );
}

function DemoAssignmentCard({ assignment, onAction }: { assignment: DemoAssignment; onAction: (action: string) => void }) {
  const urgent = assignment.status === 'pending' && assignment.id === 'cs102-heap';
  const completed = assignment.status === 'completed';

  return (
    <article data-testid={`demo-assignment-${assignment.id}`} className={`relative overflow-hidden rounded-[22px] border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6 ${urgent ? 'border-2 border-[#f39b9b]' : 'border-[#e2e2e2]'}`}>
      {urgent && <span className="absolute right-0 top-0 flex items-center gap-1.5 rounded-bl-xl bg-[#c9171d] px-4 py-2 text-[9px] font-bold uppercase text-white"><Icon name="clock" className="h-3.5 w-3.5" /> Còn 06 giờ 30 phút</span>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#737373]">
            <span className="rounded-full bg-[#efefef] px-2.5 py-1 font-semibold text-[#292929]">{assignment.courseCode}</span>
            <span>{assignment.courseName}</span><span className="text-[#aaa]">•</span><span>Giảng viên: {assignment.instructor}</span>
          </div>
          <h2 className="mt-3 max-w-[520px] text-[17px] font-bold leading-tight tracking-tight sm:text-[19px]">{assignment.title}</h2>
        </div>
        {assignment.badge && !urgent && (
          <span className={`max-w-[130px] rounded-full border px-3 py-2 text-[10px] font-semibold leading-tight ${completed ? 'border-[#dedede] bg-[#f4f4f4] text-[#333]' : 'border-[#c9c4ff] bg-[#f0efff] text-[#3830b6]'}`}>
            {assignment.badge}
          </span>
        )}
      </div>

      {assignment.record === 'progress' ? (
        <div className="mt-4 rounded-xl border border-[#e2e2e2] bg-[#fafafa] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#777]"><span>{assignment.due}</span><strong className="text-[#655dff]">{assignment.dueMeta}</strong></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7e7e7]"><div className="h-full w-[95%] rounded-full bg-[#7067ff]" /></div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px] text-[#858585]"><span>{assignment.duration}</span><span>{assignment.language}</span></div>
        </div>
      ) : (
        <>
          <div className={`mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 sm:grid-cols-3 ${urgent ? 'mt-4' : ''}`}>
            <div><p className="text-[9px] text-[#777]">{completed ? assignment.due : 'Hạn nộp (Deadline)'}</p><p className={`mt-1 text-[10px] font-semibold ${urgent ? 'text-[#c91d24]' : 'text-[#333]'}`}>{assignment.due}</p></div>
            <div><p className="text-[9px] text-[#777]">{completed ? 'Thời lượng ghi âm' : 'Thời lượng cho phép'}</p><p className="mt-1 text-[10px] font-semibold text-[#333]">{assignment.dueMeta}</p></div>
            <div><p className="text-[9px] text-[#777]">{assignment.language}</p><p className="mt-1 text-[10px] font-semibold text-[#333]">{assignment.duration}</p></div>
          </div>
          <div className="mt-3.5">
            <p className="mb-2 text-[9px] font-semibold uppercase text-[#555]">{completed ? 'Kết quả đánh giá' : 'Trọng số Rubric Auralis AI:'}</p>
            <div className={`grid gap-2 ${assignment.rubrics.length === 4 ? 'grid-cols-2 min-[1300px]:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {assignment.rubrics.map((rubric) => (
                <div key={rubric.label} className="rounded-lg border border-[#e2e2e2] bg-[#f4f4f4] px-2.5 py-2">
                  <p className="text-[9px] text-[#777]">{rubric.label}</p><p className={`mt-1 text-[10px] font-semibold ${rubric.value.includes('Rất tốt') || rubric.value.includes('9.0') ? 'text-[#078344]' : 'text-[#333]'}`}>{rubric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e7e7e7] pt-3">
        <div className="flex items-center gap-1.5 text-[9px] text-[#777]"><span className={`h-1.5 w-1.5 rounded-full ${completed ? 'bg-[#13945a]' : 'bg-[#919191]'}`} />{completed ? 'Đã hoàn thành • Có kết quả' : assignment.status === 'grading' ? 'Đã nộp • Đang chờ xử lý' : 'Đang mở - Chưa nộp'}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {completed ? (
            <><button type="button" onClick={() => onAction('audio')} className="flex h-8 items-center gap-1.5 rounded-full border border-[#d7d7d7] px-3 text-[9px] hover:bg-[#f6f6f6]"><Icon name="headphones" className="h-3.5 w-3.5" /> Nghe lại bản thu</button><button type="button" onClick={() => onAction('analysis')} className="h-8 rounded-full bg-[#efefef] px-3 text-[9px] hover:bg-[#e7e7e7]">Xem tiến trình phân tích AI</button></>
          ) : assignment.status === 'grading' ? (
            <><button type="button" onClick={() => onAction('audio')} className="flex h-8 items-center gap-1.5 rounded-full border border-[#d7d7d7] px-3 text-[9px] hover:bg-[#f6f6f6]"><Icon name="headphones" className="h-3.5 w-3.5" /> Nghe lại bản thu</button><button type="button" onClick={() => onAction('analysis')} className="h-8 rounded-full bg-[#efefef] px-3 text-[9px] hover:bg-[#e7e7e7]">Xem tiến trình phân tích AI</button></>
          ) : (
            <><button type="button" onClick={() => onAction('slides')} className="h-8 rounded-full border border-[#d4d4d4] bg-white px-3 text-[9px] hover:bg-[#f6f6f6]">Đề bài &amp; Slide mẫu</button><button type="button" onClick={() => onAction('rubric')} className="h-8 rounded-full border border-[#d4d4d4] bg-white px-3 text-[9px] hover:bg-[#f6f6f6]">Xem Rubric</button><button type="button" onClick={() => onAction('room')} className="flex h-8 items-center gap-1.5 rounded-full bg-[#111] px-3 text-[9px] font-semibold text-white hover:bg-[#333]"><Icon name="mic" className="h-3.5 w-3.5" /> Vào phòng thu âm AI</button></>
          )}
        </div>
      </div>
    </article>
  );
}

function TipCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-xl border border-[#e2e2e2] bg-[#fafafa] p-3"><h3 className="text-[10px] font-semibold text-[#333]">{title}</h3><p className="mt-1.5 text-[9px] leading-relaxed text-[#6e6e6e]">{children}</p></article>;
}

function PreviewDialog({ type, onClose }: { type: string; onClose: () => void }) {
  const details: Record<string, { title: string; body: string }> = {
    audio: { title: 'Kiểm tra Micro & Audio', body: 'Đây là giao diện minh họa theo thiết kế. Quyền truy cập microphone và đo thông số âm học chưa được kết nối.' },
    notifications: { title: 'Thông báo', body: 'Thông báo bài thi trong ảnh là dữ liệu minh họa, chưa liên kết với lịch bài tập.' },
    schedule: { title: 'Lịch thi Oral', body: 'Lịch thi đang hiển thị dữ liệu demo theo ảnh tham chiếu.' },
    slides: { title: 'Đề bài & Slide mẫu', body: 'Tài liệu bài tập demo chưa được tải lên hệ thống.' },
    rubric: { title: 'Rubric chấm điểm', body: 'Các tiêu chí rubric đang là dữ liệu minh họa, chưa được lưu trong cơ sở dữ liệu.' },
    room: { title: 'Phòng thu âm AI', body: 'Phòng thi đang ở chế độ xem trước. Chức năng ghi âm và nộp bài chưa được tích hợp.' },
    analysis: { title: 'Phân tích AI', body: 'Tiến trình và điểm phân tích đang là dữ liệu minh họa theo thiết kế.' },
  };
  const detail = details[type] ?? details.room;

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" className="w-full max-w-md rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div><span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e6] px-2 py-1 text-[9px] font-semibold text-[#866313]">BẢN XEM TRƯỚC</span><h2 id="preview-dialog-title" className="mt-2 text-[17px] font-bold">{detail.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] hover:bg-[#f2f2f2]"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#666]">{detail.body}</p>
        <button type="button" onClick={onClose} className="mt-5 h-9 rounded-lg bg-[#111] px-4 text-[11px] font-semibold text-white hover:bg-[#333]">Đã hiểu</button>
      </section>
    </div>
  );
}
