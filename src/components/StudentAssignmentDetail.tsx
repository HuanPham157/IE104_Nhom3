'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StudentPageShell from '@/components/StudentPageShell';
import { oralcheckFetch } from '@/lib/oralcheck-client';

interface AssignmentQuestion {
  id: string;
  content: string;
  position: number;
  max_score: number;
  time_limit_seconds: number;
}

interface AssignmentDetail {
  id: string;
  class_id: string;
  title: string;
  instructions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'published' | 'closed' | 'archived';
  questions: AssignmentQuestion[];
}

function formatDate(value: string | null) {
  if (!value) return 'Không giới hạn';
  return new Date(value).toLocaleString('vi-VN');
}

export default function StudentAssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data } = await oralcheckFetch<{ data: AssignmentDetail }>(
          `/api/assignments/${assignmentId}`,
        );
        if (active) setAssignment(data);
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải nội dung bài tập.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [assignmentId]);

  return (
    <StudentPageShell currentPage="classes" breadcrumb={assignment?.title ?? 'Đề bài'}>
      <div className="mx-auto max-w-4xl">
        <Link href="/student/classes" className="text-sm font-medium text-gray-600 hover:text-black">
          ← Quay lại lớp học
        </Link>

        {loading && <p className="mt-6 text-sm text-gray-500">Đang tải đề bài...</p>}
        {errorMessage && (
          <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && assignment && (
          <>
            <header className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {assignment.status === 'published' ? 'Đã công bố' : 'Đã đóng'}
              </span>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">{assignment.title}</h1>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Bắt đầu</dt>
                  <dd className="mt-1 font-medium text-gray-800">{formatDate(assignment.starts_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Hạn nộp</dt>
                  <dd className="mt-1 font-medium text-gray-800">{formatDate(assignment.ends_at)}</dd>
                </div>
              </dl>
              {assignment.instructions && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <h2 className="text-sm font-semibold text-gray-900">Hướng dẫn</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{assignment.instructions}</p>
                </div>
              )}
            </header>

            <section className="mt-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Nội dung câu hỏi</h2>
                  <p className="mt-1 text-sm text-gray-500">Đáp án tham khảo và rubric của giảng viên không hiển thị.</p>
                </div>
                <span className="text-xs font-medium text-gray-500">{assignment.questions.length} câu hỏi</span>
              </div>

              <ol className="mt-4 space-y-3">
                {assignment.questions.map((question) => (
                  <li key={question.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">Câu {question.position}</h3>
                      <span className="text-xs text-gray-500">
                        {question.max_score} điểm · {Math.ceil(question.time_limit_seconds / 60)} phút
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{question.content}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Tính năng nộp bài đang được hoàn thiện.</p>
                <p className="mt-1 text-xs leading-5">
                  Hiện tại sinh viên có thể xem đề bài và hạn nộp. Ghi âm, camera, giọng nói và AI chưa được bật.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </StudentPageShell>
  );
}
