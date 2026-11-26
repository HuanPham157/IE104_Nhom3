# Danh sách lỗi phát hiện khi kiểm thử (`docs/BUGS.md`)

Ghi nhận trung thực các lỗi/sai lệch phát hiện được trong quá trình rà soát mã nguồn và viết test đối chiếu đặc tả SRS/NFR (không sửa test để che lỗi).

---

### BUG-01: API nộp file ghi âm chấp nhận tệp tới 25 MB, vượt quá ngưỡng 5 MB trong đặc tả NFR-03
- **Mức độ nghiêm trọng:** Trung bình
- **Vị trí phát hiện:** `src/app/api/assignments/[id]/answers/route.ts` và `src/lib/oralcheck-validators.ts` (`MAX_AUDIO_BYTES = 25 * 1024 * 1024`)
- **Test code phát hiện:** `UT-05` trong `tests/unit/oralcheck-validators.test.ts` (khi đối chiếu ngưỡng `5 MB` của tài liệu SRS / Báo cáo Milestone 2 mục NFR-03 với hằng số thực tế trong code).
- **Bước tái hiện:**
  1. Đăng nhập tài khoản sinh viên hợp lệ.
  2. Gửi `POST /api/assignments/[id]/answers` với tệp `.webm` dung lượng `10 MB` (lớn hơn ngưỡng `5 MB` theo NFR-03 nhưng nhỏ hơn `25 MB`).
- **Kết quả mong đợi (theo NFR-03):** Hệ thống từ chối tệp vượt quá `5 MB` với mã `400 Bad Request` để tránh nghẽn băng thông và quá tải STT.
- **Kết quả thực tế:** Hệ thống hiện cho phép tải lên tệp tới `25 MB` (chỉ từ chối khi `> 25 MB`), khớp với giới hạn bucket `oral-answers` nhưng chưa đồng bộ với ngưỡng `5 MB` trong đặc tả NFR-03.

---

### BUG-02: API chấm/duyệt điểm cho phép điểm số tối đa tới `999.99` thay vì kiểm tra theo thang điểm câu hỏi (`max_score = 10`)
- **Mức độ nghiêm trọng:** Cao
- **Vị trí phát hiện:** `src/app/api/submissions/[id]/review/route.ts` / `reviewSubmissionSchema` (`final_score: z.number().min(0).max(999.99)`)
- **Test code phát hiện:** `UT-04` trong `tests/unit/oralcheck-validators.test.ts` và `IT-05` trong `tests/integration/class-and-review-api.test.ts`.
- **Bước tái hiện:**
  1. Giảng viên gọi `POST /api/submissions/[id]/review` với `{ "final_score": 500, "score_modified": true, "reviewer_feedback": "Test" }` cho một câu hỏi có `max_score = 10`.
- **Kết quả mong đợi:** API phải chặn nếu `final_score > question.max_score` (hoặc thang điểm 10) và trả `400 Bad Request`.
- **Kết quả thực tế:** `reviewSubmissionSchema` tại tầng API Next.js vẫn cho `safeParse` vượt qua bất kỳ giá trị nào `<= 999.99` (phụ thuộc hoàn toàn vào kiểm tra ở RPC/UI), có nguy cơ lưu điểm sai lệch nếu RPC không ràng buộc theo từng câu hỏi.

---

### BUG-03: Các cảnh báo biến trạng thái bộ lọc chưa được nối ở giao diện Lớp học Giảng viên
- **Mức độ nghiêm trọng:** Thấp
- **Vị trí phát hiện:** `src/components/TeacherClasses.tsx` (dòng 104–106: `setFaculty`, `setStatus`, `setSort` chưa được dùng trong JSX).
- **Công cụ phát hiện:** `npx eslint` khi rà soát tích hợp mã nguồn.
- **Kết quả mong đợi:** Các dropdown lọc theo khoa/trạng thái/sắp xếp hoạt động đầy đủ hoặc loại bỏ state thừa.
- **Kết quả thực tế:** Hiện mới có ô tìm kiếm và tab lọc đang hoạt động; 3 setter `setFaculty`, `setStatus`, `setSort` tạo cảnh báo unused-vars.
