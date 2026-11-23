"""Hợp đồng /api/grade. Trường cũ giữ nguyên tên và kiểu; trường mới đều tùy chọn để client cũ chạy tiếp."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class RubricCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    text: str
    max_points: float
    # Ý cần có do giảng viên ghi sau "=>" trong barem (migration 008). Rỗng = engine tự lấy từ đáp án.
    expected_content: str = ""


class GradeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str
    reference_answer: str
    max_score: float
    transcript: str
    criteria: list[RubricCriterion]
    # Barem chung của giảng viên. Engine local không hiểu ghi chú tự do; chỉ giữ để tương thích.
    grading_notes: str = ""
    transcript_confidence: Optional[float] = Field(default=None, ge=0, le=1)
    # Mức sinh viên sửa transcript so với bản nhận dạng gốc (0 = không sửa, 1 = viết lại hoàn toàn).
    edit_ratio: Optional[float] = Field(default=None, ge=0, le=1)
    # Cho phép nhận xét nêu nội dung đáp án/tiêu chí (khi giảng viên bật xem đáp án).
    reveal_reference: bool = False


class CriterionGrade(BaseModel):
    model_config = ConfigDict(extra="forbid")

    criterion_id: str
    awarded_points: float
    assessment: Literal["correct", "partial", "incorrect", "missing"]
    evidence_excerpt: str
    explanation: str


class GradeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    criteria: list[CriterionGrade]
    suggested_score: float
    feedback_summary: str
    needs_teacher_review: bool
    engine: str = ""
    # Chi tiết cho giảng viên và hiệu chỉnh: từng ý, mức khớp, cờ cảnh báo. Chứa nội dung đáp án — không trả cho sinh viên.
    analysis: dict[str, Any] = Field(default_factory=dict)
