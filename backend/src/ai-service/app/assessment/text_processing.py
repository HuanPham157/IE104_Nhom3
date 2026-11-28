"""Tiền xử lý văn bản tiếng Việt cho engine chấm điểm: chuẩn hóa, tách mệnh đề, token, phủ định, từ trái nghĩa."""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from functools import lru_cache

# Hư từ chỉ mang chức năng ngữ pháp. Cố ý KHÔNG chứa các từ chỉ thứ tự/hướng (trước, sau, đầu, cuối…)
# vì chúng thường là nội dung then chốt của đáp án ("vào sau ra trước").
STOPWORDS = frozenset({
    "là", "và", "của", "có", "các", "những", "được", "cho", "với", "trong", "khi", "thì", "mà",
    "này", "đó", "kia", "một", "để", "từ", "theo", "như", "nếu", "vì", "do", "bởi", "nên", "cũng",
    "đã", "đang", "sẽ", "rất", "hay", "hoặc", "nhưng", "tuy", "vậy", "thế", "gì", "nào", "ta", "tôi",
    "em", "chúng", "bạn", "họ", "nó", "mình", "thầy", "cô", "cái", "việc", "sự", "điều", "mỗi", "mọi",
    "tất", "cả", "chỉ", "còn", "lại", "bị", "phải", "cần", "nhau", "ở", "đây", "ấy", "vẫn", "luôn",
    "ví", "dụ", "gọi", "tức", "nghĩa", "rồi", "luôn", "thôi", "nha", "nhé",
    "the", "a", "an", "of", "to", "in", "on", "and", "or", "is", "are", "be", "for", "with",
})
# Từ đệm khi nói; bỏ trước khi so khớp. Chỉ gồm từ vô nghĩa — "chung", "kiểu" có thể là nội dung.
FILLERS = frozenset({"à", "ừ", "ờ", "ừm", "ơ", "hmm", "um", "uh", "ạ", "dạ", "vâng"})
NEGATIONS = frozenset({"không", "chẳng", "chả", "chưa"})
# Cụm nhiều từ được gộp về một token để so khớp và phát hiện trái nghĩa.
# Thứ tự quan trọng: cụm dài thay trước ("bất đồng bộ" trước "đồng bộ").
PHRASES = {
    "bất đồng bộ": "bất_đồng_bộ", "đồng bộ": "đồng_bộ", "máy chủ": "server", "máy khách": "client",
    "người dùng": "client", "trình duyệt": "client",
}
# Cặp trái nghĩa: đáp án có từ A, câu trả lời thay bằng từ B (và không có A) ⇒ mâu thuẫn.
_ANTONYM_PAIRS = [
    ("trước", "sau"), ("đầu", "cuối"), ("trái", "phải"), ("riêng", "chung"), ("nhanh", "chậm"),
    ("tăng", "giảm"), ("lớn", "nhỏ"), ("đúng", "sai"), ("client", "server"), ("trong", "ngoài"),
    ("thêm", "xóa"), ("đồng_bộ", "bất_đồng_bộ"), ("public", "private"), ("tĩnh", "động"),
]
ANTONYMS: dict[str, set[str]] = {}
for _a, _b in _ANTONYM_PAIRS:
    ANTONYMS.setdefault(_a, set()).add(_b)
    ANTONYMS.setdefault(_b, set()).add(_a)

_TOKEN_RE = re.compile(r"[^\W_]+(?:_[^\W_]+)*", re.UNICODE)
_CLAUSE_SPLIT_RE = re.compile(r"[.!?;\n,]+|\s+(?:còn|nhưng|tuy nhiên)\s+", re.IGNORECASE)
_POINT_SPLIT_RE = re.compile(r"[.!?;\n]+|^\s*[-•*]\s*", re.MULTILINE)
# Động từ khung của câu tiêu chí ("Nêu đúng định nghĩa…") — không phải nội dung cần nghe thấy.
_FRAME_RE = re.compile(
    r"^\s*(nêu|trình bày|giải thích|cho|đưa ra|phân biệt|so sánh|mô tả|liệt kê|chỉ ra)\s+(được\s+|đúng\s+|đủ\s+|rõ\s+)*",
    re.IGNORECASE,
)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text or "")).strip()


def fold(text: str) -> str:
    """Bỏ dấu tiếng Việt để chịu lỗi nhận dạng giọng nói ("đỉng" ~ "đỉnh")."""
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn").replace("đ", "d").replace("Đ", "D")


def tokens(text: str) -> list[str]:
    """Token viết thường, gộp các cụm trong PHRASES, bỏ từ đệm."""
    lowered = normalize(text).lower()
    for phrase, replacement in PHRASES.items():
        lowered = lowered.replace(phrase, replacement)
    return [word for word in _TOKEN_RE.findall(lowered) if word not in FILLERS]


def content_tokens(text: str) -> list[str]:
    return [token for token in tokens(text) if token not in STOPWORDS]


def split_clauses(text: str) -> list[str]:
    """Tách câu trả lời thành mệnh đề (theo dấu câu và liên từ đối lập) để so khớp từng ý."""
    clauses = [normalize(part) for part in _CLAUSE_SPLIT_RE.split(normalize(text))]
    return [clause for clause in clauses if content_tokens(clause)]


def split_points(text: str) -> list[str]:
    """Tách đáp án / ý cần có thành các ý: theo câu, dấu chấm phẩy, gạch đầu dòng."""
    points = [normalize(part) for part in _POINT_SPLIT_RE.split(text or "")]
    return [point for point in points if content_tokens(point)]


def split_point_clauses(sentence: str) -> list[str]:
    """Tách một câu đáp án dài thành các vế (theo dấu phẩy); vế quá ngắn gộp vào vế trước."""
    parts = [normalize(part) for part in re.split(r",|\s+nhưng\s+", sentence)]
    merged: list[str] = []
    for part in parts:
        if not content_tokens(part):
            continue
        if merged and len(content_tokens(part)) < 3:
            merged[-1] = f"{merged[-1]}, {part}"
        else:
            merged.append(part)
    return merged or [normalize(sentence)]


def strip_frame(criterion_text: str) -> str:
    return normalize(_FRAME_RE.sub("", criterion_text)) or normalize(criterion_text)


def has_negation(text: str) -> bool:
    return any(token in NEGATIONS for token in tokens(text))


def antonym_conflict(key_point: str, clause: str) -> bool:
    """Câu trả lời thay một từ của đáp án bằng từ trái nghĩa ("vào sau ra trước" → "vào trước ra trước").

    Đếm số lần xuất hiện: từ trái nghĩa phải xuất hiện NHIỀU HƠN trong câu trả lời so với đáp án,
    để câu diễn đạt lại đúng nhưng thiếu một từ ("bỏ vào cuối cùng thì lấy ra trước") không bị coi là sai.
    """
    key = Counter(tokens(key_point))
    answer = Counter(tokens(clause))
    for first, second in ((key, answer), (answer, key)):
        for word in first:
            if word in second:
                continue
            if any(first[opposite] < second[opposite] for opposite in ANTONYMS.get(word, ())):
                return True
    return False


@lru_cache(maxsize=1)
def _segmenter():
    from pyvi import ViTokenizer  # nạp khi cần: chỉ model PhoBERT mới phải tách từ

    return ViTokenizer


def segment_words(text: str) -> str:
    """Tách từ cho PhoBERT ("học sinh" → "học_sinh")."""
    return _segmenter().tokenize(normalize(text).lower())


def word_units(text: str) -> list[str]:
    """Từ (đơn hoặc ghép) sau khi tách từ, kể cả dấu ngoặc — để phân biệt "tiến_trình" với "chương_trình"."""
    return [unit for unit in segment_words(text).split() if unit in "()" or _TOKEN_RE.fullmatch(unit)]
