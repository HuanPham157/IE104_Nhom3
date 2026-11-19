import type { GuideQuestion } from '@/lib/exam-text';
import type { QuestionDraft, QuestionGuideStatus } from '@/lib/assignment-builder';

interface QuestionEditorProps {
  question: QuestionDraft;
  index: number;
  count: number;
  guideBlock?: GuideQuestion;
  guideStatus?: QuestionGuideStatus;
  /** Câu được tạo từ barem: nội dung, đáp án, điểm sửa trong mục Barem (khóa ở đây để hai nơi không lệch nhau). */
  fromGuide?: boolean;
  disabled: boolean;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onScoreChange: (score: number) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export default function QuestionEditor({ question, index, count, guideBlock, guideStatus, fromGuide = false, disabled, onChange, onScoreChange, onMove, onRemove }: QuestionEditorProps) {
  const preview = question.content.trim().split('\n')[0] || 'Chưa có nội dung';
  const locked = disabled || fromGuide;
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 p-3 sm:p-4">
        <button type="button" aria-expanded={question.expanded} onClick={() => onChange({ expanded: !question.expanded })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-bold">{String(index + 1).padStart(2, '0')}</span>
          <span className="min-w-0">
            <span className={`block truncate text-xs font-semibold ${question.content.trim() ? 'text-gray-900' : 'text-red-600'}`}>{preview}</span>
            <span className="block text-[10px] text-gray-500">
              {question.maxScore} điểm · {guideStatus?.criteriaCount ? `${guideStatus.criteriaCount} tiêu chí barem` : 'chưa có tiêu chí barem'}{question.referenceAnswer.trim() ? ' · có đáp án' : ''}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <button type="button" disabled={locked || index === 0} onClick={() => onMove(-1)} aria-label={`Đưa câu ${index + 1} lên`} className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
          <button type="button" disabled={locked || index === count - 1} onClick={() => onMove(1)} aria-label={`Đưa câu ${index + 1} xuống`} className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
          <button type="button" disabled={locked || count === 1} onClick={onRemove} aria-label={`Xóa câu ${index + 1}`} className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30">Xóa</button>
        </div>
      </div>

      {question.expanded && (
        <div className="space-y-4 p-4 sm:p-5">
          {fromGuide && !disabled && <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-900">Câu này được tạo từ barem. Sửa nội dung, đáp án và điểm trong mục <strong>Barem chấm điểm</strong> ở trên.</p>}
          <div className="space-y-1.5">
            <label htmlFor={`question-content-${question.key}`} className="block text-xs font-semibold text-gray-700">Nội dung câu hỏi *</label>
            <textarea id={`question-content-${question.key}`} value={question.content} maxLength={10000} rows={3} disabled={locked} onChange={(event) => onChange({ content: event.target.value })} placeholder="Câu hỏi sinh viên sẽ trả lời bằng giọng nói…" className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100" />
          </div>
          <div className="space-y-1.5 sm:w-44">
            <label htmlFor={`question-points-${question.key}`} className="block text-xs font-semibold text-gray-700">Điểm</label>
            <input id={`question-points-${question.key}`} type="number" min="0.25" max="10" step="0.25" value={question.maxScore} disabled={locked} onChange={(event) => onScoreChange(Number(event.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none disabled:bg-gray-100" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`question-answer-${question.key}`} className="block text-xs font-semibold text-gray-700">Đáp án tham khảo</label>
            <textarea id={`question-answer-${question.key}`} value={question.referenceAnswer} maxLength={10000} rows={3} disabled={locked} onChange={(event) => onChange({ referenceAnswer: event.target.value })} placeholder="Các ý chính của câu trả lời đúng…" className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:border-black focus:outline-none disabled:bg-gray-100" />
            <p className="text-[10px] text-gray-500">AI dùng để chấm và so sánh từ khóa. Sinh viên chỉ thấy đáp án sau khi nộp bài và khi bạn bật “Cho sinh viên xem đáp án tham khảo”.</p>
          </div>
          <div className={`rounded-xl p-3 text-[11px] ${guideStatus?.mismatch ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-700'}`}>
            <p className="font-semibold">Tiêu chí từ barem {guideStatus?.mismatch && `— tổng ${guideStatus.criteriaTotal}đ khác điểm câu ${question.maxScore}đ`}</p>
            {guideBlock?.criteria.length ? (
              <ul className="mt-1 space-y-0.5">{guideBlock.criteria.map((criterion, criterionIndex) => <li key={criterionIndex}>• {criterion.text} — <strong>{criterion.points}đ</strong>{criterion.expected && <span className="block pl-3 text-gray-500">Ý cần có: {criterion.expected}</span>}</li>)}</ul>
            ) : <p className="mt-1 text-gray-500">Chưa có. AI sẽ chấm tổng thể theo đáp án tham khảo. Thêm “Câu {index + 1} (…điểm)” vào mục Barem để chấm theo ý.</p>}
            {guideBlock?.notes && <p className="mt-1 whitespace-pre-wrap text-gray-600">Ghi chú: {guideBlock.notes}</p>}
          </div>
        </div>
      )}
    </article>
  );
}
