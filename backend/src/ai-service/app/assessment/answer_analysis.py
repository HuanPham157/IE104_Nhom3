"""Phân tích câu trả lời không cần model: độ phủ từ khóa, đối tượng được nhắc tới, mâu thuẫn, dấu hiệu transcript kém.

Thay cho phần chấm trong frontend/src/lib/answer-analysis.ts (bản TS chỉ còn để hiển thị bài chấm cũ).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from app.assessment.config import GraderConfig
from app.assessment.schemas import GradeRequest
from app.assessment.similarity import PointMatch, calibrate
from app.assessment.text_processing import (
    FILLERS,
    antonym_conflict,
    content_tokens,
    fold,
    has_negation,
    tokens,
    word_units,
)

MIN_ANSWER_WORDS = 8
LOW_ASR_CONFIDENCE = 0.6
HEAVY_EDIT_RATIO = 0.4
SHORT_POINT_TOKENS = 3


@dataclass
class PointAnalysis:
    text: str
    semantic: float
    lexical: float
    coverage: float
    evidence: str
    conflict: str  # "" | "negation" | "antonym"

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "semantic": round(self.semantic, 3),
            "lexical": round(self.lexical, 3),
            "coverage": round(self.coverage, 3),
            "evidence": self.evidence,
            "conflict": self.conflict,
        }


@dataclass
class Subjects:
    """Các đối tượng được hỏi trong câu so sánh/phân biệt (TCP/UDP, 404/500, tiến trình/luồng)."""

    terms: set[str] = field(default_factory=set)
    # Thuật ngữ trong ngoặc của câu hỏi → từ đứng trước ("process" → "tiến_trình").
    aliases: dict[str, str] = field(default_factory=dict)

    def canonical(self, text: str) -> str:
        """Thay bí danh bằng thuật ngữ của đáp án ("Thread thì nằm trong process" → "luồng thì nằm trong tiến trình")."""
        for alias, term in self.aliases.items():
            text = re.sub(rf"(?<!\w){re.escape(alias)}(?!\w)", term.replace("_", " "), text, flags=re.IGNORECASE)
        return text

    def of(self, text: str) -> Optional[str]:
        """Đối tượng được nhắc đầu tiên trong đoạn văn, nếu có."""
        if not self.terms:
            return None
        for unit in word_units(text):
            unit = self.aliases.get(unit, unit)
            if unit in self.terms:
                return unit
        return None


COMPARISON_CUES = {"so_sánh", "phân_biệt", "khác_nhau", "khác_biệt", "giống_nhau"}
CONJUNCTIONS = {"và", "với"}


def find_subjects(request: GradeRequest) -> Subjects:
    """Đối tượng của câu hỏi so sánh: hai vế quanh "và"/"với" ("So sánh TCP và UDP" → tcp, udp).

    Câu hỏi không có từ so sánh thì không tách đối tượng (mọi ý so với cả câu trả lời).
    """
    question = word_units(request.question)
    if not COMPARISON_CUES.intersection(question):
        return Subjects()
    aliases = {
        question[index + 1]: question[index - 1]
        for index in range(1, len(question) - 2)
        if question[index] == "(" and question[index + 2] == ")"
    }
    # Bỏ phần trong ngoặc để tìm từ đứng sát "và": "tiến_trình ( process ) và luồng" → tiến_trình, luồng.
    plain = []
    skipping = False
    for unit in question:
        if unit == "(":
            skipping = True
        elif unit == ")":
            skipping = False
        elif not skipping:
            plain.append(unit)
    reference = set(word_units(request.reference_answer))
    terms = set()
    for index, unit in enumerate(plain):
        if unit in CONJUNCTIONS and 0 < index < len(plain) - 1:
            terms.update(term for term in (plain[index - 1], plain[index + 1]) if term in reference)
    if len(terms) < 2:
        return Subjects()
    return Subjects(terms, {alias: term for alias, term in aliases.items() if term in terms})


def _edit_distance_at_most_one(left: str, right: str) -> bool:
    if abs(len(left) - len(right)) > 1:
        return False
    if len(left) > len(right):
        left, right = right, left
    index = 0
    while index < len(left) and left[index] == right[index]:
        index += 1
    return left[index:] == right[index + 1:] or left[index + 1:] == right[index + 1:]


def _token_found(token: str, answer_folded: set[str]) -> bool:
    folded = fold(token)
    if folded in answer_folded:
        return True
    # Lỗi nhận dạng một ký tự ở từ dài ("enqueue" ~ "enqueu").
    return len(folded) >= 5 and any(_edit_distance_at_most_one(folded, other) for other in answer_folded)


def lexical_coverage(point: str, answer: str) -> float:
    """Tỉ lệ từ nội dung của ý có trong câu trả lời (chịu lỗi dấu), kết hợp cặp từ liền kề để giữ thứ tự.

    Cặp từ chỉ ghép trong cùng một cụm của ý — không ghép qua dấu ngoặc/chấm phẩy ("hoàn tác (undo)").
    """
    point_tokens = content_tokens(point)
    if not point_tokens:
        return 0.0
    answer_folded = {fold(token) for token in tokens(answer)}
    unigram = sum(_token_found(token, answer_folded) for token in point_tokens) / len(point_tokens)
    runs = [[fold(token) for token in content_tokens(run)] for run in re.split(r"[(),;:/]", point)]
    point_bigrams = [pair for run in runs for pair in zip(run, run[1:])]
    if not point_bigrams:
        return unigram
    # Cặp liền kề hoặc cách nhau một từ: chịu được hư từ xen giữa kể cả khi transcript mất dấu
    # ("tu o dinh" vẫn có cặp "tu dinh"; không lọc hư từ trên bản bỏ dấu vì "tử" và "từ" trùng nhau).
    folded = [fold(token) for token in tokens(answer)]
    answer_bigrams = set(zip(folded, folded[1:])) | set(zip(folded, folded[2:]))
    bigram = sum(pair in answer_bigrams for pair in point_bigrams) / len(point_bigrams)
    return 0.5 * unigram + 0.5 * bigram


def _detect_conflict(point: str, evidence: str, evidence_semantic: float, config: GraderConfig) -> str:
    """Mệnh đề nói về cùng nội dung với ý nhưng đảo phủ định hoặc dùng từ trái nghĩa."""
    if not evidence or evidence_semantic < config.conflict_min_semantic:
        return ""
    if evidence_semantic < config.conflict_strong_semantic and lexical_coverage(point, evidence) < config.conflict_min_overlap:
        return ""
    if has_negation(point) != has_negation(evidence):
        return "negation"
    if antonym_conflict(point, evidence):
        return "antonym"
    return ""


def analyse_point(point: str, match: PointMatch, scope: str, config: GraderConfig) -> PointAnalysis:
    """`scope`: phần câu trả lời nói về cùng đối tượng với ý (cả câu trả lời nếu không phải câu so sánh)."""
    semantic = calibrate(match.cosine, config.sim_low, config.sim_high)
    lexical = lexical_coverage(point, scope)
    if len(content_tokens(point)) <= SHORT_POINT_TOKENS:
        # Ý ngắn ("O(log n)", "LIFO"): model kém ổn định với cụm ngắn, nói đủ từ khóa là đủ bằng chứng.
        coverage = max(config.short_point_semantic_weight * semantic + (1 - config.short_point_semantic_weight) * lexical, lexical)
    else:
        coverage = config.semantic_weight * semantic + (1 - config.semantic_weight) * lexical
    conflict = _detect_conflict(point, match.evidence, calibrate(match.evidence_cosine, config.sim_low, config.sim_high), config)
    if conflict:
        coverage = min(coverage, config.conflict_cap)
    return PointAnalysis(point, semantic, lexical, coverage, match.evidence if coverage >= config.partial_threshold or conflict else "", conflict)


def answer_flags(request: GradeRequest) -> list[str]:
    raw_words = request.transcript.split()
    flags = []
    if not tokens(request.transcript):
        flags.append("empty")
    if len(content_tokens(request.transcript)) < MIN_ANSWER_WORDS:
        flags.append("too_short")
    if len(raw_words) >= 4 and sum(word.lower().strip(".,!?") in FILLERS for word in raw_words) / len(raw_words) > 0.4:
        flags.append("mostly_filler")
    if request.transcript_confidence is not None and request.transcript_confidence < LOW_ASR_CONFIDENCE:
        flags.append("low_asr_confidence")
    if request.edit_ratio is not None and request.edit_ratio > HEAVY_EDIT_RATIO:
        flags.append("heavily_edited")
    return flags
