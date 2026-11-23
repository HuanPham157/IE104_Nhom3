# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Quy tắc phát triển dự án "AI OralCheck" (Project Rules)

## 1. Kiến trúc & Công nghệ
- Dự án gồm các phần:
  - `frontend/`: Next.js 16 App Router, TypeScript, Tailwind CSS — chỉ giao diện. Không tạo Route Handler (`src/app/api`); `next.config.ts` chuyển tiếp mọi `/api/*` sang backend.
  - `backend/`: NestJS (cổng `4000`, tiền tố `/api`) — toàn bộ API: `src/modules/` (auth, classes, assignments, submissions, grading, student, profiles, admin, notifications, tasks), `src/workers/grading.worker.ts`, `src/integrations/` (gọi ai-service), `src/common/` (guard, filter), `src/queue/` (pg-boss).
  - `backend/src/ai-service/`: FastAPI cổng `8001` (Faster-Whisper, engine chấm local). Không dùng API AI thương mại (OpenAI, Gemini, Claude…) trong sản phẩm.
  - `backend/src/supabase/`: các file SQL theo chức năng (xem `backend/src/supabase/README.md`).
- API không gọi AI trực tiếp: ASR và chấm điểm chạy bất đồng bộ qua hàng đợi pg-boss (`npm run worker:dev`); frontend theo dõi trạng thái qua `GET /api/submissions/:id/status`.
- Giữ nguyên các thiết kế và tài nguyên tham chiếu trong thư mục `docs/design/stitch/`.
- Frontend tổ chức theo tính năng: `frontend/src/features/<tên>/{components,hooks,lib}` (quy ước trong `frontend/src/features/README.md`); `app/` chỉ chứa route. Một feature không import từ feature khác.
- Thứ dùng ở từ hai tính năng trở lên đặt trong `frontend/src/components/` (layout, ui, answers), `frontend/src/hooks/` hoặc `frontend/src/lib/`. Dùng `"use client"` đúng mục đích tương tác UI.
- Khi không chắc API của Next.js 16, đọc tài liệu trong `frontend/node_modules/next/dist/docs/`.

## 2. Cách viết API & Phân quyền
- Phía client gọi API bằng `oralcheckFetch('/api/...')` (`frontend/src/lib/oralcheck-client.ts`, tự gắn access token); theo dõi job ASR/chấm bằng `waitForAnswer()` (`frontend/src/lib/answer-status.ts`).
- Backend: mọi route đi qua `AuthGuard` toàn cục; giới hạn vai trò bằng `@Roles(...)`, lấy người gọi bằng `@CurrentUser()`. Body thành công `{ data }`, lỗi `{ error }` (có thể kèm `code`, `details`, `warning`): ném `HttpException` (được `ApiExceptionFilter` chuẩn hóa) hoặc trả `apiJson(body, status)` rồi `reply(res, …)` khi cần body/mã trạng thái riêng.
- Mã dùng chung cho cả frontend và backend đặt trong `shared/` (TypeScript thuần, không import thư viện): frontend import qua `@shared/*`, backend bằng đường dẫn tương đối. Không sao chép file giữa hai bên.
- Logic chỉ phía server đặt trong `backend/src/common/lib/`; route JSON nhận body bằng `@JsonBody()` (body rỗng / không phải JSON → `null`).
- Vai trò chuẩn lấy từ `public.users.role`: `student`, `lecturer`, `admin`. Không lấy quyền từ `public.profiles` hay `user_metadata`.
- Thao tác ghi dữ liệu đi qua RPC trong Supabase (`db.rpc(...)`).
- Không trả barem cho sinh viên. Đáp án tham khảo chỉ trả cho sinh viên khi đã nộp bài và giảng viên bật `assignments.show_reference_answer`.

## 3. Bảo mật & Biến môi trường
- Tuyệt đối không đọc, in hoặc ghi nội dung tệp `.env.local`, `backend/.env` hoặc `backend/src/ai-service/.env` vào chat hoặc log.
- Không ghi mật khẩu, access token hay bí mật hệ thống vào log hoặc git.
- Mọi dữ liệu nhạy cảm chỉ được giữ qua `.env.example` dạng khóa trống.

## 4. Cơ sở dữ liệu
- SQL được chạy tay trong Supabase SQL Editor theo thứ tự `backend/src/supabase/migrations/01` → `11` (mỗi file một nhóm chức năng, idempotent).
- Sửa chức năng nào thì sửa thẳng định nghĩa trong file của chức năng đó (không tạo file "vá" mới), rồi ghi rõ cần chạy lại file nào.
- Database đã chạy bộ cũ `000 → 012`: chạy lại `01 → 11`, sau đó `cleanup_legacy.sql`.

## 5. Lệnh chạy
- Chạy web (từ thư mục gốc): `npm run dev` → http://localhost:3000
- Web gọi API qua backend: cần chạy backend cùng lúc với web (Next.js chuyển tiếp `/api/*` tới `BACKEND_URL`, mặc định `http://localhost:4000`).
- Chạy backend API và worker (trong `backend/`, cần `backend/.env`):
  - `npm run start:dev` → http://localhost:4000/api
  - `npm run worker:dev` (worker ASR → chấm điểm)
  - Kiểm tra: `npm run typecheck` và `npm run build`
- Chạy AI service:
  ```bash
  cd backend/src/ai-service && source .venv/bin/activate
  uvicorn app.main:app --reload --port 8001 --env-file .env
  ```
- Kiểm thử và đánh giá engine chấm điểm (trong `backend/src/ai-service/`, venv đã kích hoạt):
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
- Thay đổi ở backend: `npm run typecheck` và `npm run build` (trong `backend/`).
- Sau mỗi lần chỉnh sửa tính năng, phải nêu rõ các bước thao tác trên trình duyệt và kết quả cần thấy.
