'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export interface TaskItemData {
  id: string;
  title: string;
  is_done: boolean;
  created_at?: string;
  score?: number;
  duration?: number;
  keywords?: string[];
  rubric?: string;
}

export default function TaskDashboard() {
  const router = useRouter();

  // State xác thực & phiên người dùng
  const [userEmail, setUserEmail] = useState<string>('');
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // State danh sách công việc (lấy thật từ Supabase qua API)
  const [tasks, setTasks] = useState<TaskItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // State thêm mới
  const [newTitle, setNewTitle] = useState('');
  const [addError, setAddError] = useState('');

  // State chỉnh sửa
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editError, setEditError] = useState('');

  // Form cấu hình bài tập chung
  const [examTitle, setExamTitle] = useState('Kiểm tra Vấn đáp Giữa kỳ: Kiến trúc Web Frontend hiện đại');
  const [deadline, setDeadline] = useState('23:59 - 25/11/2026');
  const [maxRetakes, setMaxRetakes] = useState('3');

  // Helper gọi API có tự động đính kèm Access Token của người dùng
  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push('/login');
      throw new Error('Chưa đăng nhập');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${session.access_token}`);
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      await supabase.auth.signOut();
      router.push('/login');
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error || 'Có lỗi xảy ra từ máy chủ.');
    }

    return json;
  }, [router]);

  // Tải danh sách công việc từ backend
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await apiFetch('/api/tasks');
      setTasks(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách công việc.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  // Kiểm tra phiên đăng nhập và lắng nghe sự kiện Auth
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        if (isMounted) {
          setUserEmail(session.user?.email || '');
          setAuthChecking(false);
          await loadTasks();
        }
      } catch {
        if (isMounted) {
          router.push('/login');
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setTasks([]);
        setUserEmail('');
        router.push('/login');
      } else if (isMounted) {
        setUserEmail(session.user?.email || '');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, loadTasks]);

  // Xử lý Đăng xuất
  const handleSignOut = async () => {
    setTasks([]);
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 1. Thêm công việc mới: POST /api/tasks
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      setAddError('Tên câu hỏi/công việc sau khi cắt khoảng trắng phải dài từ 1–120 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setAddError('');
    try {
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: trimmed }),
      });
      setNewTitle('');
      await loadTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi thêm công việc.';
      setAddError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Đổi trạng thái hoàn thành: PATCH /api/tasks/:id
  const handleToggleTask = async (id: string, currentDone: boolean) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_done: !currentDone }),
      });
      await loadTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái.';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Xóa công việc: DELETE /api/tasks/:id
  const handleDeleteTask = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${title}"?`)) {
      return;
    }

    setIsSubmitting(true);
    setApiError('');
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (editingId === id) setEditingId(null);
      await loadTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi xóa công việc.';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Bắt đầu sửa
  const handleStartEdit = (task: TaskItemData) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditError('');
  };

  // 5. Lưu sửa: PATCH /api/tasks/:id
  const handleSaveEdit = async (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      setEditError('Tên phải từ 1–120 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setEditError('');
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: trimmed }),
      });
      setEditingId(null);
      await loadTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi lưu chỉnh sửa.';
      setEditError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc theo trạng thái
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.is_done;
    if (filter === 'completed') return t.is_done;
    return true;
  });

  const totalScore = tasks.reduce((sum, item) => sum + (item.score ?? 2.5), 0);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center text-sm font-semibold text-[#2a14b4]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#2a14b4] border-t-transparent rounded-full animate-spin" />
          <span>Đang xác minh quyền truy cập...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] min-h-screen flex flex-col font-sans antialiased">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40 bg-white border-b border-[#c7c4d7] shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4338ca] text-white flex items-center justify-center font-bold text-lg">
              🎙️
            </div>
            <span className="text-lg font-bold text-[#2a14b4] tracking-tight">OralEval IE104</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-[#464554]">
            <a href="#" className="hover:text-[#2a14b4] transition-colors">Cohorts</a>
            <a href="#" className="hover:text-[#2a14b4] transition-colors">Assessments</a>
            <a href="#" className="hover:text-[#2a14b4] transition-colors">Analytics</a>
            <a href="#" className="hover:text-[#2a14b4] transition-colors">Rubrics</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-[#111c2d] truncate max-w-[180px]">
              {userEmail || 'Tài khoản'}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Supabase Auth Connected</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            title="Đăng xuất khỏi hệ thống"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-64px)]">
        {/* SIDEBAR BÊN TRÁI */}
        <aside className="w-64 h-full flex flex-col justify-between p-4 border-r border-[#c7c4d7] bg-white shrink-0 hidden lg:flex sticky top-16" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 px-2 pt-1">
              <div className="w-9 h-9 rounded-lg bg-[#dee8ff] flex items-center justify-center text-[#2a14b4] font-bold">
                🏛️
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#2a14b4] leading-tight">OralEval IE104</span>
                <span className="text-[11px] text-[#464554]">Higher Ed Assessment</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#4338ca] text-white text-xs font-semibold hover:bg-[#2a14b4] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a14b4]"
            >
              + New Assessment
            </button>

            <nav className="flex flex-col gap-1 text-xs font-medium text-[#464554]">
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f0f3ff]">
                <span>📊</span> Dashboard
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f0f3ff]">
                <span>🎙️</span> Active Exams
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#dee8ff] text-[#2a14b4] font-bold">
                <span>📝</span> Question Builder
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f0f3ff]">
                <span>✅</span> Evaluation Hub
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f0f3ff]">
                <span>🎓</span> Gradebook
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-1 pt-3 border-t border-[#c7c4d7] text-xs text-[#464554]">
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:text-[#2a14b4]">
              <span>📖</span> Documentation
            </a>
            <a href="#" className="flex items-center gap-2 px-2 py-1.5 hover:text-[#2a14b4]">
              <span>⚙️</span> Settings
            </a>
          </div>
        </aside>

        {/* WORKSPACE CHÍNH */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 border-b border-[#c7c4d7] gap-4">
            <div>
              <nav className="flex items-center gap-2 text-xs text-[#464554] mb-1">
                <span>Lớp IE104.N21</span>
                <span>&gt;</span>
                <span className="text-[#2a14b4] font-semibold">Quản lý Việc học của tôi</span>
              </nav>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-[#111c2d]">Cấu hình Đề thi &amp; Danh sách việc học</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Lab 2 - Dữ liệu Supabase RLS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-auto">
              <button
                type="button"
                onClick={loadTasks}
                disabled={loading || isSubmitting}
                className="px-3.5 py-2 rounded-lg border border-[#c7c4d7] bg-white text-xs font-semibold hover:bg-[#f0f3ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] disabled:opacity-50"
              >
                🔄 {loading ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>
          </div>

          {/* Báo lỗi API nếu có */}
          {apiError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{apiError}</span>
              </div>
              <button
                type="button"
                onClick={() => setApiError('')}
                className="text-xs font-bold hover:underline"
              >
                Đóng
              </button>
            </div>
          )}

          {/* BENTO ARCHITECTURE */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI (8 COLS) */}
            <div className="xl:col-span-8 space-y-6">
              {/* PHẦN 1: THÔNG TIN BÀI TẬP */}
              <section className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#c7c4d7]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#2a14b4]">⚙️</span>
                    <h2 className="text-sm font-bold text-[#111c2d]">Phần 1: Thông tin chung bài tập</h2>
                  </div>
                  <span className="text-[11px] text-[#464554]">Bắt buộc thiết lập</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="assignment-title" className="block font-semibold mb-1">
                      Tên bài tập vấn đáp <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="assignment-title"
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#c7c4d7] bg-white text-xs outline-none focus:border-[#2a14b4] focus:ring-2 focus:ring-[#2a14b4]/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="deadline-input" className="block font-semibold mb-1">
                        Hạn nộp (Deadline) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="deadline-input"
                        type="text"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#c7c4d7] bg-white text-xs font-mono outline-none focus:border-[#2a14b4]"
                      />
                    </div>
                    <div>
                      <label htmlFor="retakes-select" className="block font-semibold mb-1">
                        Số lần sinh viên được ghi âm lại
                      </label>
                      <select
                        id="retakes-select"
                        value={maxRetakes}
                        onChange={(e) => setMaxRetakes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#c7c4d7] bg-white text-xs outline-none focus:border-[#2a14b4]"
                      >
                        <option value="1">1 lần (Nghiêm ngặt)</option>
                        <option value="2">2 lần</option>
                        <option value="3">3 lần (Khuyên dùng)</option>
                        <option value="5">5 lần</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* PHẦN 2: DANH SÁCH CÂU HỎI VẤN ĐÁP (CRUD API) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#2a14b4]">📋</span>
                    <h2 className="text-sm font-bold text-[#111c2d]">Phần 2: Danh sách câu hỏi vấn đáp</h2>
                  </div>

                  {/* BỘ LỌC 3 TRẠNG THÁI */}
                  <div className="flex items-center p-1 rounded-lg bg-[#f0f3ff] border border-[#c7c4d7] text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#2a14b4] ${
                        filter === 'all' ? 'bg-white text-[#2a14b4] shadow-sm' : 'text-[#464554]'
                      }`}
                    >
                      Tất cả ({tasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('pending')}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#2a14b4] ${
                        filter === 'pending' ? 'bg-white text-[#2a14b4] shadow-sm' : 'text-[#464554]'
                      }`}
                    >
                      Chưa xong ({tasks.filter((t) => !t.is_done).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('completed')}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#2a14b4] ${
                        filter === 'completed' ? 'bg-white text-[#2a14b4] shadow-sm' : 'text-[#464554]'
                      }`}
                    >
                      Đã xong ({tasks.filter((t) => t.is_done).length})
                    </button>
                  </div>
                </div>

                {/* FORM THÊM MỚI (VALIDATE 1–120 KÝ TỰ, GỌI POST /api/tasks) */}
                <form onSubmit={handleAddTask} className="p-4 rounded-xl border-2 border-dashed border-[#c7c4d7] bg-white space-y-2">
                  <label htmlFor="new-task-input" className="block text-xs font-bold text-[#111c2d]">
                    Thêm câu hỏi / công việc mới <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="new-task-input"
                      type="text"
                      value={newTitle}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        setNewTitle(e.target.value);
                        if (addError) setAddError('');
                      }}
                      placeholder="Nhập tên câu hỏi hoặc việc cần làm (1–120 ký tự)..."
                      className={`flex-1 px-3.5 py-2.5 rounded-lg border bg-[#f9f9ff] text-xs outline-none transition-colors disabled:opacity-50 ${
                        addError ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-[#c7c4d7] focus:border-[#2a14b4] focus:ring-2 focus:ring-[#2a14b4]/20'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-lg bg-[#4338ca] text-white text-xs font-semibold hover:bg-[#2a14b4] shrink-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Đang thêm...' : '+ Thêm công việc'}
                    </button>
                  </div>
                  {addError && <p className="text-[11px] text-red-600 font-medium pl-1">{addError}</p>}
                </form>

                {/* LOADING STATE */}
                {loading ? (
                  <div className="p-8 text-center rounded-xl border border-[#c7c4d7] bg-white">
                    <div className="inline-block w-6 h-6 border-2 border-[#2a14b4] border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-gray-500 font-semibold">Đang đồng bộ dữ liệu từ Supabase...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  /* EMPTY STATE */
                  <div className="p-8 text-center rounded-xl border-2 border-dashed border-[#c7c4d7] bg-white">
                    <p className="text-xs text-gray-500 font-semibold">Chưa có công việc nào trong danh mục này.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Hãy nhập tên và bấm nút &quot;+ Thêm công việc&quot; ở trên!</p>
                  </div>
                ) : (
                  filteredTasks.map((task, index) => {
                    const isExpanded = editingId === task.id;

                    return (
                      <article
                        key={task.id}
                        data-testid="task-item"
                        className={`bg-white rounded-xl shadow-sm transition-all overflow-hidden border ${
                          isExpanded ? 'border-2 border-[#2a14b4]/60' : 'border-[#c7c4d7]'
                        }`}
                      >
                        {/* Header Thẻ */}
                        <div className="bg-[#dee8ff]/50 px-4 py-3 border-b border-[#c7c4d7] flex items-center justify-between">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                            <label htmlFor={`check-${task.id}`} className="sr-only">
                              Đánh dấu hoàn thành {task.title}
                            </label>
                            <input
                              id={`check-${task.id}`}
                              type="checkbox"
                              checked={task.is_done}
                              disabled={isSubmitting}
                              onChange={() => handleToggleTask(task.id, task.is_done)}
                              className="w-4 h-4 rounded text-[#2a14b4] focus:ring-[#2a14b4] cursor-pointer disabled:opacity-50"
                            />
                            <span className="w-5 h-5 rounded bg-[#2a14b4] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                              {index < 9 ? `0${index + 1}` : index + 1}
                            </span>
                            <span className={`text-xs font-bold truncate ${task.is_done ? 'line-through text-gray-400' : 'text-[#2a14b4]'}`}>
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => (isExpanded ? setEditingId(null) : handleStartEdit(task))}
                              disabled={isSubmitting}
                              className="px-2 py-1 text-xs text-[#464554] hover:text-[#2a14b4] rounded hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#2a14b4] disabled:opacity-50"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              disabled={isSubmitting}
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-700 rounded hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
                            >
                              🗑️ Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(isExpanded ? null : task.id)}
                              className="p-1 text-xs text-[#464554]"
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>
                        </div>

                        {/* Thân thẻ khi mở rộng sửa */}
                        {isExpanded ? (
                          <div className="p-5 space-y-4 text-xs">
                            <div>
                              <label htmlFor={`edit-text-${task.id}`} className="block font-semibold mb-1">
                                Sửa tiêu đề câu hỏi (1–120 ký tự) <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                id={`edit-text-${task.id}`}
                                rows={2}
                                value={editTitle}
                                disabled={isSubmitting}
                                onChange={(e) => {
                                  setEditTitle(e.target.value);
                                  if (editError) setEditError('');
                                }}
                                className="w-full p-2.5 rounded-lg border border-[#c7c4d7] bg-white outline-none focus:border-[#2a14b4] disabled:opacity-50"
                              />
                              {editError && <p className="text-[11px] text-red-600 mt-1">{editError}</p>}
                            </div>

                            {/* Tham số thời gian & điểm */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-3.5 rounded-lg bg-[#f0f3ff] border border-[#c7c4d7]">
                              <div className="md:col-span-7 space-y-1.5">
                                <span className="block font-semibold">Thời gian nói tối đa</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" className="px-2.5 py-1 bg-white border border-[#c7c4d7] rounded">60s</button>
                                  <button type="button" className="px-2.5 py-1 bg-[#4338ca] text-white rounded font-bold">90s</button>
                                  <button type="button" className="px-2.5 py-1 bg-white border border-[#c7c4d7] rounded">120s</button>
                                </div>
                              </div>
                              <div className="md:col-span-5 space-y-1.5">
                                <span className="block font-semibold">Trọng số điểm</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    defaultValue={task.score ?? 2.5}
                                    className="w-14 px-2 py-1 text-center font-bold font-mono border rounded bg-white"
                                  />
                                  <span>/ 10 điểm</span>
                                </div>
                              </div>
                            </div>

                            {/* Barem & Từ khóa AI */}
                            <div className="p-4 rounded-xl border border-[#2a14b4]/20 bg-[#f0f3ff]/60 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-[#c7c4d7]">
                                <span className="font-bold text-[#2a14b4]">Cấu hình Barem &amp; Từ khóa cho AI</span>
                                <span className="text-[10px] text-emerald-600 font-bold">● OralLLM Sẵn sàng</span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {(task.keywords ?? ['Kiến thức cốt lõi', 'Chuẩn IE104']).map((kw, i) => (
                                  <span key={i} className="px-2 py-1 rounded bg-white border border-[#c7c4d7] text-[11px] flex items-center gap-1">
                                    <span className="text-emerald-600">✓</span> {kw}
                                  </span>
                                ))}
                              </div>

                              <div>
                                <label htmlFor={`rubric-${task.id}`} className="block font-semibold mb-1">
                                  Hướng dẫn chấm cho LLM:
                                </label>
                                <textarea
                                  id={`rubric-${task.id}`}
                                  rows={3}
                                  defaultValue={task.rubric ?? 'Đối chiếu nội dung phát biểu với từ khóa chuẩn barem.'}
                                  className="w-full p-2.5 rounded-lg border border-[#c7c4d7] bg-white text-[11px]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 rounded-lg border border-[#c7c4d7] bg-white font-medium focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                              >
                                Thu gọn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(task.id)}
                                disabled={isSubmitting}
                                className="px-4 py-1.5 rounded-lg bg-[#2a14b4] text-white font-semibold shadow-sm hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] disabled:opacity-50"
                              >
                                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </div>

            {/* CỘT PHẢI (4 COLS): TIẾN ĐỘ & BAREM MẪU */}
            <div className="xl:col-span-4 space-y-5">
              <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm space-y-3.5 text-xs">
                <h3 className="font-bold text-[#111c2d] text-sm flex items-center gap-2">
                  <span>📊</span> Phân bổ trọng số bài thi
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-[#464554]">
                    <span>Số lượng câu hỏi:</span>
                    <span className="font-bold text-[#111c2d] font-mono">{tasks.length} câu</span>
                  </div>
                  <div className="flex justify-between text-[#464554]">
                    <span>Đã hoàn thành:</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {tasks.filter((t) => t.is_done).length} / {tasks.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#464554]">
                    <span>Tổng điểm đã cấu hình:</span>
                    <span className="font-bold text-[#2a14b4] font-mono">{totalScore.toFixed(1)} / 10.0 điểm</span>
                  </div>

                  <div className="w-full bg-[#dee8ff] rounded-full h-2 overflow-hidden mt-1">
                    <div
                      className="bg-[#2a14b4] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((totalScore / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800">
                  ✅ Dữ liệu được lưu trữ thật trên <strong>Supabase PostgreSQL</strong> qua Next.js API Routes với RLS.
                </div>
              </div>

              <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#111c2d] text-sm flex items-center gap-2">
                    <span>📚</span> Mẫu Barem Chuẩn gợi ý
                  </h3>
                  <span className="text-[10px] text-[#2a14b4] font-bold">Khoa HTTT</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border border-[#c7c4d7] hover:border-[#2a14b4] transition-colors cursor-pointer bg-[#f9f9ff]">
                    <div className="font-semibold text-[#111c2d]">Kiến trúc Web &amp; Security</div>
                    <p className="text-[11px] text-[#464554] mt-0.5 line-clamp-1">Đánh giá Cookie, Token Auth, HTTPS handshake...</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#c7c4d7] hover:border-[#2a14b4] transition-colors cursor-pointer bg-[#f9f9ff]">
                    <div className="font-semibold text-[#111c2d]">React &amp; Virtual DOM Lifecycle</div>
                    <p className="text-[11px] text-[#464554] mt-0.5 line-clamp-1">Fiber reconciler, memoization, batching updates...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}