# Thiết kế chức năng tham gia lớp bằng mã

## Thông tin bài làm

- Họ tên: [Bổ sung họ tên]
- MSSV: [Bổ sung MSSV]
- Chức năng: Sinh viên tham gia lớp học bằng mã lớp
- Phạm vi: Một màn hình, một thao tác ghi dữ liệu, ba ca kiểm thử

## 1. Yêu cầu người dùng

Với vai trò sinh viên đã đăng nhập, tôi muốn nhập mã của một lớp đang hoạt động để tham gia lớp và xem được bài tập của lớp đó.

### Điều kiện trước

- Tài khoản Supabase Auth hợp lệ, có hồ sơ ứng dụng `role = 'student'` và `account_status = 'active'`.
- Lớp đã được quản trị viên duyệt, có `status = 'active'` và mã lớp gồm 6–10 chữ/số.
- Với ca thành công, sinh viên chưa có thành viên đang hoạt động trong lớp đó.

### Quy tắc nghiệp vụ

| Quy tắc | Điều kiện | Phản hồi giao diện/API | Thay đổi dữ liệu |
|---|---|---|---|
| R1 – Tham gia thành công | Mã thuộc lớp đang hoạt động và sinh viên chưa tham gia | Giao diện báo tham gia thành công; API trả `201` và `class_id` | Tạo đúng một dòng `class_members` đang hoạt động |
| R2 – Đã tham gia | Sinh viên đã có dòng thành viên `active` của lớp | Giao diện báo đã tham gia trước đó; API trả `409`, mã `ALREADY_JOINED` | Không thêm, cập nhật hoặc xóa dòng nào |
| R3 – Mã không có lớp hoạt động | Không có lớp `active` mang mã đã nhập | Giao diện báo không tìm thấy lớp; API trả `404`, mã `CLASS_NOT_FOUND` | Không thay đổi dữ liệu |

Mã có định dạng sai bị từ chối ở API với `400` trước khi gọi cơ sở dữ liệu. Trường hợp thành viên cũ có trạng thái `left` hoặc `removed` được phép tham gia lại; cập nhật lại chính dòng theo khóa chính thay vì tạo dòng thứ hai.

## 2. Thiết kế dữ liệu

Tái sử dụng các bảng hiện có trong `supabase/ie104_supabase_schema.sql`, không thêm bảng mới.

| Bảng | Trường liên quan | Khóa/ràng buộc |
|---|---|---|
| `users` | `id`, `role`, `account_status` | `id` là PK/FK tới `auth.users`; chỉ hồ sơ sinh viên đang hoạt động mới được tham gia |
| `classes` | `id`, `class_code`, `status` | `id` là PK; `class_code` là UNIQUE; `status` thuộc `pending`, `active`, `rejected`, `archived` |
| `class_members` | `class_id`, `student_id`, `status`, `joined_at`, `left_at` | PK ghép `(class_id, student_id)`; FK tới `classes.id` và `users.id`; trạng thái giới hạn ở `active`, `left`, `removed` |

Quan hệ: `classes 1—N class_members N—1 users`. Khóa chính ghép đảm bảo mỗi sinh viên chỉ có tối đa một dòng lịch sử cho mỗi lớp. Hàm RPC dùng `INSERT ... ON CONFLICT ... WHERE status <> 'active'` để thao tác thêm/tham gia lại an toàn; nếu dòng đã `active`, hàm báo lỗi mà không cập nhật dòng.

## 3. Luồng nghiệp vụ và hợp đồng API

1. Sinh viên mở `/student/classes`, chọn **Tham gia lớp bằng mã** và nhập mã.
2. `StudentClasses.handleJoinClass` chuẩn hóa mã và gửi `POST /api/classes/join`.
3. Route handler xác thực bearer token, xác nhận role `student`, rồi kiểm tra dữ liệu bằng Zod.
4. Route gọi RPC `join_class_by_code` trên Supabase. RPC kiểm tra vai trò và trạng thái lớp; giao dịch tạo dòng tham gia nếu hợp lệ.
5. RPC thành công trả `class_id`; API trả `201`. Giao diện báo thành công và tải lại danh sách lớp.
6. Nếu đã tham gia, RPC từ chối và không cập nhật dòng; API trả `409 ALREADY_JOINED`.
7. Nếu mã không thuộc lớp hoạt động, RPC từ chối trước thao tác ghi; API trả `404 CLASS_NOT_FOUND`.

Các nhánh từ chối được kiểm tra trong máy chủ và cơ sở dữ liệu, không dựa vào việc ẩn/khóa nút giao diện.

## 4. Vị trí mã nguồn

| Phần | Vị trí | Trách nhiệm |
|---|---|---|
| Giao diện | `src/components/StudentClasses.tsx` | Form nhập mã, gọi API, thông báo thành công/lỗi và tải lại lớp |
| API | `src/app/api/classes/join/route.ts` | Xác thực role, kiểm tra định dạng, ánh xạ kết quả nghiệp vụ thành HTTP |
| Nghiệp vụ/lưu trữ | `supabase/oralcheck_backend.sql`, hàm `join_class_by_code` | Kiểm tra lớp đang hoạt động, chặn trùng, ghi thành viên trong một RPC |
| Lược đồ | `supabase/ie104_supabase_schema.sql` | Bảng, khóa chính/ngoại, ràng buộc duy nhất và trạng thái |
| Kiểm thử | `tests/class-join.spec.ts`, `TEST_REPORT.md` | TC01–TC03 qua API thật và đối chiếu dòng dữ liệu |

## 5. Chuẩn bị dữ liệu và chạy thử

1. Chạy schema và backend theo thứ tự trong `README.md`; sau khi cập nhật backend, chạy lại `supabase/oralcheck_backend.sql` trên Supabase SQL Editor.
2. Dùng tài khoản sinh viên thử nghiệm, một lớp `active` mà tài khoản chưa tham gia, và một mã không gắn với lớp `active`. Không dùng dữ liệu sinh viên thật.
3. Điền các biến `TEST_CLASS_JOIN_*` còn trống trong `.env.local` theo `.env.example`. `TEST_CLASS_JOIN_AVAILABLE_ID` là UUID của lớp thử.
4. Chạy `npx playwright test tests/class-join.spec.ts --project=chromium`.
5. Test TC01 tạo thành viên thử nghiệm và giữ dữ liệu để kiểm tra; trước lần chạy lại, giảng viên/admin cần gỡ tài khoản thử khỏi lớp. Chụp ảnh giao diện, phản hồi Network và dòng `class_members` trước/sau vào `evidence/`.

## 6. Giới hạn

- Chức năng yêu cầu Supabase đã cấu hình; không có kho dữ liệu giả hoặc fallback thành công.
- Mã lớp không hoạt động được xử lý như không tìm thấy, không tiết lộ trạng thái lớp đang chờ duyệt/lưu trữ.
- Test tích hợp ghi một thành viên vào cơ sở dữ liệu thử nghiệm và không tự xóa dữ liệu đó; cần chuẩn bị/reset bằng tài khoản giảng viên hoặc admin.
