'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/TeacherSidebar';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile } from '@/lib/profile-cache';
import { oralcheckFetch } from '@/lib/oralcheck-client';

interface StudentRosterItem {
  id: string;
  name: string;
  studentId: string;
  joinedAt: string;
  department: string;
}

interface ClassRecord {
  id: string;
  class_name: string;
  class_code: string;
  description: string | null;
  status: 'pending' | 'active' | 'rejected' | 'archived';
  lecturer_name: string | null;
}

interface AssignmentRecord {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
}

export default function TeacherClassDetail({
  classCode,
  classId,
}: {
  classCode?: string;
  classId?: string;
} = {}) {
  const router = useRouter();
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const effectiveCode = classRecord?.class_code ?? classCode ?? classId ?? '';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'assignments' | 'spectrogram'>('roster');
  const [signingOut, setSigningOut] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [cancellationRequested, setCancellationRequested] = useState(false);
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.replace('/login');
          return;
        }
        const profile = await getCachedProfile(session.user.id);
        if (profile.role !== 'teacher' && profile.role !== 'admin') {
          router.replace(profile.role === 'student' ? '/student' : '/login');
          return;
        }
        if (active) setAdminMode(profile.role === 'admin');

        const { data: classes } = await oralcheckFetch<{ data: ClassRecord[] }>('/api/classes');
        const currentClass = classes.find((item) => item.id === (classId ?? classCode));
        if (!currentClass) throw new Error('Không tìm thấy lớp học hoặc bạn không có quyền truy cập.');
        if (profile.role !== 'admin' && currentClass.status === 'pending') {
          throw new Error('Lớp đang chờ quản trị viên duyệt. Bạn chỉ có thể vào lớp sau khi được duyệt.');
        }
        const [roster, classAssignments, cancellation] = await Promise.all([
          oralcheckFetch<{ data: Array<{ student_id: string; full_name: string; student_code: string; department: string; joined_at: string }> }>(`/api/classes/${currentClass.id}/members`),
          oralcheckFetch<{ data: AssignmentRecord[] }>(`/api/classes/${currentClass.id}/assignments`),
          oralcheckFetch<{ data: { id: string } | null }>(`/api/classes/${currentClass.id}/cancel`),
        ]);
        if (!active) return;
        setClassRecord(currentClass);
        setStudents(roster.data.map((item) => ({
          id: item.student_id,
          name: item.full_name,
          studentId: item.student_code,
          joinedAt: new Date(item.joined_at).toLocaleDateString('vi-VN'),
          department: item.department,
        })));
        setAssignments(classAssignments.data);
        setCancellationRequested(Boolean(cancellation.data));
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu lớp học.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [classId, classCode, router]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleCopyCode() {
    if (!effectiveCode) return;
    navigator.clipboard.writeText(effectiveCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function requestClassCancellation() {
    if (!classRecord || !window.confirm('Gửi yêu cầu hủy lớp này đến quản trị viên?')) return;
    setCancellationSubmitting(true);
    setErrorMessage('');
    try {
      await oralcheckFetch(`/api/classes/${classRecord.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setCancellationRequested(true);
      setNoticeMessage('Đã gửi yêu cầu hủy lớp đến quản trị viên.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi yêu cầu hủy lớp.');
    } finally {
      setCancellationSubmitting(false);
    }
  }

  async function deleteAssignment(assignment: AssignmentRecord) {
    if (!window.confirm(
      `Xóa bài tập "${assignment.title}"? Bài tập đã có bài nộp sẽ được lưu trữ để giữ lại kết quả.`,
    )) return;

    setDeletingAssignmentId(assignment.id);
    setErrorMessage('');
    setNoticeMessage('');
    try {
      const { data } = await oralcheckFetch<{ data: { archived: boolean } }>(
        `/api/assignments/${assignment.id}`,
        { method: 'DELETE' },
      );
      setAssignments((current) => current.filter((item) => item.id !== assignment.id));
      setNoticeMessage(
        data.archived
          ? 'Bài tập đã được lưu trữ để bảo toàn bài nộp và kết quả.'
          : 'Đã xóa bài tập.',
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa bài tập.');
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  async function removeStudent(student: StudentRosterItem) {
    if (!classRecord || !window.confirm(`Xóa ${student.name} khỏi lớp này? Tài khoản và lịch sử bài nộp của sinh viên sẽ được giữ nguyên.`)) return;

    setRemovingStudentId(student.id);
    setErrorMessage('');
    setNoticeMessage('');
    try {
      await oralcheckFetch(`/api/classes/${classRecord.id}/members`, {
        method: 'DELETE',
        body: JSON.stringify({ student_id: student.id }),
      });
      setStudents((current) => current.filter((item) => item.id !== student.id));
      setNoticeMessage(`Đã xóa ${student.name} khỏi lớp.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa sinh viên khỏi lớp.');
    } finally {
      setRemovingStudentId(null);
    }
  }

  const filteredStudents = students.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.includes(search)
    );
  const visibleAssignments = assignments.filter((item) => item.status !== 'archived');

  if (!loading && errorMessage && !classRecord) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c]">
        <TeacherSidebar
          currentPage="classes"
          signingOut={signingOut}
          onSignOut={handleSignOut}
          adminMode={adminMode}
        />
        <div className="md:ml-[255px]">
          <header className="flex min-h-[64px] items-center border-b border-[#e5e5e5] bg-white px-6 text-xs text-gray-500">
            <Link href="/teacher/classes" className="font-medium text-gray-700 hover:text-black">
              ← Quay lại danh sách lớp
            </Link>
          </header>
          <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
            <section role="alert" className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">Chưa thể vào lớp</span>
              <h1 className="mt-2 text-xl font-bold text-gray-900">Lớp học chưa sẵn sàng</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">{errorMessage}</p>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <TeacherSidebar
        currentPage="classes"
        signingOut={signingOut}
        onSignOut={handleSignOut}
        adminMode={adminMode}
      />

      <div className="md:ml-[255px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/teacher/classes" className="hover:text-black">
              Lớp học phụ trách
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">
              {classRecord?.class_name ?? effectiveCode}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {classRecord?.status === 'active' && (
              <Link
                href={`/teacher/assignments/create?classId=${classId ?? ''}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
              >
                <span>+</span>
                <span>Tạo bài tập mới</span>
              </Link>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="border-b border-gray-200 bg-white px-6 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-black px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {effectiveCode}
                  </span>
                  <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                    {classRecord?.status === 'active' ? 'Đang hoạt động' : classRecord?.status === 'pending' ? 'Chờ duyệt' : classRecord?.status === 'archived' ? 'Đã lưu trữ' : 'Lớp học'}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {classRecord?.class_name ?? 'Đang tải lớp học...'}
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                  {classRecord?.description || 'Chưa có mô tả lớp học.'}
                </p>
                {classRecord && (
                  <p className="mt-2 text-xs text-gray-600">
                    Người phụ trách lớp: <span className="font-semibold text-gray-800">{classRecord.lecturer_name || 'Chưa xác định'}</span>
                  </p>
                )}
              </div>

              {/* Class Code & Invite Action Box */}
              <div className="flex items-center gap-2 self-start rounded-2xl border border-indigo-200 bg-[#f8f9ff] p-3 md:self-center">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    MÃ LỚP THAM GIA (CLASS CODE)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-gray-900">{effectiveCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-indigo-900 shadow-xs border border-indigo-200 hover:bg-indigo-50 transition"
                    >
                      {copiedCode ? '✓ Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
                {classRecord?.status === 'active' && !adminMode && (
                  <button
                    type="button"
                    onClick={() => void requestClassCancellation()}
                    disabled={cancellationRequested || cancellationSubmitting}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancellationRequested ? 'Đã gửi yêu cầu hủy' : cancellationSubmitting ? 'Đang gửi...' : 'Yêu cầu hủy lớp'}
                  </button>
                )}
              </div>
            </div>

            {/* Bento Metrics Cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">Sĩ số lớp</span>
                <div className="mt-1 text-2xl font-black text-gray-900">{students.length}</div>
                <span className="text-[11px] text-gray-600 font-medium">Sinh viên đã tham gia</span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">Bài tập</span>
                <div className="mt-1 text-2xl font-black text-emerald-950">{visibleAssignments.length}</div>
                <span className="text-[11px] text-emerald-700 font-medium">Tổng số bài tập</span>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase">Đã xuất bản</span>
                <div className="mt-1 text-2xl font-black text-indigo-950">{visibleAssignments.filter((item) => item.status === 'published').length}</div>
                <span className="text-[11px] text-indigo-700 font-medium">Bài tập sinh viên có thể xem</span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <span className="text-[11px] font-semibold text-amber-800 uppercase">Bản nháp</span>
                <div className="mt-1 text-2xl font-black text-amber-950">{visibleAssignments.filter((item) => item.status === 'draft').length}</div>
                <span className="text-[11px] text-amber-700 font-medium">Bản nháp chưa công bố</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex border-b border-gray-200 gap-6 text-xs font-bold">
              <button
                onClick={() => setActiveTab('roster')}
                className={`pb-3 transition ${
                  activeTab === 'roster'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Danh sách Sinh viên ({students.length})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`pb-3 transition ${
                  activeTab === 'assignments'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Bài tập ({visibleAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab('spectrogram')}
                className={`pb-3 transition ${
                  activeTab === 'spectrogram'
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Phổ âm học &amp; Biểu đồ lớp
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p role="alert" className="mx-auto mt-5 max-w-7xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
        )}
        {noticeMessage && (
          <p role="status" className="mx-auto mt-5 max-w-7xl rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{noticeMessage}</p>
        )}
        {loading && <p className="mx-auto mt-5 max-w-7xl text-sm text-gray-500">Đang tải dữ liệu lớp học...</p>}

        {/* Tab 1: Student Roster Content */}
        {activeTab === 'roster' && (
          <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo MSSV hoặc họ tên..."
                  className="w-full rounded-full border border-gray-300 bg-white py-1.5 pl-4 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-600">
                      <th className="py-3 pl-6 pr-4">Sinh viên &amp; MSSV</th>
                      <th className="py-3 px-4">Khoa / Bộ môn</th>
                      <th className="py-3 px-4">Ngày tham gia</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!loading && filteredStudents.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-gray-500">Chưa có sinh viên tham gia lớp.</td></tr>
                    )}
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                              {student.name.split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() ?? '?'}
                            </span>
                            <div>
                              <span className="font-bold text-gray-900 block">{student.name}</span>
                              <span className="font-mono text-[11px] text-gray-500">
                                MSSV: {student.studentId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-gray-600">{student.department || '—'}</td>
                        <td className="py-3.5 px-4 text-gray-600">{student.joinedAt}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => void removeStudent(student)}
                            disabled={removingStudentId === student.id}
                            className="rounded-full border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {removingStudentId === student.id ? 'Đang xóa...' : 'Xóa khỏi lớp'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* Tab 2: Assignments */}
        {activeTab === 'assignments' && (
          <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
            {classRecord?.status === 'active' && (
              <div className="mb-4 flex justify-end">
                <Link href={`/teacher/assignments/create?classId=${classId ?? ''}`} className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                  Tạo bài tập mới
                </Link>
              </div>
            )}
            <div className="space-y-3">
              {!loading && visibleAssignments.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">Lớp này chưa có bài tập.</p>
              )}
              {visibleAssignments.map((assignment) => (
                <article key={assignment.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{assignment.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {assignment.ends_at ? `Hạn nộp: ${new Date(assignment.ends_at).toLocaleString('vi-VN')}` : 'Không đặt hạn nộp'}
                      </p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      {assignment.status === 'published' ? 'Đã công bố' : assignment.status === 'draft' ? 'Bản nháp' : assignment.status}
                    </span>
                  </div>
                  {assignment.status === 'draft' && (
                    <Link
                      href={`/teacher/assignments/create?classId=${classRecord?.id ?? ''}&assignmentId=${assignment.id}`}
                      className="mt-4 inline-flex rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Tiếp tục soạn bản nháp
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void deleteAssignment(assignment)}
                    disabled={deletingAssignmentId === assignment.id}
                    className="mt-4 inline-flex rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingAssignmentId === assignment.id ? 'Đang xử lý...' : 'Xóa bài tập'}
                  </button>
                </article>
              ))}
            </div>
          </main>
        )}

        {/* Tab 3: Spectrogram */}
        {activeTab === 'spectrogram' && (
          <main className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
              <h3 className="text-base font-bold text-gray-900">Phân tích âm thanh</h3>
              <p className="mt-1 text-xs text-gray-500">Tính năng ghi âm và AI chưa được bật.</p>
            </div>
          </main>
        )}
      </div>

    </div>
  );
}
