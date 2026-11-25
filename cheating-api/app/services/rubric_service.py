from copy import deepcopy
from decimal import Decimal
from threading import Lock
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator


ScoringMethod = Literal["wer_accuracy", "completion_rate", "manual", "azure_accuracy", "azure_fluency"]


class QuestionCriterion(BaseModel):
    id: UUID
    text: str = Field(min_length=1)
    max_points: Decimal = Field(gt=0, max_digits=5, decimal_places=2)
    scoring_method: ScoringMethod


class QuestionRubric(BaseModel):
    question_max_score: Decimal = Field(gt=0, max_digits=5, decimal_places=2)
    criteria: list[QuestionCriterion] = Field(min_length=1)

    def for_grading(self) -> dict:
        if len({c.id for c in self.criteria}) != len(self.criteria):
            raise ValueError("Criterion IDs must be unique")
        if sum(c.max_points for c in self.criteria) != self.question_max_score:
            raise ValueError("Criterion points must add up to question_max_score")
        if any(not c.text.strip() for c in self.criteria):
            raise ValueError("Criterion text cannot be blank")
        return {"criteria": [
            {
                "key": str(c.id),
                "name": c.text,
                "weight": float(100 * c.max_points / self.question_max_score),
                "max_score": 10,
                "max_points": float(c.max_points),
                "scoring_method": c.scoring_method,
            }
            for c in self.criteria
        ]}


class RubricCriterion(BaseModel):
    key: str = Field(
        min_length=1,
        max_length=64,
        pattern=r"^[a-z][a-z0-9_]*$",
    )
    name: str = Field(min_length=1, max_length=120)
    weight: float = Field(ge=0, le=100)
    max_score: float = Field(default=10, gt=0, le=100)
    scoring_method: ScoringMethod = "manual"


class RubricCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    criteria: list[RubricCriterion] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_rubric(self):
        if not self.name.strip():
            raise ValueError("Rubric name cannot be blank")

        keys = [criterion.key for criterion in self.criteria]
        if len(keys) != len(set(keys)):
            raise ValueError("Criterion keys must be unique")

        total_weight = sum(criterion.weight for criterion in self.criteria)
        if abs(total_weight - 100) > 0.001:
            raise ValueError(
                f"Rubric weights must total 100; got {total_weight:g}"
            )

        return self


_RUBRICS: dict[str, dict] = {}
_RUBRICS_LOCK = Lock()


def create_rubric(payload: RubricCreate) -> dict:
    rubric_id = uuid4().hex
    rubric = {
        "rubric_id": rubric_id,
        "version": 1,
        **payload.model_dump(),
    }

    with _RUBRICS_LOCK:
        _RUBRICS[rubric_id] = rubric

    return deepcopy(rubric)


def list_rubrics() -> list[dict]:
    with _RUBRICS_LOCK:
        return deepcopy(list(_RUBRICS.values()))


def get_rubric(rubric_id: str) -> dict | None:
    with _RUBRICS_LOCK:
        rubric = _RUBRICS.get(rubric_id)
        return deepcopy(rubric) if rubric is not None else None
