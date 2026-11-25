# Supabase (database)

Mỗi file trong `migrations/` là **trạng thái cuối cùng** của một nhóm chức năng (không còn các bản sửa chồng lên nhau).
Tất cả đều idempotent (`if not exists`, `create or replace`, `drop … if exists` trước khi tạo), nên khi sửa
một chức năng chỉ cần sửa đúng file đó rồi chạy lại file đó.

| File | Nội dung |
| --- | --- |
| `migrations/01_tables.sql` | Bảng, ràng buộc, index, bật RLS, quyền đọc bảng/cột |
| `migrations/02_helpers.sql` | Hàm dùng chung: vai trò, quyền xem/quản lý, thời gian làm bài, lượt làm, transcript, lõi vòng đời AI |
| `migrations/03_views.sql` | View theo vai trò (rubric, câu hỏi kèm đáp án, lượt nộp kèm điểm, kết quả của sinh viên) |
| `migrations/04_policies.sql` | RLS policies, bucket audio `oral-answers` và quyền trên file |
| `migrations/05_auth_signup.sql` | Trigger tạo hồ sơ khi đăng ký |
| `migrations/06_classes.sql` | Lớp học: tạo/duyệt/hủy/sửa lớp, tham gia bằng mã, thành viên |
| `migrations/07_assignments.sql` | Soạn bài tập: câu hỏi + rubric, công bố, thời lượng, barem, đáp án, số lần làm lại |
| `migrations/08_submissions.sql` | Làm bài: bắt đầu/làm lại, ghi âm nhiều phiên bản, chọn bản nộp, sửa transcript, nộp bài, tiến độ |
| `migrations/09_grading.sql` | Chấm điểm: quyền gửi job, các bước của worker (service_role), lưu đánh giá AI, giảng viên duyệt, công bố điểm |
| `migrations/10_profiles_admin.sql` | Học hàm / học vị, admin khóa / mở khóa tài khoản |
| `migrations/11_tasks.sql` | Việc cá nhân của sinh viên (trigger cập nhật thời điểm) |
| `seed.sql` | Dữ liệu mẫu cho dev (UUID giữ chỗ) |
| `cleanup_legacy.sql` | Chỉ cho database đã chạy bộ migration cũ `000 → 012`: xóa bảng `profiles` và các RPC không còn dùng |

## Thứ tự chạy (Supabase SQL Editor)

`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11`, sau đó (tùy chọn) `seed.sql`.

**Database đã chạy bộ cũ `000 → 012`:** chạy lại `01 → 11` (an toàn, kết quả giống hệt DB dựng mới),
rồi chạy `cleanup_legacy.sql` sau khi chắc chắn bảng `public.profiles` không còn dữ liệu cần giữ.

Hàng đợi job của backend (pg-boss) tự tạo schema `pgboss` khi backend/worker khởi động lần đầu — không cần SQL riêng.
