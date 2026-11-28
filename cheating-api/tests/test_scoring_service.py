import pytest

from app.services.scoring_service import calculate_rubric_score


RUBRIC = {
    "criteria": [
        {
            "key": "content",
            "name": "Độ chính xác nội dung",
            "weight": 30,
            "max_score": 10,
        },
        {
            "key": "pronunciation",
            "name": "Phát âm",
            "weight": 40,
            "max_score": 10,
        },
        {
            "key": "fluency",
            "name": "Độ trôi chảy",
            "weight": 20,
            "max_score": 10,
        },
        {
            "key": "completion",
            "name": "Hoàn thành bài đọc",
            "weight": 10,
            "max_score": 10,
        },
    ],
}


def test_calculates_weighted_score():
    result = calculate_rubric_score(
        RUBRIC,
        {
            "content": 9,
            "pronunciation": 8,
            "fluency": 8.5,
            "completion": 10,
        },
    )

    assert result["total_score"] == 8.6
    assert result["available_weight"] == 100


def test_total_is_unavailable_if_weighted_criterion_has_no_score():
    result = calculate_rubric_score(
        RUBRIC,
        {
            "content": 9,
            "pronunciation": None,
            "fluency": 8.5,
            "completion": 10,
        },
    )

    assert result["total_score"] is None
    assert result["available_weight"] == 60


def test_rejects_weights_that_do_not_total_100():
    rubric = {
        "criteria": [
            {
                "key": "content",
                "name": "Độ chính xác nội dung",
                "weight": 90,
                "max_score": 10,
            },
        ],
    }

    with pytest.raises(ValueError, match="total 100"):
        calculate_rubric_score(rubric, {"content": 9})