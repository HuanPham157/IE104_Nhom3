"""So khớp ngữ nghĩa giữa các ý cần có và câu trả lời."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from app.assessment.embeddings import Embedder

# Một ý có thể trải trên 2 mệnh đề liền kề ("TCP phải kết nối trước, có bắt tay ba bước").
MAX_WINDOW_CLAUSES = 2


@dataclass
class PointMatch:
    cosine: float
    # Mệnh đề đơn khớp nhất — dùng làm dẫn chứng và để kiểm tra mâu thuẫn.
    evidence: str
    evidence_cosine: float
    evidence_index: int = -1


def calibrate(cosine: float, low: float, high: float) -> float:
    """Đưa cosine thô (thang khác nhau tùy model) về 0..1 bằng hai ngưỡng đã hiệu chỉnh."""
    if high <= low:
        return 1.0 if cosine >= high else 0.0
    return float(min(1.0, max(0.0, (cosine - low) / (high - low))))


def _windows(clauses: list[str]) -> list[tuple[str, int, int]]:
    windows = []
    for start in range(len(clauses)):
        for size in range(1, MAX_WINDOW_CLAUSES + 1):
            if start + size <= len(clauses):
                windows.append((", ".join(clauses[start:start + size]), start, start + size))
    return windows


def match_points(
    points: list[str],
    clauses: list[str],
    embedder: Embedder,
    allowed: Optional[list[list[bool]]] = None,
) -> list[PointMatch]:
    """Với mỗi ý: cosine lớn nhất trên các cửa sổ mệnh đề được phép, kèm mệnh đề dẫn chứng.

    `allowed[i][j]`: mệnh đề j có được dùng cho ý i không (ví dụ chỉ mệnh đề nói về đúng đối tượng).
    """
    if not points:
        return []
    if not clauses:
        return [PointMatch(0.0, "", 0.0) for _ in points]
    windows = _windows(clauses)
    point_vectors = embedder.encode(points)
    window_scores = point_vectors @ embedder.encode([text for text, _, _ in windows]).T
    clause_scores = point_vectors @ embedder.encode(clauses).T

    matches = []
    for index in range(len(points)):
        permitted = allowed[index] if allowed else [True] * len(clauses)
        candidates = [
            position for position, (_, start, end) in enumerate(windows)
            if all(permitted[start:end])
        ]
        if not candidates:
            matches.append(PointMatch(0.0, "", 0.0))
            continue
        best = max(candidates, key=lambda position: window_scores[index][position])
        _, start, end = windows[best]
        evidence_index = start + int(np.argmax(clause_scores[index][start:end]))
        matches.append(PointMatch(
            cosine=float(window_scores[index][best]),
            evidence=clauses[evidence_index],
            evidence_cosine=float(clause_scores[index][evidence_index]),
            evidence_index=evidence_index,
        ))
    return matches


def similarity_matrix(left: list[str], right: list[str], embedder: Embedder) -> np.ndarray:
    if not left or not right:
        return np.zeros((len(left), len(right)), dtype=np.float32)
    return embedder.encode(left) @ embedder.encode(right).T
