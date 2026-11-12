'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile } from '@/lib/profile-cache';
import { oralcheckFetch } from '@/lib/oralcheck-client';

interface EnrolledClass {
  id: string;
  code: string;
  name: string;
  teacher: string;
  totalAssignments: number;
  nextDeadline: string;
  nextAssignmentTitle: string;
  status: 'active';
  accentColor: string;
}

interface ClassRecord {
  id: string;
  class_name: string;
  class_code: string;
  description: string | null;
  lecturer_name: string | null;
  status: 'active' | 'pending' | 'rejected' | 'archived';
}

interface AssignmentRecord {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
}

function mapClass(item: ClassRecord, assignments: AssignmentRecord[]): EnrolledClass {
  const publishedAssignments = assignments
    .filter((assignment) => assignment.status === 'published')
    .sort((a, b) => {
      if (!a.ends_at) return 1;
      if (!b.ends_at) return -1;
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
    });
  const nextAssignment = publishedAssignments.find(
    (assignment) => !assignment.ends_at || new Date(assignment.ends_at).getTime() >= Date.now(),
  );
  return {
    id: item.id,
    code: item.class_code,
    name: item.class_name,
    teacher: item.lecturer_name ?? 'Chưa cập nhật',
    totalAssignments: publishedAssignments.length,
    nextDeadline: nextAssignment?.ends_at
      ? new Date(nextAssignment.ends_at).toLocaleString('vi-VN')
      : 'Chưa thiết lập',
    nextAssignmentTitle: nextAssignment?.title ?? 'Chưa có bài tập sắp đến hạn',
    status: 'active',
    accentColor: 'indigo',
  };
}

export default function StudentClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [fullName, setFullName] = useState('');
  const [institutionalId, setInstitutionalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [signingOut, setSigningOut] = useState(false);

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
        const [profile, response] = await Promise.all([
          getCachedProfile(user.id),
          oralcheckFetch<{ data: ClassRecord[] }>('/api/classes'),
        ]);
        if (profile.role !== 'student') {
          router.replace('/teacher');
          return;
        }
        if (!active) return;
        setFullName(profile.full_name ?? '');
        setInstitutionalId(profile.institutional_id ?? '');
        const mappedClasses = await Promise.all(response.data.map(async (item) => {
          const { data: assignments } = await oralcheckFetch<{ data: AssignmentRecord[] }>(
            `/api/classes/${item.id}/assignments`,
          );
          return mapClass(item, assignments);
        }));
        if (active) setClasses(mappedClasses);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải lớp học.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  async function handleJoinClass(e: React.FormEvent) {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    const code = classCodeInput.trim().toUpperCase();
    if (!code) {
      setJoinError('Vui lòng nhập mã lớp học.');
      return;
    }

    try {
      await oralcheckFetch('/api/classes/join', {
        method: 'POST',
        body: JSON.stringify({ class_code: code }),
      });
      setJoinSuccess(`Đã tham gia lớp ${code}.`);
      setClassCodeInput('');
      const { data } = await oralcheckFetch<{ data: ClassRecord[] }>('/api/classes');
      const refreshedClasses = await Promise.all(data.map(async (item) => {
        const { data: assignments } = await oralcheckFetch<{ data: AssignmentRecord[] }>(
          `/api/classes/${item.id}/assignments`,
        );
        return mapClass(item, assignments);
      }));
      setClasses(refreshedClasses);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Không thể tham gia lớp học.');
    }
  }

  const filteredClasses = classes
    .filter((c) => filterTab === 'all' || c.status === filterTab)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacher.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalClassesCount = classes.length;
  const totalPublishedAssignments = classes.reduce((sum, c) => sum + c.totalAssignments, 0);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <StudentSidebar
        currentPage="classes"
        fullName={fullName || 'Sinh viên'}
        institutionalId={institutionalId}
        signingOut={signingOut}
        interactiveUnavailable
        onSignOut={handleSignOut}
        onUnavailable={(action) => {
          if (action === 'history') router.push('/student/history');
          if (action === 'settings') router.push('/student/profile');
        }}
      />

      <div className="md:ml-[255px]">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/student" className="hover:text-black">
              Cổng sinh viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">Lớp học của tôi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tham gia lớp bằng mã
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Hero Banner */}
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">
            <div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Lớp học của tôi &amp; Kế hoạch học tập
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Quản lý các học phần đang tham gia, tiến độ nộp bài vấn đáp oral và lịch nhắc hạn nộp (deadline) thời gian thực.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Lớp học tham gia
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{totalClassesCount}</span>
                <span className="text-xs text-gray-500">học phần</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Các lớp đã tham gia</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Bài tập đã công bố
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-900">{totalPublishedAssignments}</span>
                <span className="text-xs text-amber-700">bài tập</span>
              </div>
              <p className="mt-1 text-xs text-amber-800">Bài nháp không được hiển thị cho sinh viên</p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
                Nộp bài &amp; điểm số
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-indigo-900">Chưa bật</span>
              </div>
              <p className="mt-1 text-xs text-indigo-800">Ghi âm, camera và AI đang được tạm hoãn</p>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl bg-gray-200/70 p-1">
              <button
                onClick={() => setFilterTab('all')}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  filterTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả các lớp ({classes.length})
              </button>
              <button
                onClick={() => setFilterTab('active')}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  filterTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đang diễn ra ({classes.filter((c) => c.status === 'active').length})
              </button>
            </div>

            <div className="relative w-full max-w-xs">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 5 5a7.5 7.5 0 0 0 11.65 11.65z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã lớp, tên môn học, giảng viên..."
                className="w-full rounded-full border border-gray-300 bg-white py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Class Cards Grid */}
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
          {loading && <p className="mb-4 text-sm text-gray-500">Đang tải lớp học...</p>}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredClasses.map((item) => {
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-gray-900">
                          {item.code}
                        </span>
                        <span className="text-xs text-gray-500">{item.totalAssignments} bài tập đã công bố</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          item.status === 'active'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-gray-200 bg-gray-100 text-gray-600'
                        }`}
                      >
                        Đang học
                      </span>
                    </div>

                    <Link
                      href={`/student/classes/${item.id}`}
                      className="group-hover:text-indigo-600 transition"
                    >
                      <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition">
                        {item.name}
                      </h2>
                    </Link>
                    <p className="mt-1 text-xs text-gray-600">
                      Giảng viên: <span className="font-medium text-gray-900">{item.teacher}</span>
                    </p>

                    <p className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs text-gray-600">
                      Tiến độ nộp bài và điểm số sẽ hiển thị khi chức năng nộp bài được triển khai.
                    </p>

                    {/* Next assignment announcement */}
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-100 bg-[#f8f9ff] p-3 text-xs">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-semibold text-indigo-900 block">{item.nextAssignmentTitle}</span>
                        <span className="text-[11px] text-gray-500">Hạn nộp: {item.nextDeadline}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/student/classes/${item.id}`}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition flex items-center gap-1"
                      >
                        Chi tiết lớp &amp; Bài tập →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filteredClasses.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
                Bạn chưa tham gia lớp học nào. Nhập mã do giảng viên cung cấp để tham gia.
              </p>
            )}
          </div>

          {filteredClasses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-4 text-base font-semibold text-gray-900">Không tìm thấy lớp học</h3>
              <p className="mt-1 text-xs text-gray-500">
                Thử kiểm tra lại từ khóa tìm kiếm hoặc tham gia lớp học mới bằng mã code do giảng viên cung cấp.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* MODAL THAM GIA LỚP HỌC BẰNG MÃ */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Tham gia lớp học mới</h3>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError('');
                  setJoinSuccess('');
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinClass} className="mt-4 space-y-4">
              <p className="text-xs text-gray-600">
                Nhập mã lớp học gồm 6–10 ký tự chữ hoặc số (ví dụ: <code className="rounded bg-gray-100 px-1 py-0.5 font-bold text-black">AIO8892</code>) do giảng viên bộ môn cung cấp:
              </p>

              <div>
                <label htmlFor="class-code-input" className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Mã lớp học (Class Code) *
                </label>
                <input
                  id="class-code-input"
                  type="text"
                  required
                  minLength={6}
                  maxLength={10}
                  pattern="[A-Za-z0-9]{6,10}"
                  placeholder="VD: AIO8892"
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-black placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {joinError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                  ✓ {joinSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                >
                  Xác nhận tham gia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
