from app.services.text_alignment import align_text


def test_missing_se_in_vietnamese_reference():
    reference = "Hôm nay chúng ta sẽ tìm hiểu về trí tuệ nhân tạo và ứng dụng trong giáo dục."
    result = align_text(reference, reference.replace(" sẽ", ""))
    assert result["wer"] == 1 / 18
    assert result["errors"] == [
        {"type": "deletion", "reference_token": "sẽ", "recognized_token": None, "position": 5}
    ]


def test_repeated_nay_in_verified_transcript():
    result = align_text("Hôm nay chúng ta", "Hôm nay nay chúng ta")
    assert result["counts"] == {
        "substitutions": 0, "deletions": 0, "insertions": 1, "reference_tokens": 4
    }
    assert result["errors"][0]["recognized_token"] == "nay"
