/**
 * Phân tích văn bản đề bài và barem chấm (dán vào hoặc đọc từ file .docx/.txt).
 * Dùng chung cho form soạn bài (client) và route chấm AI (server).
 *
 * Định dạng nhận diện (không phân biệt hoa thường, có/không dấu):
 *   Câu 1 (4 điểm): Nội dung...          ← tiêu đề câu, điểm trong ngoặc là tùy chọn
 *   Đáp án: ...                           ← (chỉ trong đề) đáp án tham khảo của câu
 *   - Nêu đúng định nghĩa: 2đ             ← (chỉ trong barem) tiêu chí kèm điểm
 *   Ghi chú bất kỳ                        ← dòng không có điểm = ghi chú cho AI
 */

const HEADER = /^\s*(?:câu|cau|question|bài|bai)\s*(\d{1,3})\s*(?:\(\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ|d|pts?|points?)\s*\))?\s*(?:[.:)\-–]\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ|d)(?=\s|[.:\-–]|$)\s*[.:\-–]?\s*)?(.*)$/i;
const ANSWER_PREFIX = /^\s*(?:đáp án|dap an|đa|gợi ý trả lời|goi y tra loi|answer)\s*[:：]\s*/i;
const CRITERION = /^\s*(?:[-•*+–]|\d+[.)]|[a-zđ][.)])?\s*(.+?)\s*(?::|-|–|\(|=)\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ|d|pts?)?\s*\)?\s*\.?\s*$/i;

const toNumber = (value?: string) => (value ? Number(value.replace(',', '.')) : undefined);

type Block = { position: number; points?: number; firstLine: string; lines: string[] };

/** Tách văn bản thành phần mở đầu (trước "Câu 1") và các khối theo từng câu. */
function splitBlocks(text: string): { preamble: string[]; blocks: Block[] } {
  const preamble: string[] = [];
  const blocks: Block[] = [];
  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    const header = HEADER.exec(line);
    if (header) {
      blocks.push({ position: Number(header[1]), points: toNumber(header[2] ?? header[3]), firstLine: header[4].trim(), lines: [] });
    } else if (blocks.length) {
      blocks[blocks.length - 1].lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble, blocks };
}

const tidy = (lines: string[]) => lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

// ---------- Đề bài ----------

export type ParsedQuestion = { content: string; referenceAnswer: string; points?: number };

/** "Nhập đề nhanh": tách đề dán vào thành danh sách câu hỏi. */
export function parseQuestionsText(text: string): ParsedQuestion[] {
  const { blocks } = splitBlocks(text);
  return blocks.map((block) => {
    const contentLines = block.firstLine ? [block.firstLine] : [];
    const answerLines: string[] = [];
    let inAnswer = false;
    for (const line of block.lines) {
      if (ANSWER_PREFIX.test(line)) {
        inAnswer = true;
        answerLines.push(line.replace(ANSWER_PREFIX, ''));
      } else (inAnswer ? answerLines : contentLines).push(line);
    }
    return { content: tidy(contentLines), referenceAnswer: tidy(answerLines), points: block.points };
  }).filter((question) => question.content);
}

// ---------- Barem ----------

export type GuideCriterion = { text: string; points: number };
export type GuideQuestion = { position: number; points?: number; criteria: GuideCriterion[]; notes: string };
export type ParsedGuide = { generalNotes: string; questions: GuideQuestion[] };

export function parseGradingGuide(text: string): ParsedGuide {
  const { preamble, blocks } = splitBlocks(text);
  const questions = blocks.map((block) => {
    const criteria: GuideCriterion[] = [];
    const notes: string[] = [];
    for (const line of [block.firstLine, ...block.lines]) {
      if (!line.trim()) continue;
      const match = CRITERION.exec(line);
      const points = toNumber(match?.[2]);
      if (match && points !== undefined && points > 0 && points <= 100) {
        criteria.push({ text: match[1].trim().slice(0, 500), points });
      } else {
        notes.push(line.trim());
      }
    }
    return { position: block.position, points: block.points, criteria, notes: notes.join('\n') };
  });
  return { generalNotes: tidy(preamble), questions };
}

/** Ghi chú barem gửi cho AI khi chấm một câu: phần ghi chú chung + ghi chú riêng của câu đó. */
export function gradingNotesForQuestion(guideText: string | null | undefined, position: number): string {
  if (!guideText?.trim()) return '';
  const guide = parseGradingGuide(guideText);
  const own = guide.questions.find((question) => question.position === position);
  return [guide.generalNotes, own?.notes].filter(Boolean).join('\n').slice(0, 4000);
}

export const GRADING_GUIDE_TEMPLATE = `Yêu cầu chung: chấm theo mức độ hiểu, không trừ điểm phát âm; nêu sai khái niệm cốt lõi thì không cho điểm ý đó.

Câu 1 (4 điểm)
- Nêu đúng định nghĩa: 2
- Cho ví dụ minh họa phù hợp: 1
- Giải thích được ưu/nhược điểm: 1

Câu 2 (6 điểm)
- Trình bày đúng các bước: 3
- Phân tích độ phức tạp: 2
- Liên hệ thực tế: 1
Chấp nhận cách diễn đạt khác nếu đúng ý.`;

export const QUESTIONS_TEMPLATE = `Câu 1: Trình bày khái niệm ...
Đáp án: ...

Câu 2: Phân tích ...
Đáp án: ...`;
