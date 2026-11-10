'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/TeacherSidebar';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile } from '@/lib/profile-cache';

interface ClassOption {
  id: string;
  class_name: string;
  class_code: string;
  status: 'pending' | 'active' | 'rejected';
}

interface QuestionDraft {
  id: number;
  content: string;
  referenceAnswer: string;
  timeLimitSeconds: number;
  maxScore: number;
  rubricText: string;
  expanded: boolean;
}

interface AssignmentPayload {
  title: string;
  instructions: string;
  ends_at: string | null;
  questions: Array<{
    content: string;
    reference_answer: string;
    position: number;
    max_score: number;
    time_limit_seconds: number;
    rubric: Array<{ criterion_text: string; max_points: number; position: number }>;
  }>;
}

const initialQuestion = (): QuestionDraft => ({
  id: 1,
  content: '',
  referenceAnswer: '',
  timeLimitSeconds: 120,
  maxScore: 10,
  rubricText: '',
  expanded: true,
});

function formatLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function TeacherQuestionBuilder() {
  const router = useRouter();
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([initialQuestion()]);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [published, setPublished] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadClasses() {
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
        const isAdmin = profile.role === 'admin';
        if (active) setAdminMode(isAdmin);

        const { data } = await oralcheckFetch<{ data: ClassOption[] }>('/api/classes');
        if (!active) return;
        const available = data.filter((item) => item.status === 'active');
        setClasses(available);
        const searchParams = new URLSearchParams(window.location.search);
        const requestedClassId = searchParams.get('classId');
        const requestedAssignmentId = searchParams.get('assignmentId');
        if (requestedAssignmentId) {
          const { data: assignment } = await oralcheckFetch<{
            data: {
              id: string;
              class_id: string;
              title: string;
              instructions: string | null;
              ends_at: string | null;
              status: string;
              questions: Array<{
                content: string;
                reference_answer?: string;
                max_score: number;
                time_limit_seconds: number;
                rubric?: Array<{ criterion_text: string }>;
              }>;
            };
          }>(`/api/assignments/${requestedAssignmentId}`);
          if (!active) return;
          if (assignment.status !== 'draft') {
            throw new Error('Chỉ có thể tiếp tục chỉnh sửa bài tập đang ở trạng thái bản nháp.');
          }
          setAssignmentId(assignment.id);
          setAssignmentTitle(assignment.title);
          setInstructions(assignment.instructions ?? '');
          setDeadline(formatLocalDateTime(assignment.ends_at));
          setSelectedClassId(assignment.class_id);
          setQuestions(assignment.questions.map((question, index) => ({
            id: index + 1,
            content: question.content,
            referenceAnswer: question.reference_answer ?? '',
            timeLimitSeconds: question.time_limit_seconds,
            maxScore: question.max_score,
            rubricText: question.rubric?.map((criterion) => criterion.criterion_text).join('\n') ?? '',
            expanded: index === 0,
          })));
          return;
        }
        setSelectedClassId(
          available.find((item) => item.id === requestedClassId)?.id ?? available[0]?.id ?? '',
        );
        if (available.length === 0) {
          setErrorMessage(isAdmin
            ? 'Chưa có lớp đang hoạt động để tạo bài tập.'
            : 'Bạn chưa có lớp đang hoạt động. Hãy tạo lớp và chờ quản trị viên duyệt trước.');
        }
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải lớp học.');
      }
    }
    void loadClasses();
    return () => { active = false; };
  }, [router]);

  const totalPoints = questions.reduce((total, question) => total + (Number(question.maxScore) || 0), 0);
  const totalSeconds = questions.reduce((total, question) => total + question.timeLimitSeconds, 0);
  const pointsValid = Math.abs(totalPoints - 10) < 0.01;

  function updateQuestion(id: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((question) =>
      question.id === id ? { ...question, ...patch } : question,
    ));
  }

  function addQuestion() {
    const remaining = Math.max(0, Number((10 - totalPoints).toFixed(1)));
    const id = Math.max(0, ...questions.map((question) => question.id)) + 1;
    setQuestions((current) => [
      ...current.map((question) => ({ ...question, expanded: false })),
      { ...initialQuestion(), id, maxScore: remaining || 1 },
    ]);
  }

  function removeQuestion(id: number) {
    if (questions.length === 1) {
      setErrorMessage('Bài tập cần có ít nhất một câu hỏi.');
      return;
    }
    setErrorMessage('');
    setQuestions((current) => current.filter((question) => question.id !== id));
  }

  function makePayload(): AssignmentPayload | null {
    if (!selectedClassId) {
      setErrorMessage('Hãy chọn một lớp đang hoạt động.');
      return null;
    }
    if (!assignmentTitle.trim()) {
      setErrorMessage('Hãy nhập tên bài tập.');
      return null;
    }
    if (questions.some((question) => !question.content.trim())) {
      setErrorMessage('Hãy nhập nội dung cho tất cả câu hỏi.');
      return null;
    }
    if (questions.some((question) => question.rubricText.trim().length > 500)) {
      setErrorMessage('Mỗi phần tiêu chí chấm tối đa 500 ký tự.');
      return null;
    }
    if (questions.some((question) => !Number.isFinite(question.maxScore) || question.maxScore <= 0)) {
      setErrorMessage('Điểm tối đa của mỗi câu phải lớn hơn 0.');
      return null;
    }
    if (questions.some((question) =>
      !Number.isInteger(question.timeLimitSeconds)
      || question.timeLimitSeconds < 1
      || question.timeLimitSeconds > 7200,
    )) {
      setErrorMessage('Thời lượng mỗi câu phải là số nguyên từ 1 đến 7200 giây.');
      return null;
    }
    if (!pointsValid) {
      setErrorMessage(`Tổng điểm câu hỏi phải bằng 10. Hiện tại: ${totalPoints.toFixed(1)} điểm.`);
      return null;
    }
    setErrorMessage('');
    return {
      title: assignmentTitle.trim(),
      instructions: instructions.trim(),
      ends_at: deadline ? new Date(deadline).toISOString() : null,
      questions: questions.map((question, index) => ({
        content: question.content.trim(),
        reference_answer: question.referenceAnswer.trim(),
        position: index + 1,
        max_score: Number(question.maxScore),
        time_limit_seconds: question.timeLimitSeconds,
        rubric: question.rubricText.trim()
          ? [{ criterion_text: question.rubricText.trim(), max_points: Number(question.maxScore), position: 1 }]
          : [],
      })),
    };
  }

  async function saveDraft(): Promise<string | null> {
    const payload = makePayload();
    if (!payload) return null;
    setSaving(true);
    setSuccessMessage('');
    try {
      if (assignmentId) {
        await oralcheckFetch(`/api/assignments/${assignmentId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMessage('Đã cập nhật bản nháp.');
        return assignmentId;
      }
      const { data } = await oralcheckFetch<{ data: { id: string } }>(
        `/api/classes/${selectedClassId}/assignments`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      setAssignmentId(data.id);
      setSuccessMessage('Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa trước khi công bố.');
      return data.id;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu bài tập.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishAssignment() {
    const id = await saveDraft();
    if (!id) return;
    setSaving(true);
    setSuccessMessage('');
    try {
      await oralcheckFetch(`/api/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
      });
      setPublished(true);
      setSuccessMessage('Đã công bố bài tập. Sinh viên trong lớp có thể xem đề.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể công bố bài tập.');
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <TeacherSidebar currentPage="builder" signingOut={signingOut} onSignOut={handleSignOut} adminMode={adminMode} />
      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/teacher/classes" className="hover:text-black">Lớp học phụ trách</Link>
            <span>/</span>
            <span className="font-semibold text-black">Soạn bài tập</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving || published}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : assignmentId ? 'Cập nhật bản nháp' : 'Lưu nháp'}
            </button>
            <button
              type="button"
              onClick={() => void publishAssignment()}
              disabled={saving || published}
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {published ? 'Đã công bố' : saving ? 'Đang xử lý...' : 'Công bố bài tập'}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="border-b border-gray-200 pb-5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Bài tập của lớp</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Soạn bài tập mới</h1>
            <p className="mt-1 text-xs text-gray-500">Tạo nội dung, câu hỏi, đáp án tham khảo và hạn nộp cho lớp.</p>
          </div>

          {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMessage}</p>}
          {successMessage && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{successMessage}</p>}

          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-gray-900">Thông tin bài tập</h2>
                  {assignmentId && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] text-gray-600">Bản nháp đã lưu</span>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="assignment-class" className="block text-xs font-semibold text-gray-700">Lớp học *</label>
                  <select
                    id="assignment-class"
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    disabled={Boolean(assignmentId) || published}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100"
                  >
                    <option value="">Chọn lớp đang hoạt động</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.class_name} ({item.class_code})</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="assignment-title" className="block text-xs font-semibold text-gray-700">Tên bài tập *</label>
                  <input
                    id="assignment-title"
                    value={assignmentTitle}
                    maxLength={200}
                    onChange={(event) => setAssignmentTitle(event.target.value)}
                    disabled={published}
                    placeholder="Ví dụ: Bài tập chương 1"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="assignment-instructions" className="block text-xs font-semibold text-gray-700">Hướng dẫn chung (không bắt buộc)</label>
                  <textarea
                    id="assignment-instructions"
                    value={instructions}
                    maxLength={10000}
                    rows={3}
                    onChange={(event) => setInstructions(event.target.value)}
                    disabled={published}
                    placeholder="Nhập hướng dẫn dành cho sinh viên..."
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="assignment-deadline" className="block text-xs font-semibold text-gray-700">Hạn nộp (không bắt buộc)</label>
                  <input
                    id="assignment-deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    disabled={published}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-gray-900">Danh sách câu hỏi</h2>
                  <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${pointsValid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                    Tổng điểm: {totalPoints.toFixed(1)} / 10
                  </span>
                </div>
                {questions.map((question, index) => (
                  <article key={question.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white p-4">
                      <button
                        type="button"
                        aria-expanded={question.expanded}
                        onClick={() => updateQuestion(question.id, { expanded: !question.expanded })}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-bold">{String(index + 1).padStart(2, '0')}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-gray-900">Câu {index + 1}</span>
                          <span className="block text-[10px] text-gray-500">{question.maxScore} điểm · {question.timeLimitSeconds} giây dự kiến</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        disabled={published}
                        aria-label={`Xóa câu ${index + 1}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      >
                        Xóa
                      </button>
                    </div>
                    {question.expanded && (
                      <div className="space-y-4 p-4 sm:p-5">
                        <div className="space-y-1.5">
                          <label htmlFor={`question-content-${question.id}`} className="block text-xs font-semibold text-gray-700">Nội dung câu hỏi *</label>
                          <textarea
                            id={`question-content-${question.id}`}
                            value={question.content}
                            maxLength={10000}
                            rows={4}
                            onChange={(event) => updateQuestion(question.id, { content: event.target.value })}
                            disabled={published}
                            placeholder="Nhập câu hỏi mà sinh viên cần trả lời..."
                            className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100"
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label htmlFor={`question-points-${question.id}`} className="block text-xs font-semibold text-gray-700">Điểm tối đa</label>
                            <input
                              id={`question-points-${question.id}`}
                              type="number"
                              min="0.5"
                              max="10"
                              step="0.5"
                              value={question.maxScore}
                              onChange={(event) => updateQuestion(question.id, { maxScore: Number(event.target.value) })}
                              disabled={published}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor={`question-time-${question.id}`} className="block text-xs font-semibold text-gray-700">Thời lượng dự kiến (giây)</label>
                            <input
                              id={`question-time-${question.id}`}
                              type="number"
                              min="1"
                              max="7200"
                              step="1"
                              value={question.timeLimitSeconds}
                              onChange={(event) => updateQuestion(question.id, { timeLimitSeconds: Number(event.target.value) })}
                              disabled={published}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor={`question-answer-${question.id}`} className="block text-xs font-semibold text-gray-700">Đáp án tham khảo (không bắt buộc, chỉ giảng viên xem)</label>
                          <textarea
                            id={`question-answer-${question.id}`}
                            value={question.referenceAnswer}
                            maxLength={10000}
                            rows={3}
                            onChange={(event) => updateQuestion(question.id, { referenceAnswer: event.target.value })}
                            disabled={published}
                            className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor={`question-rubric-${question.id}`} className="block text-xs font-semibold text-gray-700">Tiêu chí chấm (không bắt buộc, tối đa 500 ký tự)</label>
                          <textarea
                            id={`question-rubric-${question.id}`}
                            value={question.rubricText}
                            maxLength={500}
                            rows={3}
                            onChange={(event) => updateQuestion(question.id, { rubricText: event.target.value })}
                            disabled={published}
                            className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                <button
                  type="button"
                  onClick={addQuestion}
                  disabled={published}
                  className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white py-3.5 text-xs font-semibold text-gray-700 hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  + Thêm câu hỏi
                </button>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Tóm tắt bài tập</h2>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Lớp</dt><dd className="text-right font-medium text-gray-900">{classes.find((item) => item.id === selectedClassId)?.class_name ?? 'Chưa chọn'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Số câu hỏi</dt><dd className="font-medium text-gray-900">{questions.length}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Thời lượng dự kiến</dt><dd className="font-medium text-gray-900">{Math.floor(totalSeconds / 60)} phút {String(totalSeconds % 60).padStart(2, '0')} giây</dd></div>
                  <div className="flex justify-between gap-3 border-t border-gray-100 pt-3"><dt className="text-gray-500">Tổng điểm</dt><dd className={`font-semibold ${pointsValid ? 'text-emerald-700' : 'text-red-700'}`}>{totalPoints.toFixed(1)} / 10 điểm</dd></div>
                </dl>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full transition-all ${pointsValid ? 'bg-emerald-500' : 'bg-black'}`} style={{ width: `${Math.min(100, Math.max(0, totalPoints / 10 * 100))}%` }} />
                </div>
                {!pointsValid && <p className="mt-3 text-[11px] leading-relaxed text-gray-500">Điều chỉnh điểm các câu để tổng đạt 10 điểm trước khi lưu.</p>}
              </section>
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                <h2 className="font-semibold">Phần chưa bật</h2>
                <p className="mt-1">Sinh viên xem được đề sau khi công bố. Nộp bài ghi âm, camera và chấm điểm AI hiện chưa hoạt động.</p>
              </section>
            </aside>
          </div>

          {published && assignmentId && (
            <div role="dialog" aria-modal="true" aria-labelledby="published-title" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
              <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h2 id="published-title" className="text-lg font-bold text-gray-900">Đã công bố bài tập</h2>
                <p className="mt-2 text-sm text-gray-600">Sinh viên thuộc lớp đã chọn có thể xem đề bài và hạn nộp.</p>
                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => router.push(`/teacher/classes/${selectedClassId}`)} className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">Về lớp học</button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
