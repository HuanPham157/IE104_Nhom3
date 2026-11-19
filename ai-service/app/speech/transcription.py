"""Faster-Whisper model loading and audio transcription helpers."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import math
import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from faster_whisper import WhisperModel

MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".mpga"}

# Ngưỡng gốc của Whisper: đoạn "không có lời nói" và độ tin cậy thấp thì bỏ; tỉ lệ nén cao = lặp chữ.
NO_SPEECH_THRESHOLD = 0.6
LOW_LOGPROB_THRESHOLD = -1.0
MAX_COMPRESSION_RATIO = 2.4
# Câu Whisper hay tự bịa với tiếng Việt khi gặp im lặng/tạp âm (học từ phụ đề video).
HALLUCINATION_MARKERS = (
    "subscribe",
    "ghiền mì gõ",
    "đăng ký kênh",
    "bấm chuông",
    "like và share",
    "hẹn gặp lại các bạn trong những video",
)


@dataclass
class TranscriptionResult:
    transcript: str
    # 0..1: trung bình theo thời lượng của exp(avg_logprob) các đoạn được giữ; None khi không có lời nói.
    confidence: Optional[float]
    dropped_segments: int


@lru_cache(maxsize=1)
def get_model() -> WhisperModel:
    """Load and cache the configured model (tên cỡ model như base/small hoặc repo CTranslate2 trên Hugging Face)."""
    return WhisperModel(
        os.getenv("WHISPER_MODEL", "small"),
        device=os.getenv("WHISPER_DEVICE", "auto"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
        # Số lượt nhận dạng chạy song song khi nhiều sinh viên nộp cùng lúc.
        num_workers=max(1, int(os.getenv("WHISPER_WORKERS", "1"))),
    )


def _should_drop(segment) -> bool:
    text = segment.text.strip().lower()
    if not text:
        return True
    if segment.no_speech_prob > NO_SPEECH_THRESHOLD and segment.avg_logprob < LOW_LOGPROB_THRESHOLD:
        return True
    if segment.compression_ratio > MAX_COMPRESSION_RATIO:
        return True
    return any(marker in text for marker in HALLUCINATION_MARKERS)


def transcribe_upload(audio: UploadFile, language: str = "vi", prompt: str = "") -> TranscriptionResult:
    """Validate an uploaded audio file and return its transcript.

    `prompt` (thường là nội dung câu hỏi) được truyền làm initial_prompt để model
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
        segments, _info = get_model().transcribe(
            temp_path,
            language=language,
            initial_prompt=prompt.strip()[:500] or None,
            beam_size=5,
            # Cắt khoảng lặng trước khi nhận dạng — nguyên nhân chính khiến model tự bịa câu.
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            # Không để lỗi của đoạn trước kéo theo đoạn sau (vòng lặp lặp chữ).
            condition_on_previous_text=False,
            temperature=[0.0, 0.2, 0.4, 0.6],
            no_speech_threshold=NO_SPEECH_THRESHOLD,
            log_prob_threshold=LOW_LOGPROB_THRESHOLD,
            compression_ratio_threshold=MAX_COMPRESSION_RATIO,
        )

        kept_texts: list[str] = []
        weighted_confidence = 0.0
        total_weight = 0.0
        dropped = 0
        # segments là generator: việc giải mã diễn ra khi duyệt, nên phải duyệt trước khi xóa file tạm.
        for segment in segments:
            text = segment.text.strip()
            if _should_drop(segment) or (kept_texts and text == kept_texts[-1]):
                dropped += 1
                continue
            kept_texts.append(text)
            weight = max(segment.end - segment.start, 0.01)
            weighted_confidence += weight * math.exp(segment.avg_logprob)
            total_weight += weight

        confidence = round(min(1.0, weighted_confidence / total_weight), 4) if total_weight else None
        return TranscriptionResult(" ".join(kept_texts).strip(), confidence, dropped)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail="Không thể nhận diện âm thanh.") from error
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)
