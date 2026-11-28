from threading import Lock

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter(prefix="/api/detect", tags=["detection"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

_sessions: dict[str, dict] = {}
_sessions_lock = Lock()


def has_valid_signature(content_type: str, data: bytes) -> bool:
    if content_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False


@router.post("/image")
async def receive_image(
    file: UploadFile = File(...),
    session_id: str = Form(..., min_length=1, max_length=100),
    timestamp_ms: int = Form(..., ge=0),
):
    session_id = session_id.strip()
    if not session_id:
        raise HTTPException(status_code=422, detail="session_id cannot be blank")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPEG, PNG, or WebP image",
        )

    try:
        image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
    finally:
        await file.close()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB")

    if not has_valid_signature(content_type, image_bytes):
        raise HTTPException(
            status_code=400,
            detail="Image signature does not match its content type",
        )

    with _sessions_lock:
        session = _sessions.setdefault(
            session_id,
            {
                "frames_received": 0,
                "last_timestamp_ms": None,
                "events": [],
            },
        )
        session["frames_received"] += 1
        session["last_timestamp_ms"] = timestamp_ms

    return {
        "session_id": session_id,
        "timestamp_ms": timestamp_ms,
        "image": {
            "content_type": content_type,
            "size_bytes": len(image_bytes),
        },
        "analysis": {
            "status": "unavailable",
            "reason": "vision_model_not_enabled",
        },
    }


@router.get("/report/{session_id}")
def get_report(session_id: str):
    with _sessions_lock:
        session = _sessions.get(session_id)

        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": session_id,
            "frames_received": session["frames_received"],
            "last_timestamp_ms": session["last_timestamp_ms"],
            "analysis_status": "unavailable",
            "risk_score": None,
            "severity": "not_evaluated",
            "events": list(session["events"]),
        }


@router.post("/reset/{session_id}")
def reset_session(session_id: str):
    with _sessions_lock:
        removed = _sessions.pop(session_id, None) is not None

    return {
        "session_id": session_id,
        "reset": True,
        "session_existed": removed,
    }