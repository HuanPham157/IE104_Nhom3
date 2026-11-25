from fastapi import APIRouter, HTTPException

from app.services.rubric_service import (
    RubricCreate,
    create_rubric,
    get_rubric,
    list_rubrics,
)

router = APIRouter(prefix="/api/v1/rubrics", tags=["rubrics"])


@router.post("", status_code=201)
def create_rubric_endpoint(payload: RubricCreate):
    return create_rubric(payload)


@router.get("")
def list_rubrics_endpoint():
    return {"items": list_rubrics()}


@router.get("/{rubric_id}")
def get_rubric_endpoint(rubric_id: str):
    rubric = get_rubric(rubric_id)

    if rubric is None:
        raise HTTPException(status_code=404, detail="Rubric not found")

    return rubric