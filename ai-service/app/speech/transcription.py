"""Whisper model loading and audio transcription helpers."""

from __future__ import annotations

from functools import lru_cache
import tempfile
from pathlib import Path

import whisper
from fastapi import HTTPException, UploadFile

MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".mpga"}


@lru_cache(maxsize=1)
def get_model():
    """Load and cache the configured Whisper model (base by default)."""
    return whisper.load_model(__import__("os").getenv("WHISPER_MODEL", "base"))


def transcribe_upload(audio: UploadFile, language: str = "vi", prompt: str = "") -> str:
    """Validate an uploaded audio file and return its Whisper transcript.

    `prompt` (thường là nội dung câu hỏi) được truyền làm initial_prompt để Whisper
    nhận đúng ngôn ngữ và thuật ngữ, giảm transcript vô nghĩa với câu trả lời ngắn.
    """
    extension = Path(audio.filename or "audio").suffix.lower()
    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Định dạng âm thanh chưa được hỗ trợ.")
    if not (2 <= len(language) <= 3 and language.isalpha()):
        raise HTTPException(status_code=400, detail="Mã ngôn ngữ không hợp lệ.")

    content = audio.file.read(MAX_AUDIO_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Tệp âm thanh đang trống.")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Tệp âm thanh vượt quá giới hạn 25 MB.")

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        result = get_model().transcribe(
            temp_path,
            language=language,
            initial_prompt=prompt.strip()[:500] or None,
            fp16=False,
        )
        return result.get("text", "").strip()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail="Không thể nhận diện âm thanh.") from error
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)
