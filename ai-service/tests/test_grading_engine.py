"""Kiểm thử engine chấm điểm local. Chạy: cd ai-service && python -m pytest tests -q

Các test dùng model embedding thật (lần đầu tải từ Hugging Face).
"""

from __future__ import annotations

import pytest

from app.assessment.answer_analysis import find_subjects, lexical_coverage
from app.assessment.config import load_config
from app.assessment.embeddings import Embedder
from app.assessment.engine import grade
from app.assessment.schemas import GradeRequest
from app.assessment.text_processing import antonym_conflict, split_clauses
from scripts.evaluate_grader import FIXTURES, load_cases

CASES = load_cases(FIXTURES)
BY_ID = {case["id"]: case for case in CASES}


@pytest.fixture(scope="module")
def engine():
    config = load_config()
    embedder = Embedder(config)
    return lambda request: grade(request, config, embedder)


# ----- Tiền xử lý (không cần model) -----

def test_antonym_conflict_detects_swapped_order_but_not_paraphrase():
    assert antonym_conflict("vào sau ra trước", "vào trước ra trước")
    assert not antonym_conflict("vào sau ra trước", "bỏ vào cuối cùng thì lấy ra trước")
    assert antonym_conflict("lỗi phía client", "404 là lỗi phía máy chủ")


def test_lexical_coverage_tolerates_missing_diacritics():
    assert lexical_coverage("phần tử ở đỉnh", "lay phan tu o dinh ra") == pytest.approx(1.0)
    assert lexical_coverage("O(log n)", "độ phức tạp là O(n)") < 0.5


def test_subjects_only_for_comparison_questions():
    stack = BY_ID["stack/full"]["request"]
    processes = BY_ID["process-thread/full"]["request"]
    assert find_subjects(stack).terms == set()
    subjects = find_subjects(processes)
    assert subjects.terms == {"tiến_trình", "luồng"}
    assert subjects.canonical("Thread nằm trong process") == "luồng nằm trong tiến trình"


def test_split_clauses_on_contrast():
    assert split_clauses("TCP cần kết nối, còn UDP thì không") == ["TCP cần kết nối", "UDP thì không"]


# ----- Bất biến của kết quả (mọi bài trong bộ dữ liệu) -----

@pytest.mark.parametrize("case", CASES, ids=[case["id"] for case in CASES])
def test_result_respects_grade_contract(engine, case):
    request = case["request"]
    result = engine(request)
    assert 0 <= result.suggested_score <= request.max_score
    if request.criteria:
        assert [item.criterion_id for item in result.criteria] == [criterion.id for criterion in request.criteria]
        limits = {criterion.id: criterion.max_points for criterion in request.criteria}
        assert all(0 <= item.awarded_points <= limits[item.criterion_id] for item in result.criteria)
        assert sum(item.awarded_points for item in result.criteria) == pytest.approx(result.suggested_score, abs=0.01)
    else:
        assert result.criteria == []
    assert result.engine.startswith("local-grader-v1+")
    assert result.feedback_summary


# ----- Hành vi chấm -----

@pytest.mark.parametrize("question", sorted({case["id"].split("/")[0] for case in CASES}))
def test_full_answer_beats_partial_and_offtopic(engine, question):
    full = engine(BY_ID[f"{question}/full"]["request"]).suggested_score
    partial = engine(BY_ID[f"{question}/partial"]["request"]).suggested_score
    offtopic = engine(BY_ID[f"{question}/offtopic"]["request"])
    assert full > partial
    assert full > offtopic.suggested_score
    assert offtopic.suggested_score <= 1.5 or offtopic.needs_teacher_review


def test_contradiction_is_flagged_for_review(engine):
    result = engine(BY_ID["stack/wrong"]["request"])
    assert result.needs_teacher_review
    assert any(item.assessment == "incorrect" for item in result.criteria)


def test_missing_reference_and_rubric_needs_teacher(engine):
    result = engine(GradeRequest(question="Câu hỏi", reference_answer="", max_score=5,
                                 transcript="Em trả lời như sau về câu hỏi này ạ", criteria=[]))
    assert result.suggested_score == 0
    assert result.needs_teacher_review
    assert "no_reference" in result.analysis["flags"]


def test_feedback_does_not_reveal_reference_unless_allowed(engine):
    request = BY_ID["stack/partial"]["request"]
    hidden = engine(request)
    shown_text = " ".join(item.explanation for item in hidden.criteria) + hidden.feedback_summary
    assert "push" not in shown_text and "lời gọi hàm" not in shown_text
    assert "Nêu thao tác push và pop" not in shown_text

    revealed = engine(request.model_copy(update={"reveal_reference": True}))
    revealed_text = " ".join(item.explanation for item in revealed.criteria) + revealed.feedback_summary
    assert "push" in revealed_text


def test_low_asr_confidence_requires_review(engine):
    request = BY_ID["stack/full"]["request"].model_copy(update={"transcript_confidence": 0.4})
    result = engine(request)
    assert result.needs_teacher_review
    assert "low_asr_confidence" in result.analysis["flags"]
