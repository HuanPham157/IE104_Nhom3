# Quy tắc phát triển dự án "Việc học của tôi" (Project Rules)

## 1. Kiến trúc & Công nghệ
- Sử dụng Next.js App Router (`src/app`), TypeScript và Tailwind CSS đang được cấu hình trong dự án.
- Giữ nguyên các thiết kế và tài nguyên tham chiếu trong thư mục `design/stitch/`.
- Ưu tiên cấu trúc Component phân rã sạch sẽ trong `src/components/`, dùng `"use client"` đúng mục đích tương tác UI.

## 2. Bảo mật & Biến môi trường
- Tuyệt đối không đọc, in hoặc ghi nội dung tệp `.env.local` vào chat hoặc log.
- Không ghi mật khẩu, access token hay bí mật hệ thống vào log hoặc git.
- Mọi dữ liệu nhạy cảm chỉ được giữ qua `.env.example` dạng khóa trống.

## 3. Quy trình thực hiện & Kiểm tra (Verification)
- Mọi thay đổi mã nguồn phải được kiểm tra thực tế bằng 3 lệnh chuẩn:
  1. `npx eslint .`
  2. `npx tsc --noEmit`
  3. `npm run build`
- Sau mỗi lần chỉnh sửa tính năng, phải nêu rõ các bước thao tác trên trình duyệt và kết quả cần thấy.