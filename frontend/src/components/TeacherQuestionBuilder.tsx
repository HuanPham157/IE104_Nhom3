'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/TeacherSidebar';
import ScheduleSection from '@/components/assignment-builder/ScheduleSection';
import GradingGuideSection from '@/components/assignment-builder/GradingGuideSection';
import QuickImportPanel from '@/components/assignment-builder/QuickImportPanel';
import QuestionEditor from '@/components/assignment-builder/QuestionEditor';
import { oralcheckFetch } from '@/lib/oralcheck-client';
import { supabase } from '@/services/supabase/client';
import { getCachedProfile } from '@/lib/profile-cache';
import type { ParsedQuestion } from '@/lib/exam-text';
import { parseGradingGuide } from '@/lib/exam-text';
import type { CheckItem, QuestionDraft } from '@/lib/assignment-builder';
import {
  TOTAL_POINTS, buildChecklist, computeEnd, defaultStartInput, formatDuration, fromLocalInput,
  guideStatusByQuestion, secondsPerQuestion, toLocalInput, totalScore, withEvenScores,
} from '@/lib/assignment-builder';

interface ClassOption {
  id: string;
  class_name: string;
  class_code: string;
  status: 'pending' | 'active' | 'rejected';
}

type LoadedAssignment = {
  id: string;
  class_id: string;
  title: string;
  instructions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes?: number | null;
  grading_guide?: string | null;
  status: string;
  questions: Array<{
    content: string;
    reference_answer?: string;
    max_score: number;
    time_limit_seconds: number;
    rubric?: Array<{ criterion_text: string; max_points: number }>;
  }>;
};

const MAX_QUESTIONS = 40;
/** Thời điểm hiện tại (ms) — tách khỏi component để gọi trong handler. */
const currentTimeMs = () => Date.now();
/** Lỗi cho phép vẫn lưu nháp (chỉ chặn khi công bố). */
const PUBLISH_ONLY_CHECKS = new Set(['start', 'future']);

let questionKeySeed = 0;
const newQuestion = (patch: Partial<QuestionDraft> = {}): QuestionDraft => {
  questionKeySeed += 1;
  return { key: questionKeySeed, content: '', referenceAnswer: '', maxScore: TOTAL_POINTS, expanded: true, ...patch };
};

/** Bài nháp cũ chưa có barem chung: dựng lại barem từ tiêu chí từng câu. */
function guideFromLegacyRubric(questions: LoadedAssignment['questions']) {
  return questions
    .map((question, index) => question.rubric?.length
      ? [`Câu ${index + 1} (${question.max_score} điểm)`, ...question.rubric.map((criterion) => `- ${criterion.criterion_text.replace(/\n+/g, ' ')}: ${criterion.max_points}`)].join('\n')
      : '')
    .filter(Boolean)
    .join('\n\n');
}

export default function TeacherQuestionBuilder() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [schedule, setSchedule] = useState(() => ({ startInput: defaultStartInput(), durationInput: '15', autoEnd: true, endInput: '' }));
  const [gradingGuide, setGradingGuide] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => [newQuestion()]);
  const [pointsMode, setPointsMode] = useState<'auto' | 'manual'>('auto');
  const [showImport, setShowImport] = useState(false);
  const [now] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) { router.replace('/login'); return; }
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
        const requestedAssignmentId = searchParams.get('assignmentId');

        if (requestedAssignmentId) {
          const { data: assignment } = await oralcheckFetch<{ data: LoadedAssignment }>(`/api/assignments/${requestedAssignmentId}`);
          if (!active) return;
          if (assignment.status !== 'draft') throw new Error('Chỉ có thể tiếp tục chỉnh sửa bài tập đang ở trạng thái bản nháp.');
          const duration = assignment.duration_minutes
            ?? Math.max(1, Math.ceil(assignment.questions.reduce((sum, question) => sum + question.time_limit_seconds, 0) / 60));
          const autoEnd = Boolean(assignment.starts_at && assignment.ends_at
            && Math.abs(new Date(assignment.ends_at).getTime() - new Date(assignment.starts_at).getTime() - duration * 60_000) < 60_000);
          setAssignmentId(assignment.id);
          setSelectedClassId(assignment.class_id);
          setAssignmentTitle(assignment.title);
          setInstructions(assignment.instructions ?? '');
          setSchedule({ startInput: toLocalInput(assignment.starts_at), durationInput: String(duration), autoEnd, endInput: autoEnd ? '' : toLocalInput(assignment.ends_at) });
          setGradingGuide(assignment.grading_guide ?? guideFromLegacyRubric(assignment.questions));
          setQuestions(assignment.questions.map((question, index) => newQuestion({
            content: question.content,
            referenceAnswer: question.reference_answer ?? '',
            maxScore: Number(question.max_score),
            expanded: index === 0,
          })));
          setPointsMode('manual');
          return;
        }
        setSelectedClassId(available.find((item) => item.id === searchParams.get('classId'))?.id ?? available[0]?.id ?? '');
        if (available.length === 0) {
          setErrorMessage(isAdmin ? 'Chưa có lớp đang hoạt động để tạo bài tập.' : 'Bạn chưa có lớp đang hoạt động. Hãy tạo lớp và chờ quản trị viên duyệt trước.');
        }
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu.');
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  // ----- Giá trị dẫn xuất -----
  const durationMinutes = Number(schedule.durationInput);
  const perQuestionSeconds = secondsPerQuestion(durationMinutes, questions.length);
  const start = fromLocalInput(schedule.startInput);
  const end = computeEnd(schedule.startInput, durationMinutes, schedule.autoEnd, schedule.endInput);
  const guide = useMemo(() => parseGradingGuide(gradingGuide), [gradingGuide]);
  const guideStatus = guideStatusByQuestion(guide, questions);
  const total = totalScore(questions);
  const checklist = buildChecklist({
    classSelected: Boolean(selectedClassId), title: assignmentTitle, questions, durationMinutes, start, end, guide, guideStatus, now,
  });
  const failing = (items: CheckItem[], forPublish: boolean) =>
    items.filter((item) => !item.ok && item.level === 'error' && (forPublish || !PUBLISH_ONLY_CHECKS.has(item.id)));

  // ----- Câu hỏi & điểm -----
  function applyQuestions(next: QuestionDraft[], mode = pointsMode) {
    setQuestions(mode === 'auto' ? withEvenScores(next) : next);
  }
  function patchQuestion(key: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((question) => question.key === key ? { ...question, ...patch } : question));
  }
  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) { setErrorMessage(`Mỗi bài tối đa ${MAX_QUESTIONS} câu hỏi.`); return; }
    const remaining = Math.max(0, Number((TOTAL_POINTS - total).toFixed(2)));
    applyQuestions([...questions.map((question) => ({ ...question, expanded: false })), newQuestion({ maxScore: remaining })]);
  }
  function removeQuestion(key: number) {
    if (questions.length === 1) return;
    applyQuestions(questions.filter((question) => question.key !== key));
  }
  function moveQuestion(key: number, direction: -1 | 1) {
    const index = questions.findIndex((question) => question.key === key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    setQuestions(next);
  }
  function splitEvenly() {
    setPointsMode('auto');
    setQuestions(withEvenScores(questions));
  }
  function setScore(key: number, score: number) {
    setPointsMode('manual');
    patchQuestion(key, { maxScore: score });
  }
  function applyGuidePoints(points: number[]) {
    setPointsMode('manual');
    setQuestions((current) => current.map((question, index) => ({ ...question, maxScore: points[index] ?? question.maxScore })));
  }
  function importQuestions(parsed: ParsedQuestion[], mode: 'replace' | 'append') {
    const kept = mode === 'append' ? questions.filter((question) => question.content.trim()) : [];
    const imported = parsed.map((item) => newQuestion({ content: item.content, referenceAnswer: item.referenceAnswer, maxScore: item.points ?? 0, expanded: false }));
    const next = [...kept, ...imported].slice(0, MAX_QUESTIONS);
    if (next.length) next[0] = { ...next[0], expanded: true };
    // Dùng điểm ghi trong đề nếu mọi câu đều có và tổng đúng 10; ngược lại chia đều.
    const useFileScores = mode === 'replace' && parsed.every((item) => item.points) && Math.abs(totalScore(next) - TOTAL_POINTS) < 0.01;
    const nextMode = useFileScores ? 'manual' : 'auto';
    setPointsMode(nextMode);
    applyQuestions(next, nextMode);
    setShowImport(false);
    setErrorMessage('');
    setSuccessMessage(`Đã nhập ${imported.length} câu hỏi${useFileScores ? ' kèm điểm từ đề' : ', điểm được chia đều'}.`);
  }

  // ----- Lưu / công bố -----
  function makePayload(forPublish: boolean) {
    const blockers = failing(checklist, forPublish);
    if (forPublish && end && end.getTime() <= currentTimeMs()) {
      setErrorMessage('Hạn chót đã trôi qua, hãy chỉnh lại thời gian.');
      return null;
    }
    if (blockers.length) {
      setErrorMessage(`Chưa thể ${forPublish ? 'công bố' : 'lưu'}: ${blockers.map((item) => item.label.toLowerCase() + (item.detail ? ` (${item.detail})` : '')).join('; ')}.`);
      return null;
    }
    setErrorMessage('');
    return {
      title: assignmentTitle.trim(),
      instructions: instructions.trim(),
      starts_at: start ? start.toISOString() : null,
      ends_at: end ? end.toISOString() : null,
      duration_minutes: durationMinutes,
      grading_guide: gradingGuide.trim(),
      questions: questions.map((question, index) => ({
        content: question.content.trim(),
        reference_answer: question.referenceAnswer.trim(),
        position: index + 1,
        max_score: Number(question.maxScore),
        time_limit_seconds: perQuestionSeconds,
        rubric: (guide.questions.find((block) => block.position === index + 1)?.criteria ?? []).map((criterion, criterionIndex) => ({
          criterion_text: criterion.text, max_points: criterion.points, position: criterionIndex + 1,
        })),
      })),
    };
  }

  async function saveDraft(forPublish = false): Promise<string | null> {
    const payload = makePayload(forPublish);
    if (!payload) return null;
    setSaving(true);
    setSuccessMessage('');
    try {
      if (assignmentId) {
        const result = await oralcheckFetch<{ warning?: string }>(`/api/assignments/${assignmentId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSuccessMessage(result.warning ?? 'Đã cập nhật bản nháp.');
        return assignmentId;
      }
      const { data, warning } = await oralcheckFetch<{ data: { id: string }; warning?: string }>(
        `/api/classes/${selectedClassId}/assignments`, { method: 'POST', body: JSON.stringify(payload) },
      );
      setAssignmentId(data.id);
      setSuccessMessage(warning ?? 'Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa trước khi công bố.');
      return data.id;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu bài tập.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishAssignment() {
    const id = await saveDraft(true);
    if (!id) return;
    setSaving(true);
    try {
      await oralcheckFetch(`/api/assignments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) });
      setPublished(true);
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

  const pointsValid = Math.abs(total - TOTAL_POINTS) < 0.01;
  const publishBlockers = failing(checklist, true);
  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100';

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
            <button type="button" onClick={() => void saveDraft()} disabled={saving || published} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
              {saving ? 'Đang lưu...' : assignmentId ? 'Cập nhật bản nháp' : 'Lưu nháp'}
            </button>
            <button type="button" onClick={() => void publishAssignment()} disabled={saving || published} className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
              {published ? 'Đã công bố' : saving ? 'Đang xử lý...' : 'Công bố bài tập'}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="border-b border-gray-200 pb-5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Bài tập của lớp</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{assignmentId ? 'Chỉnh sửa bản nháp' : 'Soạn bài tập mới'}</h1>
            <p className="mt-1 text-xs text-gray-500">Đặt lịch làm bài, nhập đề (gõ tay hoặc từ file), viết barem chấm, rồi công bố cho lớp.</p>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="assignment-class" className="block text-xs font-semibold text-gray-700">Lớp học *</label>
                    <select id="assignment-class" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} disabled={Boolean(assignmentId) || published} className={inputClass}>
                      <option value="">Chọn lớp đang hoạt động</option>
                      {classes.map((item) => <option key={item.id} value={item.id}>{item.class_name} ({item.class_code})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="assignment-title" className="block text-xs font-semibold text-gray-700">Tên bài tập *</label>
                    <input id="assignment-title" value={assignmentTitle} maxLength={200} onChange={(event) => setAssignmentTitle(event.target.value)} disabled={published} placeholder="Ví dụ: Kiểm tra vấn đáp chương 1" className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="assignment-instructions" className="block text-xs font-semibold text-gray-700">Hướng dẫn cho sinh viên</label>
                  <textarea id="assignment-instructions" value={instructions} maxLength={10000} rows={3} onChange={(event) => setInstructions(event.target.value)} disabled={published} placeholder="Ví dụ: Trả lời rõ ràng, nêu đủ ý chính; có thể ghi âm lại tối đa 5 lần mỗi câu." className={`${inputClass} leading-relaxed`} />
                </div>
              </section>

              <ScheduleSection
                {...schedule}
                computedEnd={end}
                perQuestionSeconds={perQuestionSeconds}
                questionCount={questions.length}
                disabled={published}
                onChange={(patch) => setSchedule((current) => ({ ...current, ...patch }))}
              />

              <GradingGuideSection
                value={gradingGuide}
                guide={guide}
                status={guideStatus}
                questions={questions}
                disabled={published}
                onChange={setGradingGuide}
                onApplyPoints={applyGuidePoints}
                onError={setErrorMessage}
              />

              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="mr-auto text-sm font-bold text-gray-900">Danh sách câu hỏi ({questions.length})</h2>
                  <button type="button" disabled={published} onClick={() => setShowImport((value) => !value)} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40">Nhập đề nhanh / từ file</button>
                  <button type="button" disabled={published} onClick={splitEvenly} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40">Chia đều {TOTAL_POINTS} điểm</button>
                  <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${pointsValid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    Tổng: {total} / {TOTAL_POINTS}{pointsMode === 'auto' ? ' · tự chia' : ''}
                  </span>
                </div>

                {showImport && (
                  <QuickImportPanel
                    hasExisting={questions.some((question) => question.content.trim())}
                    onImport={importQuestions}
                    onClose={() => setShowImport(false)}
                    onError={setErrorMessage}
                  />
                )}

                {questions.map((question, index) => (
                  <QuestionEditor
                    key={question.key}
                    question={question}
                    index={index}
                    count={questions.length}
                    guideBlock={guide.questions.find((block) => block.position === index + 1)}
                    guideStatus={guideStatus[index]}
                    disabled={published}
                    onChange={(patch) => patchQuestion(question.key, patch)}
                    onScoreChange={(score) => setScore(question.key, score)}
                    onMove={(direction) => moveQuestion(question.key, direction)}
                    onRemove={() => removeQuestion(question.key)}
                  />
                ))}
                <button type="button" onClick={addQuestion} disabled={published || questions.length >= MAX_QUESTIONS} className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white py-3.5 text-xs font-semibold text-gray-700 hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  + Thêm câu hỏi
                </button>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Tóm tắt</h2>
                <dl className="mt-4 space-y-2.5 text-xs">
                  {[
                    ['Lớp', classes.find((item) => item.id === selectedClassId)?.class_name ?? 'Chưa chọn'],
                    ['Số câu', `${questions.length} câu`],
                    ['Thời lượng', Number.isFinite(durationMinutes) && durationMinutes > 0 ? `${durationMinutes} phút` : '—'],
                    ['Ghi âm tối đa / câu', formatDuration(perQuestionSeconds)],
                    ['Bắt đầu', start ? start.toLocaleString('vi-VN') : '—'],
                    ['Hạn chót', end ? end.toLocaleString('vi-VN') : 'Không giới hạn'],
                    ['Barem', `${guideStatus.filter((item) => item.criteriaCount).length}/${questions.length} câu có tiêu chí`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3"><dt className="text-gray-500">{label}</dt><dd className="text-right font-medium text-gray-900">{value}</dd></div>
                  ))}
                  <div className="flex justify-between gap-3 border-t border-gray-100 pt-2.5"><dt className="text-gray-500">Tổng điểm</dt><dd className={`font-semibold ${pointsValid ? 'text-emerald-700' : 'text-red-700'}`}>{total} / {TOTAL_POINTS}</dd></div>
                </dl>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900">Kiểm tra trước khi công bố</h2>
                <p className="mt-0.5 text-[11px] text-gray-500">{publishBlockers.length ? `Còn ${publishBlockers.length} mục bắt buộc chưa đạt.` : 'Đã sẵn sàng công bố.'}</p>
                <ul className="mt-3 space-y-1.5 text-[11px]">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex gap-2">
                      <span aria-hidden className={item.ok ? 'text-emerald-600' : item.level === 'error' ? 'text-red-600' : 'text-amber-600'}>{item.ok ? '✓' : item.level === 'error' ? '✗' : '!'}</span>
                      <span className={item.ok ? 'text-gray-600' : 'text-gray-900'}>
                        {item.label}
                        {!item.ok && item.detail && <span className="block text-gray-500">{item.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          {published && assignmentId && (
            <div role="dialog" aria-modal="true" aria-labelledby="published-title" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
              <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h2 id="published-title" className="text-lg font-bold text-gray-900">Đã công bố bài tập</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Sinh viên lớp đã chọn có thể bắt đầu làm bài từ {start ? start.toLocaleString('vi-VN') : 'bây giờ'}
                  {end ? ` đến ${end.toLocaleString('vi-VN')}` : ''}, mỗi lượt {durationMinutes} phút.
                </p>
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
