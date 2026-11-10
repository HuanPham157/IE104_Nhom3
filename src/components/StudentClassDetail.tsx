'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudentPageShell from '@/components/StudentPageShell';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile } from '@/lib/profile-cache';
import { oralcheckFetch } from '@/lib/oralcheck-client';

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

function formatDate(value: string | null) {
  if (!value) return 'Không có hạn nộp';
  return new Date(value).toLocaleString('vi-VN');
}

export default function StudentClassDetail({ classId }: { classId: string }) {
  const router = useRouter();
  const [classInfo, setClassInfo] = useState<ClassRecord | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

        const profile = await getCachedProfile(user.id);
        if (profile.role !== 'student') {
          router.replace(profile.role === 'teacher' ? '/teacher' : '/login');
          return;
        }

        const [{ data: classes }, { data: classAssignments }] = await Promise.all([
          oralcheckFetch<{ data: ClassRecord[] }>('/api/classes'),
          oralcheckFetch<{ data: AssignmentRecord[] }>(`/api/classes/${classId}/assignments`),
        ]);
        const currentClass = classes.find((item) => item.id === classId);
        if (!currentClass) throw new Error('Không tìm thấy lớp học hoặc bạn chưa tham gia lớp.');
        if (!active) return;

        setClassInfo(currentClass);
        setAssignments(classAssignments.filter((item) => item.status !== 'draft'));
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải thông tin lớp học.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [classId, router]);

  return (
    <StudentPageShell currentPage="classes" breadcrumb={classInfo?.class_name ?? 'Chi tiết lớp'}>
      <div className="mx-auto max-w-5xl">
        <Link href="/student/classes" className="text-sm font-medium text-gray-600 hover:text-black">
          ← Quay lại danh sách lớp
        </Link>

        {loading && <p className="mt-6 text-sm text-gray-500">Đang tải thông tin lớp học...</p>}
        {errorMessage && (
          <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && classInfo && (
          <>
            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <span className="rounded-md bg-black px-2.5 py-1 font-mono text-xs font-bold text-white">
                {classInfo.class_code}
              </span>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">{classInfo.class_name}</h1>
              <p className="mt-2 text-sm text-gray-600">
                {classInfo.status === 'active' ? 'Lớp đang hoạt động' : 'Trạng thái lớp: ' + classInfo.status}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Giảng viên phụ trách: {classInfo.lecturer_name ?? 'Chưa cập nhật'}
              </p>
              {classInfo.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">{classInfo.description}</p>
              )}
            </section>

            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Bài tập đã công bố</h2>
                  <p className="mt-1 text-sm text-gray-500">Các bài tập nháp của giảng viên không hiển thị tại đây.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {assignments.length} bài tập
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {assignments.map((assignment) => (
                  <article key={assignment.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Hạn nộp: {formatDate(assignment.ends_at)}
                          {assignment.starts_at && ` · Mở từ ${formatDate(assignment.starts_at)}`}
                        </p>
                      </div>
                      <Link
                        href={`/student/assignments/${assignment.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Xem đề bài →
                      </Link>
                    </div>
                  </article>
                ))}

                {assignments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-gray-700">Chưa có bài tập nào được công bố.</p>
                    <p className="mt-1 text-xs text-gray-500">Bài tập sẽ xuất hiện tại đây sau khi giảng viên đăng.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </StudentPageShell>
  );
}
