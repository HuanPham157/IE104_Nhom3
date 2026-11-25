"""Thử bộ đếm khuôn mặt và quy tắc thời gian của AI_104 trên webcam cục bộ."""

import argparse
import runpy
import time
from pathlib import Path

import cv2


source = "He_Thong_Giam_Sat_Thi_Online_Voi_AI-main"
monitoring = Path(__file__).resolve().parents[3] / "AI_104" / source / source / "backend" / "monitoring"
FaceDetector = runpy.run_path(str(monitoring / "face_detector.py"))["FaceDetector"]
ViolationDetector = runpy.run_path(str(monitoring / "violation_detector.py"))["ViolationDetector"]


def analyze_frame(detector, rules, frame, timestamp_ms):
    count = len(detector.detect_faces(frame))
    brightness = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).mean() * 100 / 255
    events = rules.check_violations(count, 0, 0, brightness, [], timestamp_ms)
    return count, events


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--camera", type=int, default=0, help="Chỉ số webcam, mặc định 0")
    args = parser.parse_args()
    cap = cv2.VideoCapture(args.camera)
    detector = None
    try:
        if not cap.isOpened():
            parser.exit(1, "Không mở được webcam. Kiểm tra quyền camera hoặc thử --camera 1.\n")
        detector = FaceDetector()
        rules = ViolationDetector()
        title = "AI_104 - Webcam"
        cv2.namedWindow(title)
        while True:
            ok, frame = cap.read()
            if not ok:
                parser.exit(1, "Không đọc được ảnh từ webcam.\n")
            count, events = analyze_frame(detector, rules, frame, time.monotonic() * 1000)
            for event in events:
                print(event["type"], flush=True)
            cv2.putText(frame, f"Faces: {count} | Q / Esc: exit", (12, 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2)
            cv2.imshow(title, frame)
            if cv2.waitKey(1) & 0xFF in (ord("q"), ord("Q"), 27):
                break
            if cv2.getWindowProperty(title, cv2.WND_PROP_VISIBLE) < 1:
                break
    finally:
        cap.release()
        if detector is not None:
            detector.face_detection.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
