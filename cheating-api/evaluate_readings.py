"""Đối chiếu các lượt chấm đã ghi nhận, chạy từ thư mục cheating-api."""
import json
from pathlib import Path
from statistics import mean

from app.services.rubric_service import QuestionRubric
from app.services.scoring_service import grade_reading
from app.services.text_alignment import align_text


DATA = Path(__file__).parent / "tests/data/vietnamese_readings.json"


def report(dataset):
    rows = []
    rubric = QuestionRubric.model_validate(dataset["rubric"]).for_grading()
    for sample in dataset["samples"]:
        if not sample["full_transcript_verified"]:
            continue
        human = sample["candidate_transcript"]
        reference = sample.get("reference_text", dataset["reference_text"])
        reading = align_text(reference, human)
        comparison = grade_reading(rubric, reading, bool(human.strip()), {"scores": sample["azure_scores_100"]})
        recognition = align_text(human, sample["observed_asr_transcript"])
        row = {
            "file": sample["file"], "region": sample["region"],
            "reading_wer": reading["wer"], "asr_counts": recognition["counts"],
            "asr_wer": recognition["wer"], "total_score": sample["total_score_10"],
            "comparison_score": comparison["total_score"],
        }
        for key, field, maximum in [
            ("pronunciation", "azure_accuracy", 4), ("fluency", "azure_fluency", 2)
        ]:
            teacher = sample[f"teacher_{key}_{maximum}"]
            if teacher is not None and not 0 <= teacher <= maximum:
                raise ValueError(f"{sample['file']}: điểm {key} phải nằm trong 0–{maximum}")
            azure = sample["azure_scores_100"].get(field)
            row[key] = None if teacher is None or azure is None else abs(azure * maximum / 100 - teacher)
        rows.append(row)
    return rows


def print_summary(rows):
    for row in rows:
        print(f"{row['file']} | WER lời đọc {row['reading_wer']:.2%} | "
              f"WER Whisper {row['asr_wer']:.2%} | điểm API {row['total_score']} | "
              f"bản chép tay + Azure {row['comparison_score']}")
    for label, subset in [("Toàn bộ", rows)] + [
        (region, [row for row in rows if row["region"] == region])
        for region in ("Bắc", "Trung", "Nam")
    ]:
        print(f"{label}: {len(subset)} mẫu đã xác nhận")
        if not subset:
            continue
        counts = [row["asr_counts"] for row in subset]
        errors = sum(c["substitutions"] + c["deletions"] + c["insertions"] for c in counts)
        print(f"  WER Whisper gộp: {errors / sum(c['reference_tokens'] for c in counts):.2%}")
        for key, title in [("pronunciation", "phát âm /4"), ("fluency", "trôi chảy /2")]:
            diffs = [r[key] for r in subset if r[key] is not None]
            value = f"{mean(diffs):.2f} điểm" if diffs else "chưa có cặp điểm"
            print(f"  Sai lệch tuyệt đối trung bình {title}: {value} (n={len(diffs)})")


if __name__ == "__main__":
    print_summary(report(json.loads(DATA.read_text(encoding="utf-8"))))
