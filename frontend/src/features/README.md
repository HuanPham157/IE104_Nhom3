# features/

Frontend tổ chức **theo tính năng**: mỗi thư mục chứa mọi thứ của một tính năng.

```text
features/<tên>/
  components/   component của tính năng (trang được app/ import + các phần con)
  hooks/        custom hook chỉ tính năng này dùng (useXxx) — tạo khi cần
  lib/          logic thuần của tính năng (không JSX)
  types.ts      kiểu dữ liệu riêng của tính năng
```

| Tính năng | Nội dung |
|---|---|
| `auth` | Đăng nhập, đăng ký |
| `landing` | Trang giới thiệu |
| `dashboard` | Tổng quan sinh viên / giảng viên |
| `classes` | Lớp học: danh sách, chi tiết, sửa lớp, thống kê lớp |
| `assignments` | Soạn bài tập: câu hỏi, barem, lịch, nhập đề từ file |
| `exam` | Sinh viên làm bài, ghi âm, làm lại, thử micro, lịch sử bài nộp. Hook: `useAnswerRecorder` (ghi âm + nhận dạng tạm thời + tự dừng), `useExamClock` (đồng hồ làm bài) |
| `grading` | Giảng viên xem bài nộp, chấm, duyệt điểm |
| `tasks` | Việc cá nhân, lịch hạn nộp |
| `profile` | Hồ sơ sinh viên / giảng viên, cài đặt |
| `admin` | Quản trị: duyệt yêu cầu, tài khoản, lớp |

## Quy ước

- `app/` chỉ chứa route (page/layout): import component từ `features/<tên>/components/`.
- Thứ **dùng ở từ hai tính năng trở lên** không đặt trong một feature, mà ở:
  - `components/layout/` (sidebar, khung trang theo vai trò), `components/ui/` (Brand, AudioPlayer, màn hình chờ…), `components/answers/` (phân tích câu trả lời);
  - `lib/` (gọi API `oralcheck-client`, theo dõi job `answer-status`, Supabase client, hồ sơ, việc cá nhân, lịch bài tập);
  - `hooks/` (hook dùng ở nhiều tính năng, ví dụ `useAnswerWatcher` cho trang làm bài và trang chấm bài);
  - `shared/` ở gốc repo nếu backend cũng dùng.
- Một feature **không import từ feature khác**; cần dùng chung thì chuyển phần đó ra `components/` hoặc `lib/`.
