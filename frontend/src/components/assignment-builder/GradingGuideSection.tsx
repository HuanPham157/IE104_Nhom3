'use client';

import DocumentUploadButton from '@/components/assignment-builder/DocumentUploadButton';
import type { ParsedGuide } from '@/lib/exam-text';
import { GRADING_GUIDE_TEMPLATE } from '@/lib/exam-text';
import type { QuestionDraft, QuestionGuideStatus } from '@/lib/assignment-builder';
import { TOTAL_POINTS } from '@/lib/assignment-builder';

interface GradingGuideSectionProps {
  value: string;
  guide: ParsedGuide;
  status: QuestionGuideStatus[];
  questions: QuestionDraft[];
  disabled: boolean;
  onChange: (value: string) => void;
  onApplyPoints: (points: number[]) => void;
  onError: (message: string) => void;
}

/** Barem chấm chung cho cả bài: viết trực tiếp hoặc tải file; tự tách thành tiêu chí từng câu. */
export default function GradingGuideSection({ value, guide, status, questions, disabled, onChange, onApplyPoints, onError }: GradingGuideSectionProps) {
  const guidePoints = status.map((item) => item.guidePoints);
  const canApplyPoints = questions.length > 0
    && guidePoints.every((points) => points !== undefined && points > 0)
    && Math.abs(guidePoints.reduce((sum: number, points) => sum + (points ?? 0), 0) - TOTAL_POINTS) < 0.01
    && guidePoints.some((points, index) => Math.abs((points ?? 0) - questions[index].maxScore) > 0.01);

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Barem chấm điểm</h2>
          <p className="text-[11px] text-gray-500">Áp dụng cho cả bài. Sinh viên không xem được; AI chấm từng câu theo tiêu chí và ghi chú bên dưới.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DocumentUploadButton label="Tải file barem (.docx/.txt)" disabled={disabled} onError={onError} onText={(text) => onChange(text)} />
          <button type="button" disabled={disabled || Boolean(value.trim())} onClick={() => onChange(GRADING_GUIDE_TEMPLATE)} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">Chèn mẫu</button>
        </div>
      </div>

      <textarea
        aria-label="Nội dung barem"
        value={value}
        maxLength={20000}
        rows={9}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'Yêu cầu chung (không bắt buộc)…\n\nCâu 1 (4 điểm)\n- Nêu đúng định nghĩa: 2\n- Cho ví dụ: 2\n\nCâu 2 (6 điểm)\n- …'}
        className="w-full rounded-xl border border-gray-200 p-3 font-mono text-[12px] leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100"
      />
      <p className="text-[10px] text-gray-500">Cú pháp: dòng “Câu N (x điểm)” mở đầu phần của câu N; mỗi dòng “- ý: điểm” là một tiêu chí; dòng không có điểm là ghi chú cho AI. Phần trước “Câu 1” là yêu cầu chung.</p>

      {value.trim() && (
        <div className="rounded-xl bg-gray-50 p-3.5">
          <p className="text-xs font-semibold text-gray-800">Barem đã nhận diện</p>
          {guide.generalNotes && <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">Yêu cầu chung: {guide.generalNotes}</p>}
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {status.map((item) => (
              <li key={item.position} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${item.mismatch ? 'border-red-200 bg-red-50 text-red-800' : item.criteriaCount ? 'border-emerald-200 bg-white text-gray-800' : 'border-gray-200 bg-white text-gray-500'}`}>
                <span className="font-semibold">Câu {item.position}</span>
                <span>
                  {item.criteriaCount
                    ? `${item.criteriaCount} tiêu chí · ${item.criteriaTotal}/${questions[item.position - 1]?.maxScore}đ ${item.mismatch ? '✗' : '✓'}`
                    : 'Chưa có tiêu chí — AI chấm theo đáp án'}
                </span>
              </li>
            ))}
          </ul>
          {canApplyPoints && (
            <button type="button" disabled={disabled} onClick={() => onApplyPoints(guidePoints.map((points) => points ?? 0))} className="mt-3 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              Đặt điểm các câu theo barem
            </button>
          )}
        </div>
      )}
    </section>
  );
}
