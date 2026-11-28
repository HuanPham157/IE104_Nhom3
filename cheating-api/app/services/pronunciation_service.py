import base64
import io
import json
import os
import re
import wave

import httpx
from faster_whisper.audio import decode_audio


AZURE_METRICS = {
    "azure_accuracy": "AccuracyScore",
    "azure_fluency": "FluencyScore",
}


def assess_pronunciation(path: str, reference: str) -> dict:
    result = {"provider": "azure_speech", "locale": "vi-VN", "scores": {}}
    key = os.getenv("AZURE_SPEECH_KEY", "").strip()
    region = os.getenv("AZURE_SPEECH_REGION", "").strip()
    if not key or not re.fullmatch(r"[a-z0-9-]+", region):
        return {**result, "status": "not_configured"}

    samples = decode_audio(path, sampling_rate=16000)
    if len(samples) > 30 * 16000:
        return {**result, "status": "audio_exceeds_30_seconds"}

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setparams((1, 2, 16000, 0, "NONE", "NONE"))
        wav.writeframes((samples * 32768).clip(-32768, 32767).astype("<i2").tobytes())

    config = {"ReferenceText": reference, "GradingSystem": "HundredMark",
              "Granularity": "FullText", "Dimension": "Comprehensive"}
    encoded = base64.b64encode(json.dumps(config, ensure_ascii=False).encode()).decode()
    try:
        response = httpx.post(
            f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1",
            params={"language": "vi-VN", "format": "detailed"},
            headers={"Ocp-Apim-Subscription-Key": key, "Pronunciation-Assessment": encoded,
                     "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000"},
            content=buffer.getvalue(), timeout=35,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as exc:
        return {**result, "status": "provider_error", "http_status": exc.response.status_code}
    except (httpx.RequestError, ValueError):
        return {**result, "status": "provider_error"}
    if not isinstance(payload, dict) or payload.get("RecognitionStatus") != "Success":
        return {**result, "status": "no_assessment"}
    candidates = payload.get("NBest")
    if not isinstance(candidates, list) or not candidates or not isinstance(candidates[0], dict):
        return {**result, "status": "no_assessment"}
    metrics = candidates[0].get("PronunciationAssessment", candidates[0])
    if not isinstance(metrics, dict):
        return {**result, "status": "no_assessment"}
    for method, field in AZURE_METRICS.items():
        score = metrics.get(field)
        if type(score) in (int, float) and 0 <= score <= 100:
            result["scores"][method] = score
    count = len(result["scores"])
    result["status"] = {0: "no_assessment", 1: "partial", 2: "completed"}[count]
    return result
