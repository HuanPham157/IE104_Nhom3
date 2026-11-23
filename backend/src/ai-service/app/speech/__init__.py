"""Speech-to-text modules backed by Faster-Whisper."""

from .transcription import TranscriptionResult, transcribe_upload

__all__ = ["TranscriptionResult", "transcribe_upload"]
