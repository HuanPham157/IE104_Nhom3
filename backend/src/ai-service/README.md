# AI service

FastAPI service chạy hoàn toàn local: speech-to-text bằng Faster-Whisper và chấm điểm theo rubric bằng engine Sentence Transformers/PhoBERT (`app/assessment/`). Kiểm thử: `pip install -r requirements-dev.txt && python -m pytest tests -q`; đánh giá: `python -m scripts.evaluate_grader`.

## Cài đặt và chạy

Cần Python 3.9–3.12 (dự án đang chạy với 3.9). Không cần FFmpeg hay PyTorch: Faster-Whisper đọc audio bằng PyAV đi kèm. Cấu hình model và các bước chống transcript sai xem mục *Nhận dạng giọng nói* trong [README gốc](../../../README.md#nhận-dạng-giọng-nói-faster-whisper--chạy-trên-máy). Máy môi trường dev đã có `ai-service/.venv`; để tạo lại:

```bash
cd backend/src/ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001 --env-file .env
```

Không cần API key nào: chấm rubric dùng engine local trong `app/assessment/` (model `GRADER_EMBEDDING_MODEL`, mặc định `keepitreal/vietnamese-sbert`). Chọn `WHISPER_MODEL` (mặc định `small`; xem thêm `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, `WHISPER_WORKERS`). Tạo `AI_SERVICE_TOKEN` ngẫu nhiên rồi dùng cùng giá trị trong `backend/.env` và `backend/src/ai-service/.env`. Faster-Whisper không cần API key; model được tải từ Hugging Face khi gọi STT lần đầu. `POST /api/transcribe` trả `transcript`, `confidence` (0–1) và `dropped_segments` (số đoạn bị loại vì im lặng/bịa chữ).

Health check: `GET http://localhost:8001/health`. Các endpoint STT và grading cần header nội bộ `X-AI-Service-Token`; worker NestJS gọi chúng khi xử lý bài nộp trong hàng đợi.
