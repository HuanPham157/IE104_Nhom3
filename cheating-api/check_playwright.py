"""Chạy bằng pytest khi API chấm đọc đang mở ở cổng 8002."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright


def test_reading_api():
    folder = Path(__file__).resolve().parent
    sample = folder / "bai-doc.m4a"
    dataset = json.loads((folder / "tests/data/vietnamese_readings.json").read_text("utf-8"))
    criterion = next(c for c in dataset["rubric"]["criteria"] if c["scoring_method"] == "wer_accuracy")
    rubric = {"question_max_score": 10, "criteria": [{**criterion, "max_points": 10}]}

    with sync_playwright() as playwright:
        api = playwright.request.new_context(base_url="http://127.0.0.1:8002")
        try:
            response = api.post(
                "/api/v1/readings",
                multipart={
                    "audio": {"name": sample.name, "mimeType": "audio/mp4", "buffer": sample.read_bytes()},
                    "reference_text": dataset["reference_text"],
                    "rubric_json": json.dumps(rubric, ensure_ascii=False),
                },
                timeout=300_000,
            )
            assert response.status == 200, response.text()
            result = response.json()
            assert result["transcription"]["text"].strip()
            assert result["grading"]["status"] == "completed"
            expected = round(10 * max(0, 1 - result["alignment"]["wer"]), 2)
            assert result["grading"]["total_score"] == expected
        finally:
            api.dispose()
