"""Engine chấm điểm local: phân tích → so khớp ngữ nghĩa → chấm rubric → nhận xét. Không gọi API bên ngoài."""

from __future__ import annotations

from typing import Optional

from app.assessment.answer_analysis import answer_flags
from app.assessment.config import GraderConfig, load_config
from app.assessment.embeddings import Embedder, get_embedder
from app.assessment.feedback import criterion_explanation, summary
from app.assessment.rubric_scoring import CriterionResult, score_criteria
from app.assessment.schemas import CriterionGrade, GradeRequest, GradeResult

# Cờ khiến bài luôn được đưa cho giảng viên duyệt.
REVIEW_FLAGS = {
    "too_short", "mostly_filler", "off_topic", "low_asr_confidence", "heavily_edited", "no_reference", "empty",
    "weak_lexical_support",
}
# Mức khớp nằm sát ngưỡng phân loại thì không chắc chắn.
AMBIGUOUS_MARGIN = 0.08


def _has_targets(request: GradeRequest) -> bool:
    return bool(request.reference_answer.strip()) or any(
        criterion.text.strip() or criterion.expected_content.strip() for criterion in request.criteria
    )


def _is_ambiguous(result: CriterionResult, config: GraderConfig) -> bool:
    return any(abs(result.coverage - threshold) < AMBIGUOUS_MARGIN for threshold in (config.correct_threshold, config.partial_threshold))


def grade(request: GradeRequest, config: Optional[GraderConfig] = None, embedder: Optional[Embedder] = None) -> GradeResult:
    config = config or load_config()
    flags = answer_flags(request)
    if not _has_targets(request):
        flags.append("no_reference")
        results: list[CriterionResult] = [
            CriterionResult(criterion, position, criterion.max_points, 0.0, 0.0, "missing")
            for position, criterion in enumerate(request.criteria, start=1)
        ]
    else:
        results = score_criteria(request, embedder or get_embedder(config), config)

    max_total = sum(result.max_points for result in results) if request.criteria else request.max_score
    suggested = round(sum(result.awarded for result in results), 2) if results else 0.0
    if max_total and suggested / max_total < 0.1 and "too_short" not in flags and "no_reference" not in flags:
        flags.append("off_topic")

    credited = [point for result in results for point in result.points if point.coverage >= config.partial_threshold and not point.conflict]
    if credited and sum(point.lexical < config.weak_lexical_support for point in credited) * 2 > len(credited):
        flags.append("weak_lexical_support")

    ambiguous = sum(_is_ambiguous(result, config) for result in results)
    needs_review = (
        bool(REVIEW_FLAGS.intersection(flags))
        or any(result.conflicts for result in results)
        or (bool(results) and ambiguous * 2 > len(results))
    )

    criteria = [
        CriterionGrade(
            criterion_id=result.criterion.id,
            awarded_points=result.awarded,
            assessment=result.assessment,
            evidence_excerpt=result.evidence,
            explanation=criterion_explanation(result, request.reveal_reference),
        )
        for result in results if result.criterion
    ]
    return GradeResult(
        criteria=criteria,
        suggested_score=suggested,
        feedback_summary=summary(results, flags, suggested, request.max_score, request.reveal_reference),
        needs_teacher_review=needs_review,
        engine=config.engine_name,
        analysis={
            "engine": config.engine_name,
            "flags": flags,
            "thresholds": {"sim_low": config.sim_low, "sim_high": config.sim_high, "semantic_weight": config.semantic_weight},
            "criteria": [
                {
                    "criterion_id": result.criterion.id if result.criterion else None,
                    "source": result.source,
                    "coverage": round(result.coverage, 3),
                    "points": [point.to_dict() for point in result.points],
                }
                for result in results
            ],
        },
    )
