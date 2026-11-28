from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.services.asr_service import transcribe_audio_file
from app.services.pronunciation_service import AZURE_METRICS, assess_pronunciation
from app.services.rubric_service import QuestionRubric, get_rubric
from app.services.scoring_service import grade_reading
from app.services.text_alignment import align_text

router = APIRouter(prefix="/api/v1/readings", tags=["reading-grading"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".wav": "wav",
    ".mp3": "mp3",
    ".m4a": "m4a",
    ".mp4": "m4a",
    ".webm": "webm",
    ".ogg": "ogg",
    ".flac": "flac",
}


def detect_audio_format(data: bytes) -> str | None:
    if len(data) >= 12 and data[:4] in (b"RIFF", b"RF64") and data[8:12] == b"WAVE":
        return "wav"

    if data.startswith(b"ID3"):
        return "mp3"

    if len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0:
        return "mp3"

    if len(data) >= 12 and data[4:8] == b"ftyp":
        return "m4a"

    if data.startswith(b"\x1a\x45\xdf\xa3"):
        return "webm"

    if data.startswith(b"OggS"):
        return "ogg"

    if data.startswith(b"fLaC"):
        return "flac"

    return None


@router.post("")
async def receive_reading(
    audio: UploadFile = File(...),
    reference_text: str = Form(..., min_length=1, max_length=20000),
    teacher_instruction: str = Form(default="", max_length=4000),
    rubric_id: str = Form(default="", max_length=100),
    rubric_json: str = Form(default="", max_length=64000),
):
    filename = audio.filename or ""
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Supported formats: WAV, MP3, M4A, WebM, OGG, FLAC",
        )

    try:
        audio_bytes = await audio.read(MAX_AUDIO_BYTES + 1)
    finally:
        await audio.close()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB")

    detected_format = detect_audio_format(audio_bytes)
    expected_format = ALLOWED_EXTENSIONS[extension]

    if detected_format != expected_format:
        raise HTTPException(
            status_code=400,
            detail="File extension does not match the audio content",
        )

    reference_text = reference_text.strip()
    if not reference_text:
        raise HTTPException(
            status_code=422,
            detail="reference_text cannot be blank",
        )

    if rubric_json and rubric_id:
        raise HTTPException(status_code=422, detail="Choose rubric_id or rubric_json")
    rubric = get_rubric(rubric_id) if rubric_id else None
    if rubric_json:
        try:
            rubric = QuestionRubric.model_validate_json(rubric_json).for_grading()
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
    if rubric_id and rubric is None:
        raise HTTPException(status_code=404, detail="Rubric not found")

    temporary_path = None
    assessment = None

    try:
        with NamedTemporaryFile(
            mode="wb",
            suffix=f".{detected_format}",
            delete=False,
        ) as temporary_audio:
            temporary_path = temporary_audio.name
            temporary_audio.write(audio_bytes)

        transcription = await run_in_threadpool(
            transcribe_audio_file,
            temporary_path,
        )
        if transcription["text"] and rubric and any(
            criterion["scoring_method"] in AZURE_METRICS for criterion in rubric["criteria"]
        ):
            assessment = await run_in_threadpool(assess_pronunciation, temporary_path, reference_text)
    finally:
        if temporary_path is not None:
            Path(temporary_path).unlink(missing_ok=True)

    try:
        alignment = align_text(reference_text, transcription["text"])
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    transcription_status = (
        "completed" if transcription["text"] else "no_speech"
    )

    return {
        "request_id": str(uuid4()),
        "status": transcription_status,
        "audio": {
            "format": detected_format,
            "size_bytes": len(audio_bytes),
        },
        "input": {
            "reference_text_characters": len(reference_text),
            "teacher_instruction_provided": bool(teacher_instruction.strip()),
            "rubric_id": rubric_id or None,
        },
        "transcription": {
            "status": transcription_status,
            **transcription,
        },
        "alignment": alignment,
        "pronunciation_assessment": assessment,
        "grading": grade_reading(rubric, alignment, bool(transcription["text"]), assessment)
        if rubric else {"status": "not_requested"},
    }
