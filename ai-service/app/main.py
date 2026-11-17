"""Standalone speech-to-text service backed by OpenAI Whisper."""

from __future__ import annotations

import hmac
import json
import os
from typing import Literal, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from openai import OpenAI
from pydantic import BaseModel, ConfigDict
from app.speech import transcribe_upload

app = FastAPI(title="AI Oral Check AI Service", version="0.1.0")
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")


class RubricCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    text: str
    max_points: float


class GradeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str
    reference_answer: str
    max_score: float
    transcript: str
    criteria: list[RubricCriterion]
    # Ghi chú từ barem chung của giảng viên (yêu cầu chung + ghi chú riêng của câu này).
    grading_notes: str = ""


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


def verify_service_token(x_ai_service_token: Optional[str]) -> None:
    if not AI_SERVICE_TOKEN or not x_ai_service_token or not hmac.compare_digest(
        AI_SERVICE_TOKEN, x_ai_service_token
    ):
        raise HTTPException(status_code=401, detail="Unauthorized AI service request")


@app.get("/health")
def health():
    return {"status": "ok", "service": "whisper"}


@app.post("/api/transcribe")
def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("vi"),
    prompt: str = Form(""),
    x_ai_service_token: Optional[str] = Header(default=None),
):
    verify_service_token(x_ai_service_token)
    return {"transcript": transcribe_upload(audio, language, prompt)}


@app.post("/api/grade", response_model=GradeResult)
def grade(
    payload: GradeRequest,
    x_ai_service_token: Optional[str] = Header(default=None),
):
    verify_service_token(x_ai_service_token)
    if not payload.transcript.strip() or len(payload.transcript) > 50000:
        raise HTTPException(status_code=400, detail="Transcript không hợp lệ.")
    if payload.max_score <= 0 or any(item.max_points <= 0 for item in payload.criteria):
        raise HTTPException(status_code=400, detail="Rubric không hợp lệ.")
    if sum(item.max_points for item in payload.criteria) > payload.max_score + 0.01:
        raise HTTPException(status_code=400, detail="Tổng điểm rubric vượt điểm câu hỏi.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Chưa cấu hình OPENAI_API_KEY để chấm bài.")

    client = OpenAI(api_key=api_key)
    rubric_json = [item.model_dump() for item in payload.criteria]
    instructions = (
        "Bạn là trợ lý chấm bài vấn đáp. Chấm mức độ hiểu dựa trên transcript và rubric. "
        "Không suy diễn nội dung sinh viên không nói. Phân biệt sai với chưa đề cập. "
        "Mỗi tiêu chí phải có dẫn chứng trích nguyên văn ngắn từ transcript; nếu thiếu, để evidence_excerpt rỗng. "
        "Không thưởng điểm cho độ trôi chảy/phát âm. Đầu ra phải đúng schema. "
        "Nếu transcript không đủ rõ, có lỗi nhận dạng hoặc không chắc chắn, bật needs_teacher_review. "
        "Khi rubric rỗng, chấm tổng thể theo đáp án tham khảo, trả criteria là mảng rỗng. "
        "Nếu có rubric, suggested_score phải bằng tổng awarded_points. "
        "Nếu có grading_notes (barem của giảng viên), tuân thủ các yêu cầu trong đó khi chấm và nhận xét."
    )
    context = {
        "question": payload.question,
        "reference_answer": payload.reference_answer,
        "max_score": payload.max_score,
        "criteria": rubric_json,
        "transcript": payload.transcript,
        "grading_notes": payload.grading_notes[:4000],
    }
    try:
        response = client.chat.completions.parse(
            model=os.getenv("OPENAI_GRADING_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": instructions},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
            ],
            response_format=GradeResult,
        )
        result = response.choices[0].message.parsed
        if result is None:
            raise ValueError("No structured grade returned")
        expected_ids = {item.id for item in payload.criteria}
        returned_ids = [item.criterion_id for item in result.criteria]
        if set(returned_ids) != expected_ids or len(returned_ids) != len(expected_ids):
            raise ValueError("AI returned an invalid rubric criterion set")
        if result.suggested_score < 0 or result.suggested_score > payload.max_score:
            raise ValueError("AI returned a score outside the allowed range")
        if result.criteria and abs(
            sum(item.awarded_points for item in result.criteria) - result.suggested_score
        ) > 0.01:
            raise ValueError("AI score does not match criterion scores")
        score_limits = {item.id: item.max_points for item in payload.criteria}
        if any(
            item.awarded_points < 0 or item.awarded_points > score_limits[item.criterion_id]
            for item in result.criteria
        ):
            raise ValueError("AI returned a criterion score outside the allowed range")
        for item in result.criteria:
            item.awarded_points = round(item.awarded_points, 2)
        if result.criteria:
            result.suggested_score = round(sum(item.awarded_points for item in result.criteria), 2)
        else:
            result.suggested_score = round(result.suggested_score, 2)
        return result
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail="Không thể tạo đánh giá AI.") from error
