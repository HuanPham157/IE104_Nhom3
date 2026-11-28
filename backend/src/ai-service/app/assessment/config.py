"""Cấu hình engine chấm điểm: model embedding và các ngưỡng (đọc từ biến môi trường GRADER_*)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

ENGINE_VERSION = "local-grader-v1"
DEFAULT_EMBEDDING_MODEL = "keepitreal/vietnamese-sbert"

# Model dựa trên PhoBERT cần tách từ tiếng Việt trước khi encode.
_SEGMENTED_MODELS = ("phobert", "vietnamese-bi-encoder", "vietnamese-sbert", "simcse-vietnamese")

# (sim_low, sim_high, semantic_weight) cho từng model — từ `python -m scripts.evaluate_grader --calibrate`
# trên tập calib của tests/fixtures/vi_grading_cases.json (dữ liệu tổng hợp). Kết quả trên tập test:
#   keepitreal/vietnamese-sbert                  MAE 1,44/10 · lệch ≤1 điểm 58% · tương quan 0,86
#   bkai-foundation-models/vietnamese-bi-encoder MAE 1,69/10 · lệch ≤1 điểm 54% · tương quan 0,86
# Hiệu chỉnh lại khi có điểm giảng viên thật (grade_reviews).
MODEL_THRESHOLDS: dict[str, tuple[float, float, float]] = {
    "keepitreal/vietnamese-sbert": (0.35, 0.50, 0.9),
    "bkai-foundation-models/vietnamese-bi-encoder": (0.20, 0.50, 0.9),
}
_FALLBACK_THRESHOLDS = (0.30, 0.60, 0.8)


@dataclass(frozen=True)
class GraderConfig:
    embedding_model: str
    word_segmentation: bool
    device: str
    # Cosine ≤ sim_low → 0 điểm ngữ nghĩa; ≥ sim_high → 1; tuyến tính ở giữa.
    sim_low: float
    sim_high: float
    # coverage = w × ngữ nghĩa + (1 − w) × từ khóa. Ý ngắn (≤ 3 từ nội dung, ví dụ "O(log n)") dựa nhiều vào từ khóa hơn.
    semantic_weight: float = 0.9
    short_point_semantic_weight: float = 0.4
    correct_threshold: float = 0.75
    partial_threshold: float = 0.35
    # Mâu thuẫn (phủ định, trái nghĩa, nhầm đối tượng) → coverage tối đa bằng mức này.
    conflict_cap: float = 0.25
    # Cổng chống báo nhầm mâu thuẫn: mệnh đề phải nói về cùng nội dung với ý đó — hoặc trùng từ khóa
    # đủ nhiều, hoặc giống nghĩa rất cao (câu nói ngược thường giống nghĩa nhưng ít trùng từ).
    conflict_min_semantic: float = 0.5
    conflict_min_overlap: float = 0.25
    conflict_strong_semantic: float = 0.8
    # Ý được tính điểm mà gần như không trùng thuật ngữ → nghi ngờ "cùng chủ đề nhưng sai", cần giảng viên duyệt.
    weak_lexical_support: float = 0.2

    @property
    def engine_name(self) -> str:
        return f"{ENGINE_VERSION}+{self.embedding_model.split('/')[-1]}"


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    return float(value) if value else default


def load_config(embedding_model: Optional[str] = None) -> GraderConfig:
    """Cấu hình từ biến môi trường; `embedding_model` ghi đè model (dùng khi so sánh model)."""
    model = embedding_model or os.getenv("GRADER_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
    segmentation = os.getenv("GRADER_WORD_SEGMENTATION", "auto").lower()
    low, high, weight = MODEL_THRESHOLDS.get(model, _FALLBACK_THRESHOLDS)
    return GraderConfig(
        embedding_model=model,
        word_segmentation=(
            any(marker in model.lower() for marker in _SEGMENTED_MODELS) if segmentation == "auto" else segmentation == "true"
        ),
        device=os.getenv("GRADER_DEVICE", "cpu"),
        sim_low=_float_env("GRADER_SIM_LOW", low),
        sim_high=_float_env("GRADER_SIM_HIGH", high),
        semantic_weight=_float_env("GRADER_SEMANTIC_WEIGHT", weight),
    )
