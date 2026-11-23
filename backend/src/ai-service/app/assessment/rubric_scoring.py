"""Chấm theo rubric: xác định ý cần có của từng tiêu chí, so khớp với câu trả lời, quy ra điểm."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from app.assessment.answer_analysis import PointAnalysis, Subjects, analyse_point, find_subjects, lexical_coverage
from app.assessment.config import GraderConfig
from app.assessment.embeddings import Embedder
from app.assessment.schemas import GradeRequest, RubricCriterion
from app.assessment.similarity import match_points, similarity_matrix
from app.assessment.text_processing import split_clauses, split_point_clauses, split_points, strip_frame

# Trong expected_content: ";" (hoặc xuống dòng) ngăn các ý PHẢI có; "|" ngăn các cách trả lời thay thế cho một ý.
ALTERNATIVE_SEPARATOR = "|"
# Ý tự tách từ đáp án (không do giảng viên chọn): đáp án viết dài hơn câu trả lời nói, nên chỉ tính
# phần các ý khớp tốt nhất. Ý giảng viên ghi sau "=>" thì phải đủ hết.
REFERENCE_POINT_SHARE = 2 / 3
# Gán vế đáp án cho tiêu chí: cùng đối tượng được hỏi là tín hiệu mạnh nhất, rồi đến trùng từ khóa với câu tiêu chí.
SUBJECT_BONUS = 0.5
# Vế nói về một đối tượng nhưng tiêu chí không nêu đối tượng nào (ví dụ "vấn đề đồng bộ") → trừ nhẹ.
GENERIC_LABEL_PENALTY = 0.15
LABEL_OVERLAP_WEIGHT = 0.3


@dataclass
class TargetPoint:
    text: str
    subject: Optional[str]


@dataclass
class CriterionTarget:
    criterion: Optional[RubricCriterion]
    # Mỗi nhóm là một ý cần có; các phần tử trong nhóm là cách diễn đạt thay thế (lấy mức khớp cao nhất).
    groups: list[list[TargetPoint]]
    source: str  # "expected" | "reference" | "criterion" | "none"


@dataclass
class CriterionResult:
    criterion: Optional[RubricCriterion]
    position: int
    max_points: float
    coverage: float
    awarded: float
    assessment: str
    points: list[PointAnalysis] = field(default_factory=list)
    source: str = ""

    @property
    def missing_points(self) -> list[PointAnalysis]:
        return [point for point in self.points if not point.conflict and point.coverage < 0.5]

    @property
    def conflicts(self) -> list[PointAnalysis]:
        return [point for point in self.points if point.conflict]

    @property
    def evidence(self) -> str:
        best = max(self.points, key=lambda point: point.coverage, default=None)
        return best.evidence if best else ""


def _expected_groups(criterion: RubricCriterion, subjects: Subjects) -> list[list[TargetPoint]]:
    fallback_subject = subjects.of(criterion.text)
    groups = []
    for point in split_points(criterion.expected_content):
        alternatives = [part.strip() for part in point.split(ALTERNATIVE_SEPARATOR) if part.strip()]
        if alternatives:
            groups.append([TargetPoint(text, subjects.of(text) or fallback_subject) for text in alternatives])
    return groups


def build_targets(request: GradeRequest, subjects: Subjects, embedder: Embedder) -> list[CriterionTarget]:
    reference = [
        TargetPoint(clause, subjects.of(clause) or subjects.of(sentence))
        for sentence in split_points(request.reference_answer)
        for clause in split_point_clauses(sentence)
    ]
    if not request.criteria:
        return [CriterionTarget(None, [[point] for point in reference], "reference" if reference else "none")]

    targets = {}
    for criterion in request.criteria:
        groups = _expected_groups(criterion, subjects)
        if groups:
            targets[criterion.id] = CriterionTarget(criterion, groups, "expected")
    open_criteria = [criterion for criterion in request.criteria if criterion.id not in targets]
    assigned: dict[str, list[list[TargetPoint]]] = {criterion.id: [] for criterion in open_criteria}
    if open_criteria and reference:
        labels = [strip_frame(criterion.text) for criterion in open_criteria]
        label_subjects = [subjects.of(criterion.text) for criterion in open_criteria]
        semantic = similarity_matrix([point.text for point in reference], labels, embedder)
        for row, point in enumerate(reference):
            scores = []
            for column, label in enumerate(labels):
                score = float(semantic[row][column]) + LABEL_OVERLAP_WEIGHT * lexical_coverage(label, point.text)
                if point.subject and label_subjects[column]:
                    score += SUBJECT_BONUS if point.subject == label_subjects[column] else -SUBJECT_BONUS
                elif point.subject:
                    score -= GENERIC_LABEL_PENALTY
                scores.append(score)
            assigned[open_criteria[scores.index(max(scores))].id].append([point])
    for criterion in open_criteria:
        groups = assigned[criterion.id]
        targets[criterion.id] = (
            CriterionTarget(criterion, groups, "reference") if groups
            else CriterionTarget(criterion, [[TargetPoint(strip_frame(criterion.text), subjects.of(criterion.text))]], "criterion")
        )
    return [targets[criterion.id] for criterion in request.criteria]


def clause_subjects(clauses: list[str], subjects: Subjects) -> list[Optional[str]]:
    """Đối tượng mỗi mệnh đề đang nói tới; mệnh đề không nêu tên kế thừa đối tượng của mệnh đề trước."""
    current = None
    result = []
    for clause in clauses:
        current = subjects.of(clause) or current
        result.append(current)
    return result


def _round_quarter(value: float) -> float:
    return math.floor(value * 4 + 0.5) / 4


def _assessment(coverage: float, has_conflict: bool, config: GraderConfig) -> str:
    if has_conflict and coverage < config.correct_threshold:
        return "incorrect"
    if coverage >= config.correct_threshold:
        return "correct"
    if coverage >= config.partial_threshold:
        return "partial"
    return "missing"


def _criterion_coverage(points: list[PointAnalysis], source: str) -> float:
    if not points:
        return 0.0
    values = sorted((point.coverage for point in points), reverse=True)
    if source == "reference":
        values = values[:max(1, math.ceil(len(values) * REFERENCE_POINT_SHARE))]
    return sum(values) / len(values)


def score_criteria(request: GradeRequest, embedder: Embedder, config: GraderConfig) -> list[CriterionResult]:
    subjects = find_subjects(request)
    targets = build_targets(request, subjects, embedder)
    clauses = split_clauses(request.transcript)
    # So khớp trên bản đã quy bí danh; dẫn chứng trả về vẫn là lời gốc của sinh viên.
    canonical = [subjects.canonical(clause) for clause in clauses]
    owners = clause_subjects(canonical, subjects)

    flat = [point for target in targets for group in target.groups for point in group]
    # Ý về đối tượng A chỉ so với mệnh đề nói về A (hoặc chưa nêu đối tượng nào).
    allowed = [[point.subject is None or owner in (None, point.subject) for owner in owners] for point in flat]
    matches = match_points([point.text for point in flat], canonical, embedder, allowed)
    analyses = {}
    for point, permitted, match in zip(flat, allowed, matches):
        scope = ", ".join(clause for clause, ok in zip(canonical, permitted) if ok)
        analysis = analyse_point(point.text, match, scope, config)
        if analysis.evidence and match.evidence_index >= 0:
            analysis.evidence = clauses[match.evidence_index]
        analyses[id(point)] = analysis

    results = []
    for position, target in enumerate(targets, start=1):
        max_points = target.criterion.max_points if target.criterion else request.max_score
        points = [max((analyses[id(point)] for point in group), key=lambda analysis: analysis.coverage) for group in target.groups]
        coverage = _criterion_coverage(points, target.source)
        results.append(CriterionResult(
            criterion=target.criterion,
            position=position,
            max_points=max_points,
            coverage=coverage,
            awarded=min(max_points, max(0.0, _round_quarter(max_points * coverage))),
            assessment=_assessment(coverage, any(point.conflict for point in points), config),
            points=points,
            source=target.source,
        ))
    return results
