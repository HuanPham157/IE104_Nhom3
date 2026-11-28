from math import isclose, isfinite


def grade_reading(rubric: dict, alignment: dict, has_speech: bool, assessment: dict | None = None) -> dict:
    counts = alignment["counts"]
    rates = {
        "wer_accuracy": max(0, 1 - alignment["wer"]),
        "completion_rate": 1 - counts["deletions"] / counts["reference_tokens"],
    }
    if assessment:
        rates.update({method: value / 100 for method, value in assessment["scores"].items()})
    scores = {}
    for criterion in rubric["criteria"]:
        rate = rates.get(criterion["scoring_method"])
        if has_speech and rate is not None:
            scores[criterion["key"]] = rate * criterion["max_score"]

    result = calculate_rubric_score(rubric, scores)
    for criterion, row in zip(rubric["criteria"], result["criteria"]):
        if "max_points" in criterion:
            row["criterion_id"] = criterion["key"]
            row["max_points"] = criterion["max_points"]
            row["awarded_points"] = (
                round(row["score"] / row["max_score"] * row["max_points"], 2)
                if row["score"] is not None else None
            )
    review = result["total_score"] is None
    result["needs_teacher_review"] = review
    result["status"] = "needs_teacher_review" if review else "completed"
    suggestions = []
    if not has_speech:
        result["status"] = "no_speech"
        summary = "Chưa nhận diện được lời đọc."
        suggestions.append("Kiểm tra micro, nghe lại bản ghi và thu lại nếu cần.")
    elif alignment["errors"]:
        summary = (f"Bản nhận diện có {counts['deletions']} tiếng thiếu, "
                   f"{counts['insertions']} tiếng thêm và {counts['substitutions']} tiếng thay thế.")
        for error in alignment["errors"][:3]:
            token = error["reference_token"] or error["recognized_token"]
            suggestions.append(f"Nghe lại đoạn có tiếng “{token}” gần vị trí {error['position']} và đối chiếu với bài mẫu.")
    else:
        summary = "Bản nhận diện khớp với bài mẫu sau chuẩn hóa."
    result["feedback_summary"] = summary
    result["suggestions"] = suggestions
    return result


def calculate_rubric_score(
    rubric: dict,
    scores: dict[str, float | int | None],
) -> dict:
    criteria = rubric.get("criteria")

    if not isinstance(criteria, list) or not criteria:
        raise ValueError("Rubric must contain at least one criterion")

    seen_keys: set[str] = set()
    total_weight = 0.0
    results = []
    weighted_sum = 0.0
    available_weight = 0.0
    all_weighted_scores_available = True

    for criterion in criteria:
        key = criterion.get("key")
        name = criterion.get("name")
        weight = criterion.get("weight")
        max_score = criterion.get("max_score", 10)

        if not isinstance(key, str) or not key.strip():
            raise ValueError("Each criterion must have a non-empty key")

        if key in seen_keys:
            raise ValueError(f"Duplicate rubric criterion key: {key}")
        seen_keys.add(key)

        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"Criterion {key} must have a name")

        try:
            weight = float(weight)
            max_score = float(max_score)
        except (TypeError, ValueError) as error:
            raise ValueError(f"Invalid weight or max_score for {key}") from error

        if not isfinite(weight) or not 0 <= weight <= 100:
            raise ValueError(f"Weight for {key} must be between 0 and 100")

        if not isfinite(max_score) or max_score <= 0:
            raise ValueError(f"max_score for {key} must be greater than 0")

        total_weight += weight
        raw_score = scores.get(key)

        if raw_score is None:
            results.append({
                "key": key,
                "name": name,
                "score": None,
                "max_score": max_score,
                "weight": weight,
                "weighted_contribution": None,
                "status": "unavailable",
            })
            if weight > 0:
                all_weighted_scores_available = False
            continue

        try:
            score = float(raw_score)
        except (TypeError, ValueError) as error:
            raise ValueError(f"Score for {key} must be numeric") from error

        if not isfinite(score) or not 0 <= score <= max_score:
            raise ValueError(
                f"Score for {key} must be between 0 and {max_score}"
            )

        contribution = (score / max_score) * 10 * (weight / 100)
        weighted_sum += contribution
        available_weight += weight

        results.append({
            "key": key,
            "name": name,
            "score": score,
            "max_score": max_score,
            "weight": weight,
            "weighted_contribution": round(contribution, 4),
            "status": "scored",
        })

    if not isclose(total_weight, 100.0, abs_tol=0.001):
        raise ValueError(
            f"Rubric weights must total 100; got {total_weight:g}"
        )

    return {
        "total_score": (
            round(weighted_sum, 2)
            if all_weighted_scores_available
            else None
        ),
        "score_scale": 10,
        "available_weight": round(available_weight, 2),
        "criteria": results,
    }
