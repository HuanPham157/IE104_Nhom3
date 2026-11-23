"""Sinh nhận xét tiếng Việt theo mẫu từ kết quả chấm.

Khi chưa được phép (reveal=False), nhận xét chỉ nhắc số thứ tự tiêu chí, không nêu nội dung đáp án hay barem.
"""

from __future__ import annotations

from app.assessment.rubric_scoring import CriterionResult

_CONFLICT_TEXT = {
    "negation": "khẳng định ngược (phủ định) so với nội dung đúng",
    "antonym": "dùng khái niệm ngược nghĩa với nội dung đúng",
    "subject": "gán đặc điểm cho nhầm đối tượng",
}
_FLAG_TEXT = {
    "too_short": "Câu trả lời khá ngắn, hãy trình bày đầy đủ các ý chính hơn.",
    "mostly_filler": "Phần lớn câu trả lời là từ đệm (à, ừ, ờ…), ít nội dung chuyên môn.",
    "off_topic": "Nội dung trả lời chưa đúng trọng tâm câu hỏi.",
    "low_asr_confidence": "Bản ghi âm chưa rõ nên hệ thống có thể nghe chưa đúng; giảng viên sẽ nghe lại audio.",
    "heavily_edited": "Transcript đã được sửa nhiều so với bản nhận dạng; giảng viên sẽ đối chiếu với audio.",
    "no_reference": "Câu hỏi chưa có đáp án hoặc tiêu chí để AI chấm; giảng viên sẽ chấm trực tiếp.",
    "weak_lexical_support": "Câu trả lời đúng chủ đề nhưng ít dùng thuật ngữ chính; giảng viên sẽ kiểm tra lại nội dung.",
}


def _name(result: CriterionResult, reveal: bool) -> str:
    if reveal and result.criterion:
        return f"“{result.criterion.text}”"
    return f"tiêu chí {result.position}" if result.criterion else "câu trả lời"


def criterion_explanation(result: CriterionResult, reveal: bool) -> str:
    matched = sum(point.coverage >= 0.5 and not point.conflict for point in result.points)
    total = len(result.points)
    missing = [point.text for point in result.missing_points]
    if result.assessment == "incorrect":
        kinds = {_CONFLICT_TEXT[point.conflict] for point in result.conflicts}
        return f"Có nội dung {', '.join(sorted(kinds))}. Giảng viên sẽ kiểm tra lại."
    if result.assessment == "correct":
        return "Đã trình bày đúng nội dung yêu cầu."
    if result.assessment == "partial":
        text = f"Mới trình bày được một phần ({matched}/{total} ý)." if total > 1 else "Mới trình bày được một phần, cần nói rõ và đầy đủ hơn."
        return f"{text} Còn thiếu: {'; '.join(missing)}." if reveal and missing else text
    text = "Chưa đề cập đến nội dung này."
    return f"{text} Cần nêu: {'; '.join(missing)}." if reveal and missing else text


def summary(results: list[CriterionResult], flags: list[str], suggested: float, max_total: float, reveal: bool) -> str:
    rubric = any(result.criterion for result in results)
    parts = [f"Điểm AI đề xuất: {suggested:g}/{max_total:g}."]
    good = [_name(result, reveal) for result in results if result.assessment == "correct"]
    partial = [_name(result, reveal) for result in results if result.assessment == "partial"]
    missing = [_name(result, reveal) for result in results if result.assessment == "missing"]
    wrong = [_name(result, reveal) for result in results if result.assessment == "incorrect"]
    if rubric:
        if good:
            parts.append(f"Làm tốt: {', '.join(good)}.")
        if partial:
            parts.append(f"Cần trình bày đầy đủ hơn: {', '.join(partial)}.")
        if missing:
            parts.append(f"Chưa đề cập: {', '.join(missing)}.")
        if wrong:
            parts.append(f"Cần xem lại vì có nội dung chưa đúng: {', '.join(wrong)}.")
    elif results:
        result = results[0]
        level = {"correct": "nêu được hầu hết các ý chính", "partial": "mới nêu được một phần các ý chính",
                 "missing": "chưa nêu được các ý chính", "incorrect": "có nội dung chưa đúng"}[result.assessment]
        parts.append(f"Câu trả lời {level}.")
        missing_points = [point.text for point in result.missing_points]
        if reveal and missing_points:
            parts.append(f"Còn thiếu: {'; '.join(missing_points)}.")
    parts.extend(_FLAG_TEXT[flag] for flag in flags if flag in _FLAG_TEXT)
    if any(result.assessment != "correct" for result in results):
        parts.append("Gợi ý: nêu rõ từng ý chính, dùng đúng thuật ngữ và cho ví dụ cụ thể.")
    return " ".join(parts)
