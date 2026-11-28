import runpy
from pathlib import Path

from app.speech.audio_quality import analyze_audio_quality


AI_SERVICE = Path(__file__).resolve().parent
PROJECT_ROOT = AI_SERVICE.parents[2]
SOURCE_DIR = PROJECT_ROOT / "AI_104"


def check_audio(audio_path):
    quality = analyze_audio_quality(audio_path)
    if not quality["total_frames"]:
        print("File quá ngắn để kiểm tra.")
        return
    print(f"Thời lượng: {quality['duration_seconds']:.2f} giây")
    print(f"Số khung giống giọng nói: {quality['voice_frames']}/{quality['total_frames']}")



def check_camera_rule():
    # Gọi lớp gốc từ dự án He_Thong_Giam_Sat_Thi_Online_Voi_AI.
    detector_file = (
        SOURCE_DIR
        / "He_Thong_Giam_Sat_Thi_Online_Voi_AI-main"
        / "He_Thong_Giam_Sat_Thi_Online_Voi_AI-main"
        / "backend"
        / "monitoring"
        / "violation_detector.py"
    )
    detector_class = runpy.run_path(str(detector_file))["ViolationDetector"]
    detector = detector_class()

    # Dự án gốc nhận timestamp theo mili giây.
    # Mô phỏng có mặt, mất mặt 3 giây, rồi xuất hiện trở lại.
    observations = [
        (10000, 1),
        (11000, 0),
        (12000, 0),
        (13000, 0),
        (14000, 0),
        (15000, 1),
    ]

    for timestamp_ms, face_count in observations:
        events = detector.check_violations(
            face_count=face_count,
            head_yaw=0,
            head_pitch=0,
            brightness=50,
            objects=[],
            timestamp=timestamp_ms,
        )
        for event in events:
            print(f"Giây {timestamp_ms // 1000}: {event['type']}")


if __name__ == "__main__":
    print("=== 1. Kiểm tra file ghi âm thật ===")
    check_audio(AI_SERVICE / "bai-doc.m4a.m4a")

    print("\n=== 2. Kiểm tra quy tắc camera bằng dữ liệu mẫu ===")
    check_camera_rule()