"""Engine chấm điểm local (không gọi API AI bên ngoài): so khớp ngữ nghĩa, phân tích câu trả lời, chấm rubric, nhận xét."""

from .engine import grade as grade_answer
from .schemas import CriterionGrade, GradeRequest, GradeResult, RubricCriterion

__all__ = ["CriterionGrade", "GradeRequest", "GradeResult", "RubricCriterion", "grade_answer"]
