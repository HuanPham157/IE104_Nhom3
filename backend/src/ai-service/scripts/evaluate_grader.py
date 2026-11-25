"""Đánh giá và hiệu chỉnh engine chấm điểm trên bộ dữ liệu có điểm kỳ vọng.

Chạy từ thư mục backend/src/ai-service:
    python -m scripts.evaluate_grader                                  # đánh giá model mặc định
    python -m scripts.evaluate_grader --models a/b c/d --calibrate     # so model, dò ngưỡng trên tập calib
    python -m scripts.evaluate_grader --cases                          # in từng bài

Sai số được quy về thang 10 điểm để so với mục tiêu: MAE ≤ 1,5 và ≥ 70% bài lệch ≤ 1 điểm.
"""

from __future__ import annotations

import argparse
import itertools
import json
import statistics
from dataclasses import replace
from pathlib import Path

import numpy as np

from app.assessment.config import load_config
from app.assessment.embeddings import Embedder
from app.assessment.engine import grade
from app.assessment.schemas import GradeRequest

FIXTURES = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "vi_grading_cases.json"


def load_cases(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    cases = []
    for question in data["questions"]:
        for answer in question["answers"]:
            cases.append({
                "id": f"{question['id']}/{answer['id']}",
                "kind": answer["id"],
                "split": question["split"],
                "expected": answer["expected_score"],
                "max_score": question["max_score"],
                "request": GradeRequest(
                    question=question["question"],
                    reference_answer=question["reference_answer"],
                    max_score=question["max_score"],
                    transcript=answer["transcript"],
                    criteria=question["criteria"],
                ),
            })
    return cases


def run(cases: list[dict], config, embedder) -> list[dict]:
    rows = []
    for case in cases:
        result = grade(case["request"], config, embedder)
        scale = 10 / case["max_score"]
        rows.append({**case, "score": result.suggested_score, "error10": abs(result.suggested_score - case["expected"]) * scale,
                     "review": result.needs_teacher_review, "result": result})
    return rows


def metrics(rows: list[dict]) -> dict:
    if not rows:
        return {}
    errors = [row["error10"] for row in rows]
    expected = [row["expected"] for row in rows]
    scores = [row["score"] for row in rows]
    # numpy thay cho statistics.correlation (chỉ có từ Python 3.10).
    correlation = float(np.corrcoef(expected, scores)[0, 1]) if len(set(scores)) > 1 else 0.0
    # Bài AI tự chấm (không đưa giảng viên duyệt): sai số ở đây là sai số sinh viên thực sự gặp nếu giảng viên không xem lại.
    auto = [row["error10"] for row in rows if not row["review"]]
    return {
        "n": len(rows),
        "mae10": round(statistics.mean(errors), 2),
        "within1": round(sum(error <= 1.0 for error in errors) / len(rows), 2),
        "pearson": round(correlation, 2),
        "review_rate": round(sum(row["review"] for row in rows) / len(rows), 2),
        "auto_mae10": round(statistics.mean(auto), 2) if auto else None,
        "auto_within1": round(sum(error <= 1.0 for error in auto) / len(auto), 2) if auto else None,
    }


def by_kind(rows: list[dict]) -> dict:
    kinds = sorted({row["kind"] for row in rows})
    return {kind: metrics([row for row in rows if row["kind"] == kind]) for kind in kinds}


def calibrate(cases: list[dict], base, embedder):
    calib = [case for case in cases if case["split"] == "calib"]
    best = None
    for low, high, weight in itertools.product(
        [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45], [0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8], [0.5, 0.6, 0.7, 0.8, 0.9],
    ):
        if high <= low + 0.1:
            continue
        config = replace(base, sim_low=low, sim_high=high, semantic_weight=weight)
        result = metrics(run(calib, config, embedder))
        key = (result["mae10"], -result["within1"])
        if best is None or key < best[0]:
            best = (key, config, result)
    return best[1], best[2]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="*", default=[None])
    parser.add_argument("--calibrate", action="store_true")
    parser.add_argument("--cases", action="store_true")
    parser.add_argument("--fixtures", type=Path, default=FIXTURES)
    args = parser.parse_args()

    cases = load_cases(args.fixtures)
    for model in args.models:
        config = load_config(model)
        embedder = Embedder(config)
        if args.calibrate:
            config, calib_metrics = calibrate(cases, config, embedder)
            print(f"\n=== {config.embedding_model} — ngưỡng tốt nhất trên calib: low={config.sim_low} high={config.sim_high} "
                  f"w={config.semantic_weight} → {calib_metrics}")
        else:
            print(f"\n=== {config.embedding_model} (low={config.sim_low} high={config.sim_high} w={config.semantic_weight})")
        rows = run(cases, config, embedder)
        for split in ("calib", "test"):
            print(f"  {split:5s}: {metrics([row for row in rows if row['split'] == split])}")
        print("  theo loại câu trả lời (cả hai tập):")
        for kind, values in by_kind(rows).items():
            print(f"    {kind:9s} {values}")
        if args.cases:
            for row in rows:
                print(f"    {row['id']:24s} kỳ vọng={row['expected']:<4} engine={row['score']:<5} "
                      f"review={'Y' if row['review'] else '-'} flags={row['result'].analysis['flags']}")


if __name__ == "__main__":
    main()
