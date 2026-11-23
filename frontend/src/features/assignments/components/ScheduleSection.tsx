import { formatDuration, toLocalInput } from '@/features/assignments/lib/assignment-builder';

interface ScheduleSectionProps {
  startInput: string;
  durationInput: string;
  autoEnd: boolean;
  endInput: string;
  computedEnd: Date | null;
  perQuestionSeconds: number;
  questionCount: number;
  disabled: boolean;
  onChange: (patch: Partial<{ startInput: string; durationInput: string; autoEnd: boolean; endInput: string }>) => void;
}

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100';

/** Thời gian bắt đầu – thời lượng – hạn chót (hạn chót có thể tự tính = bắt đầu + thời lượng). */
export default function ScheduleSection({
  startInput, durationInput, autoEnd, endInput, computedEnd, perQuestionSeconds, questionCount, disabled, onChange,
}: ScheduleSectionProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Thời gian làm bài</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="assignment-start" className="block text-xs font-semibold text-gray-700">Thời gian bắt đầu *</label>
          <input id="assignment-start" type="datetime-local" value={startInput} disabled={disabled} onChange={(event) => onChange({ startInput: event.target.value })} className={inputClass} />
          <p className="text-[10px] text-gray-500">Sinh viên chỉ bấm “Bắt đầu làm bài” được từ thời điểm này.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="assignment-duration" className="block text-xs font-semibold text-gray-700">Thời lượng làm bài (phút) *</label>
          <input id="assignment-duration" type="number" inputMode="numeric" min="1" max="600" step="1" value={durationInput} disabled={disabled} onChange={(event) => onChange({ durationInput: event.target.value })} className={inputClass} />
          <p className="text-[10px] text-gray-500">
            Đồng hồ của mỗi sinh viên chạy từ lúc bấm bắt đầu. {questionCount > 0 && <>Tự tính: tối đa <strong>{formatDuration(perQuestionSeconds)}</strong> ghi âm mỗi câu.</>}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-gray-50 p-3.5">
        <label className="flex items-start gap-2 text-xs text-gray-800">
          <input type="checkbox" checked={autoEnd} disabled={disabled} onChange={(event) => onChange({ autoEnd: event.target.checked, endInput: event.target.checked ? endInput : endInput || toLocalInput(computedEnd) })} className="mt-0.5 h-4 w-4 accent-black" />
          <span>
            <strong>Thi tập trung:</strong> hạn chót = thời gian bắt đầu + thời lượng.
            <span className="block text-[10px] text-gray-500">Bỏ chọn để mở bài trong khoảng dài hơn (sinh viên tự chọn lúc làm, mỗi người vẫn có đủ thời lượng nhưng không vượt hạn chót).</span>
          </span>
        </label>
        {autoEnd ? (
          <p className="text-xs text-gray-700">Hạn chót: <strong>{computedEnd ? computedEnd.toLocaleString('vi-VN') : '— (nhập thời gian bắt đầu và thời lượng)'}</strong></p>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="assignment-end" className="block text-xs font-semibold text-gray-700">Hạn chót nộp bài</label>
            <input id="assignment-end" type="datetime-local" value={endInput} min={startInput || undefined} disabled={disabled} onChange={(event) => onChange({ endInput: event.target.value })} className={inputClass} />
            <p className="text-[10px] text-gray-500">Để trống nếu không giới hạn hạn chót. Sinh viên bắt đầu sát hạn sẽ bị cắt giờ theo hạn chót.</p>
          </div>
        )}
      </div>
    </section>
  );
}
