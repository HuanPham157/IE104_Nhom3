"""AI service chạy hoàn toàn local: speech-to-text bằng Faster-Whisper và chấm điểm theo rubric bằng engine nội bộ."""

from __future__ import annotations

import hmac
import os
from typing import Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from app.assessment import GradeRequest, GradeResult, grade_answer
from app.assessment.config import load_config
from app.speech import transcribe_upload

app = FastAPI(title="AI Oral Check AI Service", version="0.2.0")
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")


def verify_service_token(x_ai_service_token: Optional[str]) -> None:
    if not AI_SERVICE_TOKEN or not x_ai_service_token or not hmac.compare_digest(
        AI_SERVICE_TOKEN, x_ai_service_token
    ):
        raise HTTPException(status_code=401, detail="Unauthorized AI service request")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "faster-whisper",
        "model": os.getenv("WHISPER_MODEL", "small"),
        "grader": load_config().engine_name,
    }


@app.post("/api/transcribe")
def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("vi"),
    prompt: str = Form(""),
    x_ai_service_token: Optional[str] = Header(default=None),
):
    verify_service_token(x_ai_service_token)
    result = transcribe_upload(audio, language, prompt)
    return {
        "transcript": result.transcript,
        "confidence": result.confidence,
        "dropped_segments": result.dropped_segments,
    }


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

    try:
        result = grade_answer(payload)
    except Exception as error:
        raise HTTPException(status_code=502, detail="Không thể tạo đánh giá AI.") from error

    # Chốt chặn cuối như bản trước: đủ bộ tiêu chí, điểm trong giới hạn, tổng điểm khớp.
    expected_ids = [item.id for item in payload.criteria]
    limits = {item.id: item.max_points for item in payload.criteria}
    if [item.criterion_id for item in result.criteria] != expected_ids:
        raise HTTPException(status_code=502, detail="Không thể tạo đánh giá AI.")
    if not 0 <= result.suggested_score <= payload.max_score or any(
        not 0 <= item.awarded_points <= limits[item.criterion_id] for item in result.criteria
    ):
        raise HTTPException(status_code=502, detail="Không thể tạo đánh giá AI.")
    if result.criteria and abs(sum(item.awarded_points for item in result.criteria) - result.suggested_score) > 0.01:
        raise HTTPException(status_code=502, detail="Không thể tạo đánh giá AI.")
    return result
