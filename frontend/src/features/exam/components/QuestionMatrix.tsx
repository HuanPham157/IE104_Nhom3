import type { ResultLevel, WorkTileState } from '@/features/exam/types';
import { RESULT_META, WORK_TILE_META } from '@/features/exam/types';

type MatrixItem = {
  id: string;
  position: number;
  /** Dòng phụ dưới số câu, ví dụ "3 bản" hoặc "7/10". */
  caption?: string;
} & ({ mode: 'work'; state: WorkTileState } | { mode: 'result'; state: ResultLevel });

/**
 * Ma trận câu hỏi: mỗi ô là một câu. Khi đang làm bài thể hiện tiến độ,
 * sau khi nộp thể hiện kết quả đúng/sai. Trạng thái luôn có biểu tượng + chú giải, không chỉ dựa vào màu.
 */
export default function QuestionMatrix({ items, title }: { items: MatrixItem[]; title: string }) {
  const mode = items[0]?.mode ?? 'work';
  const legend = mode === 'work'
    ? (Object.keys(WORK_TILE_META) as WorkTileState[]).map((key) => ({ key, ...WORK_TILE_META[key] }))
    : (Object.keys(RESULT_META) as ResultLevel[]).filter((key) => key !== 'grading' || items.some((item) => item.state === 'grading')).map((key) => ({ key, ...RESULT_META[key] }));
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.state, (counts.get(item.state) ?? 0) + 1);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <ol className="mt-2 grid grid-cols-5 gap-2">
        {items.map((item) => {
          const meta = item.mode === 'work' ? WORK_TILE_META[item.state] : RESULT_META[item.state];
          return (
            <li key={item.id}>
              <a
                href={`#question-${item.id}`}
                title={`Câu ${item.position}: ${meta.label}`}
                aria-label={`Câu ${item.position}: ${meta.label}${item.caption ? `, ${item.caption}` : ''}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 text-center leading-none transition hover:scale-105 ${meta.className}`}
              >
                <span className="text-sm font-bold tabular-nums">{item.position}</span>
                <span className="mt-0.5 text-[10px]" aria-hidden>{meta.icon}</span>
              </a>
              {item.caption && <p className="mt-0.5 truncate text-center text-[10px] tabular-nums text-gray-500">{item.caption}</p>}
            </li>
          );
        })}
      </ol>
      <ul className="mt-3 space-y-1 text-[11px] text-gray-600">
        {legend.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2">
            <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${entry.className}`} aria-hidden>{entry.icon}</span>
            <span>{entry.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-gray-900">{counts.get(entry.key) ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
