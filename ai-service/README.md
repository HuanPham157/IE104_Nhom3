# AI service

FastAPI service cho Whisper STT và rubric-based AI grading.

## Cài đặt và chạy

Cần Python 3.8–3.11 (dự án đang chạy với 3.9) và FFmpeg. Hướng dẫn cài Whisper đầy đủ (FFmpeg theo hệ điều hành, lỗi `tiktoken`/Rust, chọn model) xem mục *Cài Whisper* trong [README gốc](../README.md#cài-whisper-openai-whisper--nhận-dạng-giọng-nói-chạy-trên-máy). Máy môi trường dev đã có `ai-service/.venv`; để tạo lại:

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001 --env-file .env
```

Cấu hình `OPENAI_API_KEY` để bật chấm rubric, chọn `OPENAI_GRADING_MODEL` và `WHISPER_MODEL`. Tạo `AI_SERVICE_TOKEN` ngẫu nhiên rồi dùng cùng giá trị trong `frontend/.env.local` và `ai-service/.env`. Local Whisper không cần API key; model được tải khi gọi STT lần đầu.

Health check: `GET http://localhost:8001/health`. Các endpoint STT và grading cần header nội bộ `X-AI-Service-Token`; Next.js gọi chúng sau khi xác thực sinh viên và quyền truy cập submission.
