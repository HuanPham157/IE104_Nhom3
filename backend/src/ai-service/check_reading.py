import argparse
import sys
from pathlib import Path

from fastapi import UploadFile

from app.speech.transcription import transcribe_upload
from app.speech.audio_quality import analyze_audio_quality
# Dùng lại hàm so khớp đã kiểm tra ở bước trước.
assessment_dir = Path(__file__).resolve().parent / "app" / "assessment"
sys.path.insert(0, str(assessment_dir))
from reading_alignment import compare_reading


REFERENCE = (
    "Hôm nay chúng ta sẽ tìm hiểu về trí tuệ nhân tạo "
    "và ứng dụng trong giáo dục."
)
MAX_CONTENT_POINTS = 3


def main():
    parser = argparse.ArgumentParser(description="Kiểm tra một bản ghi bài đọc.")
    parser.add_argument("audio", type=Path, help="Đường dẫn đến file ghi âm")
    args = parser.parse_args()

    if not args.audio.is_file():
        parser.exit(1, f"Không tìm thấy file ghi âm: {args.audio}\n")

    quality = analyze_audio_quality(args.audio)
    print("=== Kiểm tra bản ghi ===")
    print(f"Thời lượng: {quality['duration_seconds']:.2f} giây")
    print(f"Khung giống giọng nói: {quality['voice_frames']}/{quality['total_frames']}")
    print()
    
    print("Đang nhận diện giọng đọc...", flush=True)
    with args.audio.open("rb") as audio:
        upload = UploadFile(file=audio, filename=args.audio.name)
        result = transcribe_upload(upload, language="vi")

    if not result.transcript.strip():
        parser.exit(1, "Chưa nhận diện được lời nói. Hãy nghe lại file ghi âm.\n")

    print("\nBản chuẩn:", REFERENCE)
    print("Whisper nghe được:", result.transcript)

    comparison = compare_reading(REFERENCE, result.transcript)
    reference_words = comparison.references[0]
    recognized_words = comparison.hypotheses[0]

    print("\nChi tiết so khớp:")
    if comparison.wer == 0:
        print("Bản nhận diện khớp toàn bộ bài đọc.")

    for chunk in comparison.alignments[0]:
        expected = " ".join(reference_words[chunk.ref_start_idx:chunk.ref_end_idx])
        heard = " ".join(recognized_words[chunk.hyp_start_idx:chunk.hyp_end_idx])
        position = chunk.ref_start_idx + 1

        if chunk.type == "delete":
            print(f'- Vị trí {position}: bản nhận diện thiếu "{expected}".')
        elif chunk.type == "substitute":
            print(f'- Vị trí {position}: bản chuẩn là "{expected}", Whisper ghi "{heard}".')
        elif chunk.type == "insert":
            print(f'- Sau {chunk.ref_start_idx} tiếng của bản chuẩn: có thêm "{heard}".')

    points = MAX_CONTENT_POINTS * max(0, 1 - comparison.wer)
    print(f"\nSố tiếng khớp: {comparison.hits}/{len(reference_words)}")
    print(f"Tỷ lệ sai khác: {comparison.wer:.2%}")
    print(f"Điểm nội dung đề xuất: {points:.2f}/{MAX_CONTENT_POINTS}")


if __name__ == "__main__":
    main()
