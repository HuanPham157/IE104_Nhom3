/**
 * Phân tích transcript không cần AI: so sánh từ khóa với đáp án tham khảo
 * và phát hiện bài nộp thiếu nội dung. Thuần TypeScript, dùng được ở cả client và server.
 */

// Hư từ tiếng Việt phổ biến; không mang nội dung chuyên môn nên bỏ khi trích từ khóa.
const STOPWORDS = new Set([
  'là', 'và', 'của', 'có', 'các', 'những', 'được', 'cho', 'với', 'trong', 'khi', 'thì', 'mà',
  'này', 'đó', 'kia', 'một', 'hai', 'ba', 'để', 'từ', 'theo', 'như', 'nếu', 'vì', 'do', 'bởi',
  'nên', 'cũng', 'đã', 'đang', 'sẽ', 'rất', 'nhiều', 'ít', 'hơn', 'nhất', 'không', 'chưa',
  'ra', 'vào', 'lên', 'xuống', 'trên', 'dưới', 'sau', 'trước', 'giữa', 'tại', 'về', 'qua',
  'hay', 'hoặc', 'nhưng', 'tuy', 'vậy', 'thế', 'gì', 'nào', 'ai', 'đâu', 'sao', 'bao',
  'ta', 'tôi', 'em', 'chúng', 'bạn', 'họ', 'nó', 'mình', 'thầy', 'cô', 'ạ', 'à', 'ừ', 'ờ',
  'cái', 'việc', 'sự', 'điều', 'người', 'mỗi', 'mọi', 'tất', 'cả', 'chỉ',
  'còn', 'lại', 'đến', 'bị', 'phải', 'cần', 'nhau', 'ở', 'đây', 'ấy', 'vẫn', 'luôn',
  // Động từ khung câu rất phổ biến, hiếm khi là thuật ngữ cần kiểm tra.
  'dùng', 'sử', 'chọn', 'thành', 'gồm', 'bằng', 'lấy', 'làm', 'gọi', 'giúp', 'nhằm', 'xảy',
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'is', 'are', 'be', 'for', 'with',
]);

// Từ đệm khi nói, dùng để phát hiện câu trả lời chủ yếu là ậm ừ.
const FILLERS = new Set(['à', 'ừ', 'ờ', 'ừm', 'ơ', 'hmm', 'um', 'uh', 'ạ', 'thì', 'là', 'kiểu', 'nói', 'chung']);

export const MIN_ANSWER_WORDS = 15;
const MAX_KEYWORDS = 12;

export type KeywordComparison = {
  keywords: string[];
  matched: string[];
  missing: string[];
  /** Tỉ lệ từ khóa đáp án xuất hiện trong transcript, 0..1. Null khi không có đáp án tham khảo. */
  coverage: number | null;
};

export type ContentWarning = {
  code: 'empty' | 'too_short' | 'mostly_filler' | 'low_keyword_coverage' | 'too_short_audio';
  message: string;
};

export type AnswerAnalysis = KeywordComparison & {
  wordCount: number;
  warnings: ContentWarning[];
  isThin: boolean;
};

function tokenize(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Bỏ dấu tiếng Việt để chịu lỗi nhận dạng giọng nói (ví dụ "phân hoạch" ↔ "phan hoach"). */
function foldDiacritics(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

const isContentToken = (token: string) => !STOPWORDS.has(token) && (token.length > 1 || /\d/.test(token));

/** Thuật ngữ Latin/số (vd. "pivot", "quicksort", "http2") — không dấu tiếng Việt. */
const isTechnicalToken = (token: string) => /^[a-z0-9]+$/.test(token) && /[a-z]/.test(token) && token.length >= 3;

/**
 * Trích từ khóa từ đáp án tham khảo. Đáp án được tách theo dấu câu thành mệnh đề, trong mỗi
 * mệnh đề lấy các chuỗi âm tiết nội dung liên tiếp (bỏ hư từ) rồi ghép thành cụm 2 âm tiết
 * không chồng lấn — vì từ tiếng Việt phần lớn là từ ghép 2 âm tiết. Thuật ngữ Latin luôn được giữ riêng.
 */
export function extractKeywords(reference: string, limit = MAX_KEYWORDS): string[] {
  const counts = new Map<string, { count: number; first: number }>();
  let order = 0;
  const add = (phrase: string) => {
    const entry = counts.get(phrase);
    if (entry) entry.count += 1;
    else counts.set(phrase, { count: 1, first: order++ });
  };

  for (const clause of reference.split(/[.,;:!?()[\]{}"“”\n\r–-]+/)) {
    let run: string[] = [];
    const flush = () => {
      // Thuật ngữ Latin đứng riêng; phần còn lại ghép cặp không chồng lấn.
      const syllables = run.filter((token) => {
        if (isTechnicalToken(token)) { add(token); return false; }
        return true;
      });
      for (let index = 0; index < syllables.length; index += 2) {
        const pair = syllables.slice(index, index + 2);
        if (pair.length === 2) add(pair.join(' '));
        else if (pair[0].length >= 4) add(pair[0]);
      }
      run = [];
    };
    for (const token of tokenize(clause)) {
      if (isContentToken(token)) run.push(token);
      else flush();
    }
    flush();
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

export function compareKeywords(transcript: string, reference: string | null | undefined): KeywordComparison {
  if (!reference?.trim()) return { keywords: [], matched: [], missing: [], coverage: null };
  const keywords = extractKeywords(reference);
  if (keywords.length === 0) return { keywords: [], matched: [], missing: [], coverage: null };

  const spoken = ` ${tokenize(transcript).join(' ')} `;
  const spokenFolded = foldDiacritics(spoken);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const keyword of keywords) {
    const hit = spoken.includes(` ${keyword} `) || spokenFolded.includes(` ${foldDiacritics(keyword)} `);
    (hit ? matched : missing).push(keyword);
  }
  return { keywords, matched, missing, coverage: matched.length / keywords.length };
}

/** Kết hợp so sánh từ khóa và các dấu hiệu bài nộp thiếu nội dung. */
export function analyzeAnswer(
  transcript: string | null | undefined,
  reference?: string | null,
  audioDurationSeconds?: number | null,
): AnswerAnalysis {
  const text = transcript?.trim() ?? '';
  const words = tokenize(text);
  const comparison = compareKeywords(text, reference);
  const warnings: ContentWarning[] = [];

  if (words.length === 0) {
    warnings.push({ code: 'empty', message: 'Transcript trống — có thể micro không thu được tiếng hoặc sinh viên không trả lời.' });
  } else {
    if (words.length < MIN_ANSWER_WORDS) {
      warnings.push({ code: 'too_short', message: `Câu trả lời rất ngắn (${words.length} từ, khuyến nghị tối thiểu ${MIN_ANSWER_WORDS} từ).` });
    }
    const fillerCount = words.filter((word) => FILLERS.has(word)).length;
    if (words.length >= 4 && fillerCount / words.length > 0.4) {
      warnings.push({ code: 'mostly_filler', message: 'Phần lớn transcript là từ đệm (à, ừ, ờ…), ít nội dung chuyên môn.' });
    }
    if (comparison.coverage !== null && comparison.coverage < 0.25) {
      warnings.push({ code: 'low_keyword_coverage', message: `Chỉ khớp ${comparison.matched.length}/${comparison.keywords.length} từ khóa của đáp án tham khảo.` });
    }
  }
  if (audioDurationSeconds != null && audioDurationSeconds > 0 && audioDurationSeconds < 5) {
    warnings.push({ code: 'too_short_audio', message: `Bản ghi chỉ dài ${audioDurationSeconds} giây.` });
  }

  return { ...comparison, wordCount: words.length, warnings, isThin: warnings.length > 0 };
}
