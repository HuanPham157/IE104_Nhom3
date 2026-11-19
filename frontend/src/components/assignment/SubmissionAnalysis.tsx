'use client';

import AnswerAnalysisPanel from '@/components/AnswerAnalysisPanel';
import { compareKeywords } from '@/lib/answer-analysis';
import type { AssignmentQuestion, QuestionProgress, ResultLevel } from '@/components/assignment/types';
import { RESULT_META, finalVersionOf, resultLevelOf } from '@/components/assignment/types';
import AudioPlayer from '@/components/AudioPlayer';
import { assessmentLabel } from '@/lib/assessment';

interface SubmissionAnalysisProps {
  questions: AssignmentQuestion[];
  progress: Record<string, QuestionProgress>;
  /** Giảng viên đã công bố điểm chính thức chưa. */
  resultsPublished: boolean;
  /** Tổng điểm chính thức (null khi chưa công bố). */
  officialTotal: number | null;
  onRetryGrade: (questionId: string) => void;
}

/** Phần phân tích hiển thị sau khi nộp bài: tổng quan, kiến thức cần ôn và chi tiết từng câu. */
export default function SubmissionAnalysis({ questions, progress, resultsPublished, officialTotal, onRetryGrade }: SubmissionAnalysisProps) {
  const rows = questions.map((question) => {
    const item = progress[question.id];
    const version = finalVersionOf(item);
    return { question, version, grade: item?.grade, official: item?.official, level: resultLevelOf(item, question.max_score) };
  });
  const graded = rows.filter((row) => row.grade?.status === 'graded' && row.grade.score !== undefined);
  const totalScore = graded.reduce((sum, row) => sum + (row.grade!.score ?? 0), 0);
  const totalMax = questions.reduce((sum, question) => sum + Number(question.max_score), 0);
  const gradingCount = rows.filter((row) => row.level === 'grading').length;
  const levelCount = (level: ResultLevel) => rows.filter((row) => row.level === level).length;

  // Gom các từ khóa đáp án còn thiếu của mọi câu chưa đạt tối đa.
  const missingKeywords = [...new Set(rows.flatMap((row) => (
    row.grade?.referenceAnswer && row.level !== 'correct'
      ? compareKeywords(row.version?.transcript ?? '', row.grade.referenceAnswer).missing.map((keyword) => keyword)
      : []
  )))].slice(0, 12);

  return (
    <section className="mt-6 space-y-5" aria-labelledby="analysis-heading">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 id="analysis-heading" className="text-lg font-bold text-gray-900">Phân tích bài làm</h2>
        {resultsPublished ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Điểm chính thức của giảng viên</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-950">{officialTotal ?? '—'}<span className="text-base font-semibold text-emerald-800"> / {totalMax}</span></p>
            </div>
            <p className="max-w-sm text-xs text-emerald-900">Điểm đã được giảng viên duyệt và công bố. Nhận xét của giảng viên nằm ở từng câu bên dưới.</p>
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">⏳ Bài đã nộp, đang chờ giảng viên duyệt và công bố điểm chính thức. Điểm dưới đây là điểm AI đề xuất.</p>
        )}
        {gradingCount > 0 && <p className="mt-1 text-sm text-indigo-700" aria-live="polite">AI đang chấm {gradingCount} câu…</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4 sm:col-span-1">
            <p className="text-xs text-gray-500">Điểm AI đề xuất</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{graded.length ? totalScore.toFixed(2) : '—'}<span className="text-base font-semibold text-gray-500"> / {totalMax}</span></p>
            <p className="mt-1 text-[11px] text-gray-500">{graded.length}/{questions.length} câu đã chấm</p>
          </div>
          {(['correct', 'partial', 'incorrect'] as const).map((level) => (
            <div key={level} className="rounded-xl bg-gray-50 p-4">
              <p className="flex items-center gap-1.5 text-xs text-gray-500"><span className={`flex h-4 w-4 items-center justify-center rounded border text-[9px] ${RESULT_META[level].className}`} aria-hidden>{RESULT_META[level].icon}</span>{RESULT_META[level].label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{levelCount(level)}</p>
            </div>
          ))}
        </div>
        {missingKeywords.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Ý / thuật ngữ còn thiếu so với đáp án</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-white px-2 py-0.5 text-xs text-amber-900 ring-1 ring-amber-200">{keyword}</span>)}
            </div>
          </div>
        )}
      </div>

      <ol className="space-y-4">
        {rows.map(({ question, version, grade, official, level }) => {
          const meta = RESULT_META[level];
          return (
            <li key={question.id} id={`question-${question.id}`} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900">Câu {question.position}</h3>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>{meta.icon} {meta.label}</span>
                  {official
                    ? <span className="text-sm font-bold tabular-nums text-emerald-800">{official.score} / {question.max_score}</span>
                    : grade?.status === 'graded' && <span className="text-sm font-bold tabular-nums">{grade.score} / {question.max_score} <span className="text-[11px] font-medium text-gray-500">(AI)</span></span>}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{question.content}</p>

              {!version && <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">Không có câu trả lời được nộp cho câu này.</p>}
              {version && <>
                {version.audioUrl && <AudioPlayer key={version.audioUrl} src={version.audioUrl} preload="none" label={`Bản đã nộp câu ${question.position}`} className="mt-3" />}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Transcript đã nộp (bản {version.attemptNumber})</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-800">{version.transcript || 'Chưa có transcript.'}</p>
              </>}

              {official && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <p className="font-semibold text-emerald-900">Giảng viên chấm: {official.score} / {question.max_score}{grade?.status === 'graded' && grade.score !== official.score ? ` (AI đề xuất ${grade.score})` : ''}</p>
                  {official.feedback && <p className="mt-1 whitespace-pre-wrap text-gray-800">{official.feedback}</p>}
                </div>
              )}

              {grade?.status === 'graded' && (
                <div className="mt-3 rounded-xl bg-indigo-50 p-4 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-800">Nhận xét của AI</p>
                  {grade.feedback && <p className="whitespace-pre-wrap text-gray-800">{grade.feedback}</p>}
                  {grade.criteria && grade.criteria.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {grade.criteria.map((criterion) => {
                        const label = assessmentLabel(criterion.assessment);
                        return (
                          <li key={criterion.criterion_id} className="border-t border-indigo-100 pt-2">
                            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${label.className}`}>{label.text}</span><span className="text-xs font-semibold text-gray-700">{criterion.awarded_points} điểm</span></div>
                            {criterion.evidence_excerpt && <p className="mt-1 text-xs text-gray-700">Dẫn chứng: “{criterion.evidence_excerpt}”</p>}
                            {criterion.explanation && <p className="mt-1 text-xs text-gray-600">{criterion.explanation}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {grade.needsTeacherReview && <p className="mt-3 text-xs font-semibold text-amber-800">AI đánh dấu câu này cần giảng viên xem lại.</p>}
                </div>
              )}
              {grade?.referenceAnswer && <>
                <details className="mt-3 rounded-xl border border-gray-200 p-4 text-sm">
                  <summary className="cursor-pointer font-semibold text-gray-900">Lời giải tham khảo</summary>
                  <p className="mt-2 whitespace-pre-wrap text-gray-700">{grade.referenceAnswer}</p>
                </details>
                <AnswerAnalysisPanel transcript={version?.transcript} referenceAnswer={grade.referenceAnswer} audioDurationSeconds={version?.durationSeconds} />
              </>}
              {!resultsPublished && (grade?.status === 'failed' || (!grade && version?.transcript?.trim())) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {grade?.error && <p className="text-xs text-red-700">{grade.error}</p>}
                  <button type="button" onClick={() => onRetryGrade(question.id)} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">{grade ? 'Thử chấm lại' : 'Chấm bằng AI'}</button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
