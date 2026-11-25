import base64
import io
import json
import wave

import httpx
import pytest

from app.services.pronunciation_service import assess_pronunciation
from app.services.scoring_service import grade_reading


@pytest.mark.parametrize("metrics, expected", [
    ({"AccuracyScore": 80, "FluencyScore": 85}, 8.3),
    ({"AccuracyScore": 80}, None),
    ({"AccuracyScore": 101, "FluencyScore": 85}, None),
])
def test_audio_scores_follow_rubric(tmp_path, monkeypatch, metrics, expected):
    path = tmp_path / "sample.wav"
    with wave.open(str(path), "wb") as wav:
        wav.setparams((1, 2, 16000, 0, "NONE", "NONE"))
        wav.writeframes(bytes(32000))
    reference = "Trí tuệ nhân tạo."
    monkeypatch.setenv("AZURE_SPEECH_KEY", "test-key")
    monkeypatch.setenv("AZURE_SPEECH_REGION", "eastus")

    def post(url, *, params, headers, content, timeout):
        assert params["language"] == "vi-VN"
        assert json.loads(base64.b64decode(headers["Pronunciation-Assessment"]))["ReferenceText"] == reference
        with wave.open(io.BytesIO(content)) as audio:
            assert (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) == (16000, 1, 2)
        return httpx.Response(200, request=httpx.Request("POST", url), json={
            "RecognitionStatus": "Success", "NBest": [metrics],
        })

    monkeypatch.setattr(httpx, "post", post)
    assessment = assess_pronunciation(str(path), reference)
    rubric = {"criteria": [
        {"key": "p", "name": "Phát âm", "weight": 40, "max_score": 10, "scoring_method": "azure_accuracy"},
        {"key": "f", "name": "Trôi chảy", "weight": 60, "max_score": 10, "scoring_method": "azure_fluency"},
    ]}
    alignment = {"counts": {"reference_tokens": 4, "deletions": 0}, "errors": [], "wer": 0}
    grading = grade_reading(rubric, alignment, True, assessment)
    assert grading["total_score"] == expected
    assert grading["needs_teacher_review"] == (expected is None)
