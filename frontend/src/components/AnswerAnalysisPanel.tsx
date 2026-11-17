import { analyzeAnswer } from '@/lib/answer-analysis';

interface AnswerAnalysisPanelProps {
  transcript: string | null | undefined;
  referenceAnswer?: string | null;
  audioDurationSeconds?: number | null;
  /** Ẩn danh sách từ khóa còn thiếu (ví dụ khi sinh viên chưa được xem đáp án). */
  hideMissing?: boolean;
}

/** Hiển thị so sánh từ khóa với đáp án và cảnh báo bài nộp thiếu nội dung. */
export default function AnswerAnalysisPanel({ transcript, referenceAnswer, audioDurationSeconds, hideMissing = false }: AnswerAnalysisPanelProps) {
  const analysis = analyzeAnswer(transcript, referenceAnswer, audioDurationSeconds);
  const coveragePercent = analysis.coverage === null ? null : Math.round(analysis.coverage * 100);

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-gray-900">Phân tích nội dung</h4>
        <span className="text-xs text-gray-500">{analysis.wordCount} từ</span>
      </div>

      {coveragePercent !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Độ phủ từ khóa đáp án</span>
            <span className="font-semibold tabular-nums text-gray-900">{analysis.matched.length}/{analysis.keywords.length} · {coveragePercent}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={coveragePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Độ phủ từ khóa">
            <div className={`h-full ${coveragePercent >= 60 ? 'bg-emerald-600' : coveragePercent >= 25 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${coveragePercent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.matched.map((keyword) => <span key={`m-${keyword}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">✓ {keyword}</span>)}
            {!hideMissing && analysis.missing.map((keyword) => <span key={`x-${keyword}`} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 line-through decoration-gray-400">{keyword}</span>)}
          </div>
        </div>
      )}

      {analysis.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
          {analysis.warnings.map((warning) => <li key={warning.code}>⚠ {warning.message}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-emerald-700">Không phát hiện dấu hiệu thiếu nội dung.</p>
      )}
    </div>
  );
}
