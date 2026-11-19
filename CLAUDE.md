# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Quy tắc phát triển dự án "AI OralCheck" (Project Rules)

## 1. Kiến trúc & Công nghệ
- Dự án gồm 3 phần:
  - `frontend/`: Next.js 16 App Router, TypeScript, Tailwind CSS — chứa cả giao diện và API (`frontend/src/app/api`).
  - `ai-service/`: FastAPI chạy ở cổng `8001` (Faster-Whisper nhận dạng giọng nói, engine chấm điểm local trong `app/assessment/`). Không dùng API AI thương mại (OpenAI, Gemini, Claude…) trong sản phẩm.
  - `supabase/`: các file SQL (bảng, RLS, RPC).
- Thư mục `backend/` chưa được dùng, không thêm code vào đó.
- Giữ nguyên các thiết kế và tài nguyên tham chiếu trong thư mục `docs/design/stitch/`.
- Ưu tiên cấu trúc Component phân rã sạch sẽ trong `frontend/src/components/`, dùng `"use client"` đúng mục đích tương tác UI.
- Logic dùng chung đặt trong `frontend/src/lib/`.
- Khi không chắc API của Next.js 16, đọc tài liệu trong `frontend/node_modules/next/dist/docs/`.

## 2. Cách viết API & Phân quyền
- Phía client gọi API bằng `oralcheckFetch()` (`frontend/src/lib/oralcheck-client.ts`).
- Mỗi Route Handler bắt đầu bằng `authenticateRole(request, [...vai trò])` và trả kết quả bằng `apiJson()` (`frontend/src/lib/oralcheck-api.ts`).
- Vai trò chuẩn lấy từ `public.users.role`: `student`, `lecturer`, `admin`. Không lấy quyền từ `public.profiles` hay `user_metadata`.
- Thao tác ghi dữ liệu đi qua RPC trong Supabase (`db.rpc(...)`).
- Không trả barem cho sinh viên. Đáp án tham khảo chỉ trả cho sinh viên khi đã nộp bài và giảng viên bật `assignments.show_reference_answer`.

## 3. Bảo mật & Biến môi trường
- Tuyệt đối không đọc, in hoặc ghi nội dung tệp `.env.local` hoặc `ai-service/.env` vào chat hoặc log.
- Không ghi mật khẩu, access token hay bí mật hệ thống vào log hoặc git.
- Mọi dữ liệu nhạy cảm chỉ được giữ qua `.env.example` dạng khóa trống.

## 4. Cơ sở dữ liệu
- SQL được chạy tay trong Supabase SQL Editor theo thứ tự: `000` → `005`, rồi `supabase/seed.sql`, rồi `006` → `007` → `008` → `009` → `010`.
- Khi sửa schema hoặc RPC, ghi rõ cần chạy lại file SQL nào.

## 5. Lệnh chạy
- Chạy web (từ thư mục gốc): `npm run dev` → http://localhost:3000
- Chạy AI service:
  ```bash
  cd ai-service && source .venv/bin/activate
  uvicorn app.main:app --reload --port 8001 --env-file .env
  ```
- Kiểm thử và đánh giá engine chấm điểm (trong `ai-service/`, venv đã kích hoạt):
  - `python -m pytest tests -q`
  - `python -m scripts.evaluate_grader --cases` (so với điểm kỳ vọng; `--calibrate` để dò lại ngưỡng)
- Chạy test Playwright (trong `frontend/`):
  - Tất cả: `npx playwright test --project=chromium`
  - Một file: `npx playwright test ../tests/class-join.spec.ts --project=chromium`

## 6. Quy trình thực hiện & Kiểm tra (Verification)
- Mọi thay đổi mã nguồn phải được kiểm tra thực tế bằng 3 lệnh chuẩn (chạy trong `frontend/`):
  1. `npx eslint .`
  2. `npx tsc --noEmit`
  3. `npm run build`
- Sau mỗi lần chỉnh sửa tính năng, phải nêu rõ các bước thao tác trên trình duyệt và kết quả cần thấy.
