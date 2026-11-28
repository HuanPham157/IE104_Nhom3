# Backend AI OralCheck

API NestJS và worker chấm bài dùng chung mã trong `src/`. Từ thư mục `backend/`, chạy `npm ci`, cấu hình `.env` theo `.env.example`, sau đó mở hai terminal cho `npm run start:dev` và `npm run worker:dev`. Trên PowerShell có thể gọi `npm.cmd`.

- [Các module API](src/modules) xử lý yêu cầu từ giao diện Next.js.
- [Worker](src/workers/grading.worker.ts) lấy bài từ hàng đợi và gọi [AI service Python](src/ai-service/README.md).
- [Supabase](src/supabase/README.md) chứa SQL theo nhóm chức năng và dữ liệu mẫu.

Xem [hướng dẫn của dự án](../README.md) để cấu hình Supabase, kết nối hàng đợi và khởi động đầy đủ các dịch vụ.
