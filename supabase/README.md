# Supabase

- `migrations/000` → `005`: schema gốc, RLS, RPC nghiệp vụ, pipeline AI.
- `seed.sql`: **hàm dùng chung** (tái sử dụng) — `require_app_role`, `can_manage_assignment`, `assert_draft_assignment_editable`, `is_within_exam_time`, `latest_transcript` / `first_transcript`, `start_answer_ai_processing`, `mark_answer_ai_failed`. Không chứa dữ liệu cá nhân.
- `migrations/006_oral_exam_features.sql`: tính năng làm bài (nhiều phiên bản ghi âm, chọn bản nộp, đồng hồ), barem chấm chung, giảng viên kích hoạt chấm AI — gọi lại các hàm trong `seed.sql`.

- `migrations/007_reference_answer_visibility.sql`: giảng viên chọn cho sinh viên xem đáp án tham khảo sau khi nộp bài (`assignments.show_reference_answer`).

- `migrations/008_personal_tasks.sql`: “Việc cá nhân” của sinh viên — hạn chót, mức ưu tiên, ghi chú, thời điểm hoàn thành.

- `migrations/009_assignment_retakes.sql`: làm lại cả bài (giảng viên đặt 1–5 lần); được làm lại khi lượt trước đã có điểm và còn hạn nộp; điểm chính thức là lượt cao nhất được giảng viên duyệt.
- `migrations/010_publish_after_deadline.sql`: chỉ công bố điểm sau hạn nộp (bài không đặt hạn thì công bố lúc nào cũng được).

Thứ tự chạy trên SQL Editor: `000 → 005` → `seed.sql` → `006` → `007` → `008` → `009` → `010`.

Lưu ý khi chuyển sang Supabase CLI: `supabase db reset` chạy `seed.sql` **sau** mọi migration, nên khi đó cần chuyển các hàm dùng chung thành một migration riêng đứng trước `006` (ví dụ `005a_shared_functions.sql`).
