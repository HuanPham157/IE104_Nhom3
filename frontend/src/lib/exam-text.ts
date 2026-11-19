/**
 * Phân tích văn bản đề bài và barem chấm (dán vào hoặc đọc từ file .docx/.txt).
 * Dùng chung cho form soạn bài (client) và route chấm AI (server).
 *
 * Định dạng nhận diện (không phân biệt hoa thường, có/không dấu):
 *   Câu 1 (4 điểm): Nội dung...          ← tiêu đề câu, điểm trong ngoặc là tùy chọn
 *   Đáp án: ...                           ← (chỉ trong đề) đáp án tham khảo của câu
 *   - Nêu đúng định nghĩa: 2đ             ← (chỉ trong barem) tiêu chí kèm điểm; điểm đứng trước cũng được ("- 2đ: Nêu…")
 *   - Cho ví dụ: 2 => lời gọi hàm | undo  ← (tùy chọn) sau "=>" là ý cần có: ";" = phải đủ, "|" = một trong các ý
 *   Ghi chú bất kỳ                        ← dòng không có điểm = ghi chú cho AI
 */

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(?:điểm|diem|đ|d|pts?|points?)`;
// Câu 1 (4 điểm): … | Câu 1. (4đ) … | Câu 1: 4 điểm. … — nhóm: 1 số câu, 2/3/4 điểm, 5 phần còn lại.
const HEADER = new RegExp(
  String.raw`^\s*(?:câu|cau|question|bài|bai)\s*(\d{1,3})\s*(?:\(\s*${NUMBER}\s*${UNIT}\s*\))?\s*(?:[.:)\-–]\s*)?`
  + String.raw`(?:\(\s*${NUMBER}\s*${UNIT}\s*\)\s*[.:\-–]?\s*)?`
  + String.raw`(?:${NUMBER}\s*(?:điểm|diem|đ|d)(?=\s|[.:\-–]|$)\s*[.:\-–]?\s*)?(.*)$`,
  'i',
);
const ANSWER_PREFIX = /^\s*(?:đáp án|dap an|đa|gợi ý trả lời|goi y tra loi|answer)\s*[:：]\s*/i;
// Dấu đầu dòng: ký hiệu, hoặc "1." / "a)" có khoảng trắng phía sau (để không cắt nhầm "1.5đ").
const BULLET = /^\s*(?:[-•*+–●○▪■◦·]\s*|\d+[.)]\s+|[a-zđ][.)]\s+)/i;
const POINTS_AT_END = new RegExp(String.raw`^(.+?)\s*(?::|-|–|\(|=)\s*${NUMBER}\s*${UNIT}?\s*\)?$`, 'i');
const POINTS_AT_START = new RegExp(String.raw`^${NUMBER}\s*${UNIT}\s*(?::|-|–|\)|\.)\s*(.+)$`, 'i');
const EXPECTED_ARROW = /\s*(?:=>|⇒|→)\s*/;

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
      blocks.push({ position: Number(header[1]), points: toNumber(header[2] ?? header[3] ?? header[4]), firstLine: header[5].trim(), lines: [] });
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

// expected: ý cần có ghi sau "=>" (rỗng nếu không có) — engine chấm dùng để biết phải nghe thấy nội dung gì.
// expected: ý cần có ghi sau "=>" (rỗng nếu không có) — engine chấm dùng để biết phải nghe thấy nội dung gì.
export type GuideCriterion = { text: string; points: number; expected: string };
// content/referenceAnswer: có khi barem chứa luôn đề bài ("Câu 1 (4 điểm): …", "Đáp án: …") — khi đó barem tạo câu hỏi.
export type GuideQuestion = {
  position: number;
  points?: number;
  content: string;
  referenceAnswer: string;
  criteria: GuideCriterion[];
  notes: string;
};
export type ParsedGuide = { generalNotes: string; questions: GuideQuestion[] };

const QUESTION_PREFIX = /^\s*(?:câu hỏi|cau hoi|nội dung|noi dung|đề bài|de bai)\s*[:：]\s*/i;
const CRITERIA_LABEL = /^\s*(?:tiêu chí chấm|tieu chi cham|tiêu chí|tieu chi|barem|thang điểm|thang diem|criteria|rubric)\s*(?:[:：]\s*(.*))?$/i;
const NOTE_PREFIX = /^\s*(?:ghi chú|ghi chu|lưu ý|luu y|note)\s*[:：]\s*/i;
const STARTS_WITH_BULLET = /^\s*(?:[-•*+–●○▪■◦·]|\d+[.)]\s|[a-zđ][.)]\s)/i;

/** Một dòng tiêu chí của barem, hoặc null nếu dòng không có điểm (khi đó là ghi chú). */
function parseCriterion(line: string): GuideCriterion | null {
  let body = line.replace(/[\s.;,]+$/, '');
  let expected = '';
  const arrow = EXPECTED_ARROW.exec(body);
  if (arrow) {
    expected = body.slice(arrow.index + arrow[0].length).trim();
    body = body.slice(0, arrow.index).replace(/[\s.;,]+$/, '');
  }
  body = body.replace(BULLET, '');
  const atEnd = POINTS_AT_END.exec(body);
  const atStart = atEnd ? null : POINTS_AT_START.exec(body);
  const text = (atEnd?.[1] ?? atStart?.[2] ?? '').trim();
  const points = toNumber(atEnd?.[2] ?? atStart?.[1]);
  if (!text || points === undefined || points <= 0 || points > 100) return null;
  return { text: text.slice(0, 500), points, expected: expected.slice(0, 2000) };
}

type Section = 'content' | 'answer' | 'criteria' | 'notes';

/**
 * Tách một khối "Câu N" của barem:
 *   Câu 1 (4 điểm): Nội dung câu hỏi…     ← có nội dung sau tiêu đề (hoặc nhãn "Câu hỏi:") ⇒ khối tạo câu hỏi
 *   Đáp án: …                             ← đáp án tham khảo (nhiều dòng được)
 *   Tiêu chí:                             ← (tùy chọn) nhãn mở phần tiêu chí
 *   - Nêu đúng định nghĩa: 2 => ý cần có
 *   Ghi chú: …                            ← ghi chú cho AI/giảng viên
 * Barem kiểu cũ (chỉ "Câu N (x điểm)" và tiêu chí) vẫn được hiểu: dòng không phải tiêu chí là ghi chú.
 */
function parseGuideBlock(block: Block): GuideQuestion {
  const isQuestionBlock = Boolean(block.firstLine)
    || block.lines.some((line) => QUESTION_PREFIX.test(line) || ANSWER_PREFIX.test(line));
  const parts: Record<Section, string[]> = { content: [], answer: [], criteria: [], notes: [] };
  const criteria: GuideCriterion[] = [];
  let section: Section = isQuestionBlock ? 'content' : 'notes';

  for (const line of [block.firstLine, ...block.lines]) {
    if (!line.trim()) {
      if (section === 'content' || section === 'answer') parts[section].push('');
      continue;
    }
    if (QUESTION_PREFIX.test(line)) {
      section = 'content';
      parts.content.push(line.replace(QUESTION_PREFIX, ''));
      continue;
    }
    if (ANSWER_PREFIX.test(line)) {
      section = 'answer';
      parts.answer.push(line.replace(ANSWER_PREFIX, ''));
      continue;
    }
    const label = CRITERIA_LABEL.exec(line);
    if (label) {
      section = 'criteria';
      const inline = label[1]?.trim() ? parseCriterion(label[1]) : null;
      if (inline) criteria.push(inline);
      continue;
    }
    if (NOTE_PREFIX.test(line)) {
      section = 'notes';
      parts.notes.push(line.replace(NOTE_PREFIX, '').trim());
      continue;
    }
    // Trong phần đáp án, chỉ dòng có gạch đầu dòng mới được hiểu là tiêu chí (đáp án hay có "x: y").
    const criterion = section === 'answer' && !STARTS_WITH_BULLET.test(line) ? null : parseCriterion(line);
    if (criterion) {
      criteria.push(criterion);
      section = 'criteria';
    } else {
      parts[section === 'criteria' ? 'notes' : section].push(section === 'content' || section === 'answer' ? line : line.trim());
    }
  }
  return {
    position: block.position,
    points: block.points,
    content: tidy(parts.content),
    referenceAnswer: tidy(parts.answer),
    criteria,
    notes: parts.notes.join('\n').trim(),
  };
}

export function parseGradingGuide(text: string): ParsedGuide {
  const { preamble, blocks } = splitBlocks(text);
  return { generalNotes: tidy(preamble), questions: blocks.map(parseGuideBlock) };
}

/** Ghi chú barem gửi cho AI khi chấm một câu: phần ghi chú chung + ghi chú riêng của câu đó. */
export function gradingNotesForQuestion(guideText: string | null | undefined, position: number): string {
  if (!guideText?.trim()) return '';
  const guide = parseGradingGuide(guideText);
  const own = guide.questions.find((question) => question.position === position);
  return [guide.generalNotes, own?.notes].filter(Boolean).join('\n').slice(0, 4000);
}

export const GRADING_GUIDE_TEMPLATE = `Yêu cầu chung: chấm theo mức độ hiểu, không trừ điểm phát âm; chấp nhận cách diễn đạt khác nếu đúng ý.

Câu 1 (4 điểm): Trình bày nguyên tắc hoạt động của ngăn xếp (stack) và cho một ví dụ ứng dụng.
Đáp án: Ngăn xếp hoạt động theo nguyên tắc vào sau ra trước (LIFO). Thao tác push thêm phần tử vào đỉnh, pop lấy phần tử ở đỉnh ra. Ứng dụng: quản lý lời gọi hàm, chức năng hoàn tác (undo).
Tiêu chí:
- Nêu đúng nguyên tắc hoạt động: 1.5 => vào sau ra trước (LIFO)
- Trình bày thao tác push và pop: 1.5 => push thêm phần tử vào đỉnh; pop lấy phần tử ở đỉnh ra
- Cho một ví dụ ứng dụng: 1 => quản lý lời gọi hàm | hoàn tác (undo) | kiểm tra dấu ngoặc

Câu 2 (6 điểm): Trình bày ý tưởng và độ phức tạp của thuật toán tìm kiếm nhị phân.
Đáp án: Chỉ áp dụng trên mảng đã sắp xếp. Mỗi bước so sánh với phần tử ở giữa, nhỏ hơn thì tìm nửa trái, lớn hơn thì tìm nửa phải, mỗi lần loại bỏ một nửa phạm vi. Độ phức tạp O(log n).
Tiêu chí:
- Nêu điều kiện mảng đã sắp xếp: 1 => mảng đã được sắp xếp
- Trình bày ý tưởng chia đôi: 3 => so sánh với phần tử ở giữa; tìm tiếp ở nửa trái hoặc nửa phải
- Nêu độ phức tạp: 2 => O(log n)
Ghi chú: không cho điểm độ phức tạp nếu sinh viên nói O(n).`;

export const QUESTIONS_TEMPLATE = `Câu 1: Trình bày khái niệm ...
Đáp án: ...

Câu 2: Phân tích ...
Đáp án: ...`;
