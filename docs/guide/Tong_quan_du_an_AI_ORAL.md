---
title: "AI ORAL / AI OralCheck — Mô tả dự án"
course: IE104 - Internet và công nghệ web  
---

# AI ORAL (AI OralCheck) — Tổng quan dự án

## 1. Tổng quan đề tài

AI ORAL là nền tảng web hỗ trợ tổ chức bài kiểm tra vấn đáp ngắn. Giảng viên soạn lớp, bài tập và rubric; sinh viên làm bài và gửi câu trả lời; hệ thống có thiết kế luồng nhận dạng giọng nói và chấm theo rubric; giảng viên xem xét, chỉnh điểm và công bố kết quả. Mục tiêu là giảm khối lượng nghe và ghi nhận xét thủ công nhưng giữ quyền quyết định điểm cuối cùng ở giảng viên. 

| Thuộc tính | Thông tin |
|---|---|
| Tên | AI ORAL / AI OralCheck |
| Môn học, nhóm | Internet và Công nghệ Web (IE104), Nhóm 3.R11 |
| Bài toán | Tổ chức kiểm tra vấn đáp qua web, hỗ trợ ghi nhận câu trả lời và đánh giá theo rubric |
| Người dùng | Sinh viên, giảng viên, quản trị viên |
| Nền tảng chính | Next.js web app, backend NestJS + worker chấm điểm, Supabase; AI service Python/FastAPI trong `backend/src/ai-service` |

### 1.1. Bối cảnh

Thi vấn đáp giúp đánh giá khả năng trình bày và lập luận nhưng khó mở rộng cho lớp đông: giảng viên phải phỏng vấn, nghe và ghi nhận xét cho từng sinh viên. Theo báo cáo, khảo sát được thực hiện với 45 sinh viên và phỏng vấn 3 giảng viên; 82,2% sinh viên cho biết áp lực khi đối đáp trực tiếp, 95,6% muốn nghe lại bản ghi trước khi nộp, còn giảng viên ước tính 8–12 phút để đánh giá một câu trả lời. Đây là số liệu do báo cáo cung cấp.

### 1.2. Mục tiêu
Mục tiêu sản phẩm là đưa quy trình lên web, hỗ trợ giảng viên xây dựng barem/rubric và nhận gợi ý đánh giá có dẫn chứng. AI đưa ra đề xuất; giảng viên vẫn nghe lại, sửa điểm và quyết định công bố. Báo cáo đặt các mục tiêu như hoàn tất quy trình đầu cuối, khớp ý chính ít nhất 85% trên tập 20 câu trả lời mẫu, xử lý STT và LLM dưới 15 giây, audio dưới 5 MB và kiểm soát truy cập theo vai trò. Đây là tiêu chí/kết quả được nêu trong báo cáo; chúng chưa được kiểm chứng độc lập trong tài liệu này.

### 1.3. Phạm vi sản phẩm

- **Trong phạm vi hướng tới:** xác thực và vai trò; quản lý lớp; tham gia lớp bằng mã; soạn bài, câu hỏi và rubric; ghi âm/nộp câu trả lời; xử lý STT và gợi ý chấm; giảng viên duyệt/sửa điểm; công bố kết quả.
- **Ngoài phạm vi MVP theo báo cáo:** phân tích cảm xúc hoặc ngữ điệu qua webcam, tự động công bố điểm không cần giảng viên, tích hợp LMS bên ngoài và thanh toán dịch vụ AI.
- **Phần còn lại từ bài thực hành trước:** trang `/tasks` có CRUD công việc cá nhân bên cạnh giao diện bài Oral. README phân biệt dữ liệu thật với nội dung demo trên một số dashboard.

## 3. Người dùng và quyền hạn

| Vai trò | Nhu cầu và trách nhiệm chính |
|---|---|
| Sinh viên | Tham gia lớp, xem bài được giao, làm và gửi bài, theo dõi kết quả sau khi được công bố |
| Giảng viên | Tạo lớp/bài tập/rubric, xem câu trả lời, đánh giá và chỉnh điểm, công bố kết quả |
| Quản trị viên | Duyệt yêu cầu mở/hủy lớp, quản lý trạng thái lớp và vận hành một số chức năng quản trị |

Báo cáo mô tả phân quyền cho audio, transcript, bài nộp và điểm. Repository có các lớp bảo vệ ở API và SQL/RLS; một số chức năng quản trị tài khoản và dashboard AI vẫn được README ghi nhận là chưa triển khai.

## 4. Quy trình nghiệp vụ chính

1. Giảng viên tạo lớp; yêu cầu mở lớp được gửi quản trị viên duyệt.
2. Sinh viên tham gia lớp bằng mã lớp.
3. Giảng viên tạo bài tập, nhập câu hỏi, thời gian và đáp án/rubric; lưu nháp hoặc công bố.
4. Sinh viên mở bài được giao, ghi âm hoặc gửi câu trả lời theo luồng dự kiến.
5. Dịch vụ nhận dạng giọng nói tạo transcript; engine chấm tạo điểm gợi ý và nhận xét theo tiêu chí.
6. Giảng viên nghe audio, xem transcript và gợi ý; có thể chấm tay hoặc điều chỉnh điểm AI.
7. Giảng viên công bố kết quả; sinh viên xem điểm và phản hồi theo quyền được cấp.

Báo cáo đặt quy tắc nghiệp vụ như thời lượng âm thanh 15–120 giây, giới hạn tệp 5 MB, tối đa 3 lớp chờ duyệt mỗi giảng viên, chặn lớp trùng tên và chỉ hiển thị điểm chính thức sau khi công bố. Cấu hình hiện trong mã có thể khác một số con số của tài liệu: ví dụ API tải audio cho phép tối đa 25 MB, trong khi báo cáo ghi 5 MB. Cần thống nhất lại đặc tả với triển khai trước khi nghiệm thu.

## 5. Kiến trúc và công nghệ

```text
Trình duyệt (Next.js App Router: giao diện theo vai trò; /api/* được rewrite sang backend)
  ├─ Backend API NestJS (backend/, cổng 4000): xác thực vai trò, gọi RPC, lưu audio, GỬI JOB
  │    └─ Hàng đợi pg-boss (trong Postgres của Supabase)
  │          └─ Worker chấm điểm (backend, process riêng): ASR → chấm → lưu điểm
  │                └─ AI service Python/FastAPI (backend/src/ai-service, cổng 8001)
  │                      ├─ Faster-Whisper: chuyển audio thành transcript
  │                      └─ Engine chấm local: Sentence Transformers/PhoBERT và rubric
  └─ Supabase: Auth, PostgreSQL, RLS, Storage riêng tư và RPC nghiệp vụ
```

| Thành phần | Công nghệ / vai trò |
|---|---|
| Web | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 |
| Backend API | NestJS 11: `AuthGuard` toàn cục + `@Roles`; module `auth`, `classes`, `assignments`, `submissions`, `grading`, `student`, `profiles`, `admin`, `notifications`, `tasks` |
| Xử lý bất đồng bộ | Hàng đợi pg-boss + worker `grading.worker.ts`; API không gọi AI trực tiếp |
| Kết nối web ↔ API | Next.js chỉ làm giao diện; `rewrites` chuyển tiếp `/api/*` tới backend (một origin, không cần CORS) |
| CSDL và đăng nhập | Supabase PostgreSQL, Supabase Auth, Row Level Security |
| Tệp âm thanh | Supabase Storage, bucket riêng tư `oral-answers` (tối đa 25 MB, chỉ định dạng âm thanh) |
| STT và đánh giá | Python/FastAPI, Faster-Whisper và engine chấm rubric chạy local (không dùng API AI thương mại) |
| Kiểm thử web | Playwright trong `frontend/tests/` |

Nhận dạng giọng nói và chấm điểm có thể mất từ vài giây đến vài phút, nên chạy **bất đồng bộ**: API lưu audio rồi đưa job vào hàng đợi và trả về ngay; worker lấy job, gọi AI service, lưu transcript/điểm qua RPC chỉ cấp cho `service_role`; frontend theo dõi trạng thái qua `GET /api/submissions/:id/status`. Backend dùng phiên đăng nhập (JWT Supabase) của người dùng nên RLS vẫn áp dụng; chỉ worker dùng `SUPABASE_SECRET_KEY`. Worker và AI service xác thực với nhau bằng `AI_SERVICE_TOKEN`.

## 6. Dữ liệu và mô hình nghiệp vụ

Các file SQL trong `backend/src/supabase/migrations/` định nghĩa các thực thể chính:

- Tài khoản và hồ sơ: `users` (vai trò chuẩn), `student_profiles`, `lecturer_profiles` (gồm học hàm / học vị).
- Lớp học: `classes`, `class_members`, `approval_requests`, `notifications`.
- Bài đánh giá: `assignments`, `questions`, `rubric_criteria`, `assignment_grading_guides`.
- Lượt làm và câu trả lời: `assignment_submissions`, `submissions`.
- Kết quả: `transcriptions`, `evaluations`, `evaluation_criterion_scores`, `grade_reviews`.
- Công việc cá nhân: `tasks`.

SQL được tổ chức theo chức năng, mỗi file giữ trạng thái cuối cùng (không còn các bản vá chồng lên nhau) và chạy lại an toàn: `01_tables` (bảng, ràng buộc, index), `02_helpers` (hàm dùng chung), `03_views`, `04_policies` (RLS, bucket audio), `05_auth_signup`, `06_classes`, `07_assignments`, `08_submissions`, `09_grading` (hàng đợi, worker, duyệt và công bố điểm), `10_profiles_admin`, `11_tasks`. Thứ tự chạy `01 → 11`; `backend/src/supabase/README.md` mô tả chi tiết. Database đã cài bộ migration cũ `000 → 012` chạy lại `01 → 11` rồi `cleanup_legacy.sql` để bỏ bảng `profiles` và các RPC chấm đồng bộ không còn dùng.

## 7. Cơ sở dữ liệu mục tiêu

Cơ sở dữ liệu mục tiêu là PostgreSQL do Supabase quản lý, lưu dữ liệu tài khoản, lớp học, bài tập, bài nộp, audio và kết quả đánh giá. Báo cáo Milestone 2 mô tả ERD ban đầu gồm 10 thực thể cốt lõi; các migration hiện có đã mở rộng thành các bảng phục vụ hồ sơ vai trò, thành viên lớp, lượt làm, rubric, transcript, điểm AI, duyệt điểm, yêu cầu phê duyệt và thông báo.

| Nhóm dữ liệu | Bảng tiêu biểu | Vai trò trong hệ thống |
|---|---|---|
| Người dùng | `users`, `student_profiles`, `lecturer_profiles` | Danh tính ứng dụng, vai trò chuẩn và thông tin theo vai trò |
| Lớp học | `classes`, `class_members`, `approval_requests` | Lớp, thành viên và quy trình duyệt |
| Bài đánh giá | `assignments`, `questions`, `rubric_criteria`, `assignment_grading_guides` | Đề, câu hỏi, thang điểm và hướng dẫn chấm |
| Bài làm | `assignment_submissions`, `submissions` | Lượt làm và câu trả lời/audio cho từng câu |
| Đánh giá | `transcriptions`, `evaluations`, `evaluation_criterion_scores`, `grade_reviews` | Transcript, gợi ý AI theo tiêu chí và điểm cuối của giảng viên |
| Hỗ trợ vận hành | `notifications`, `tasks` | Thông báo và công việc cá nhân |

Các quan hệ chính nối lớp với giảng viên và sinh viên, bài tập với lớp, câu hỏi/rubric với bài tập, lượt làm với sinh viên, câu trả lời với câu hỏi, rồi transcript/đánh giá/duyệt điểm với câu trả lời. Audio được lưu trong Supabase Storage; bảng `submissions` giữ đường dẫn và metadata, thay vì lưu blob audio trực tiếp trong PostgreSQL. Quyền đọc/ghi được giới hạn qua xác thực, chính sách RLS và các RPC cho các thao tác nghiệp vụ.

Báo cáo gọi ERD 10 bảng là thiết kế của mốc trước; danh sách migration hiện tại có thêm các bảng/đối tượng hỗ trợ. Số bảng chính xác có thể khác theo migration đã áp dụng vào project Supabase; nên dùng schema thực tế của môi trường triển khai làm chuẩn.

## 8. Bộ câu hỏi chuẩn (dùng để chấm UC-01 và các UC liên quan)

Báo cáo Milestone 2 đề cập tập 20 bài nộp mẫu để đánh giá mức khớp ý chính của engine, nhưng chưa mô tả một bộ câu hỏi chuẩn dạng text-to-SQL như file mẫu Nhóm 24. Tài liệu cài đặt có nhắc script `scripts/evaluate_grader.py` và bộ kiểm thử AI service, nhưng cây `backend/src/ai-service/` hiện tại không chứa hai phần này; thư mục `evals/` cũng đang trống, chưa có tập chuẩn câu hỏi/ngữ cảnh với đáp án gold. Do đó, mục này ghi nhận đánh giá chuẩn cần có cho AI ORAL; không khẳng định dự án đã có một bộ eval hoàn chỉnh.

Bộ eval phù hợp với dự án nên được xây quanh câu hỏi vấn đáp, rubric và câu trả lời mẫu, không phải câu hỏi SQL. Mỗi ca nên lưu: mã ca, học phần/chủ đề, câu hỏi, rubric và điểm tối đa, câu trả lời audio hoặc transcript tham chiếu, điểm/nhận xét chuẩn do giảng viên chấm, phiên bản engine và kết quả chạy. Tập 20 câu trả lời nêu trong báo cáo là mức tối thiểu để đối chiếu mục tiêu khớp ý chính ≥85%; để đánh giá đáng tin cậy hơn, nên phân tầng theo môn/chủ đề, độ dài, ngôn ngữ, chất lượng audio và mức đúng/thiếu/sai.

Các chỉ số nên báo cáo gồm sai số điểm tổng và điểm từng tiêu chí, độ khớp phân loại `correct/partial/incorrect/missing`, tỷ lệ bằng chứng trích dẫn đúng transcript, tỷ lệ cần giảng viên xem lại, thời gian STT/chấm và tỷ lệ lỗi/timeout. Tách riêng transcript do người nói chỉnh sửa để biết lỗi thuộc STT hay engine chấm. Đáp án chuẩn cần do người có chuyên môn xác nhận và giữ cố định giữa các lần chạy so sánh.

| Hạng mục | Nội dung cần lưu/đánh giá |
|---|---|
| Input | Audio gốc, transcript tham chiếu, câu hỏi và rubric có phiên bản |
| Gold | Điểm từng tiêu chí, tổng điểm, phân loại và bằng chứng/nhận xét chuẩn |
| Output | Transcript từ STT, điểm và giải thích từ engine, cờ cần duyệt, độ trễ |
| Chấm chất lượng | Sai số điểm, mức nhất quán với giảng viên, citation/evidence hợp lệ, lỗi hệ thống |
| Báo cáo | Kết quả theo phiên bản engine và theo nhóm độ khó/chủ đề/chất lượng dữ liệu |

Đây là đề xuất cấu trúc eval dựa trên mục tiêu trong báo cáo. Chưa thấy tập câu hỏi và gold answer được cung cấp trong repository hiện tại; số 20 là quy mô mục tiêu báo cáo, không phải bằng chứng rằng tập đã được tạo hoặc đã chạy.

## 9. Danh sách use case và chi tiết từng Use Case

Báo cáo Milestone 2 xác định 8 use case nghiệp vụ cốt lõi. Các tên và mã dưới đây theo báo cáo, không theo use case của tài liệu mẫu Nhóm 24. Tóm tắt mục tiêu/luồng lấy từ đặc tả báo cáo; trạng thái code được đối chiếu ở mức repository và không đồng nghĩa toàn bộ quy trình đã được nghiệm thu đầu-cuối.

| UC | Tên | Tác nhân chính | Mục tiêu |
|---|---|---|---|
| UC-01 | Đăng ký và đăng nhập hệ thống | Sinh viên, giảng viên | Tạo tài khoản và xác thực phiên an toàn |
| UC-02 | Tạo lớp học và gửi yêu cầu mở lớp | Giảng viên | Tạo lớp chờ duyệt, áp dụng giới hạn lớp trùng và số lớp chờ |
| UC-03 | Tham gia lớp học bằng mã code | Sinh viên | Gia nhập lớp đang hoạt động bằng mã lớp |
| UC-04 | Biên soạn đề thi, câu hỏi và rubric | Giảng viên | Soạn bài, câu hỏi, thời hạn và tiêu chí chấm |
| UC-05 | Ghi âm và nộp bài thi vấn đáp | Sinh viên | Ghi, nghe lại và gửi câu trả lời |
| UC-06 | Tự động phân tích STT và chấm điểm AI | Pipeline hệ thống | Tạo transcript và gợi ý điểm theo rubric |
| UC-07 | Duyệt bài, điều chỉnh điểm và công bố | Giảng viên | Kiểm tra bằng chứng, chốt điểm và công bố kết quả |
| UC-08 | Phê duyệt yêu cầu mở lớp | Quản trị viên | Duyệt hoặc từ chối yêu cầu mở lớp |

### UC-01 — Đăng ký và đăng nhập hệ thống

**Mô tả.** Người dùng đăng ký hoặc đăng nhập bằng email và mật khẩu. Hệ thống xác thực qua Supabase Auth, tải vai trò ứng dụng và chuyển người dùng đến trang phù hợp. Đăng ký công khai dành cho sinh viên; tài khoản giảng viên/quản trị được cấp quyền qua quy trình quản trị.

**Tiêu chí chấp nhận.**

- Đăng ký hợp lệ tạo tài khoản và hồ sơ sinh viên; hệ thống thông báo trạng thái xác nhận email nếu được bật.
- Người đăng ký không thể tự gửi role giảng viên hoặc admin qua form/metadata.
- Đăng nhập hợp lệ chuyển đến khu vực đúng vai trò; thông tin phiên không hợp lệ bị từ chối.
- Sai thông tin đăng nhập hiển thị lỗi thân thiện và không làm lộ thông tin nhạy cảm.

**Eval case.** Đăng ký sinh viên hợp lệ; mật khẩu xác nhận không khớp; thử tự chọn vai trò giảng viên; đăng nhập đúng thông tin; đăng nhập sai mật khẩu; gọi API bảo vệ khi chưa đăng nhập. Báo cáo ánh xạ TC-01 cho đăng nhập hợp lệ và TC-08 cho kiểm tra quyền; các ca còn lại là đề xuất bao phủ bổ sung.

### UC-02 — Tạo lớp học và gửi yêu cầu mở lớp

**Mô tả.** Giảng viên nhập thông tin lớp và gửi yêu cầu. Hệ thống kiểm tra dữ liệu, chống trùng tên và áp giới hạn số lớp đang chờ; nếu hợp lệ thì tạo lớp `pending` cùng yêu cầu `class_creation` để admin xem xét.

**Tiêu chí chấp nhận.**

- Lớp hợp lệ tạo đúng một bản ghi lớp và một yêu cầu phê duyệt; trạng thái ban đầu là chờ duyệt.
- Tên lớp trùng của cùng giảng viên ở trạng thái chờ duyệt/hoạt động bị từ chối với lỗi rõ ràng, không ghi thêm dữ liệu.
- Khi đã có 3 lớp chờ duyệt, yêu cầu thứ tư bị từ chối và số lớp chờ không đổi.
- Người chưa đăng nhập hoặc không có vai trò giảng viên không thể tạo lớp.

**Eval case.** Tạo lớp hợp lệ; tạo tên trùng khác biệt chữ hoa/thường hoặc khoảng trắng; gửi yêu cầu khi đã có 3 lớp chờ; gọi API với token sinh viên; gửi dữ liệu thiếu/sai định dạng. Báo cáo ánh xạ TC-02 và TC-03; TC-04 kiểm tra giới hạn pending.

### UC-03 — Tham gia lớp học bằng mã code

**Mô tả.** Sinh viên nhập mã lớp được cấp. Hệ thống xác thực mã, trạng thái lớp và tư cách người dùng, rồi thêm sinh viên vào lớp.

**Tiêu chí chấp nhận.**

- Mã hợp lệ của lớp đang hoạt động tạo một quan hệ thành viên duy nhất.
- Tham gia lại cùng lớp bị từ chối như thao tác trùng; dữ liệu không bị nhân đôi.
- Mã không tồn tại hoặc lớp chưa hoạt động bị từ chối; không phát sinh thay đổi dữ liệu.
- Người chưa đăng nhập hoặc không phải sinh viên không thể tham gia lớp.

**Eval case.** Tham gia bằng mã hợp lệ; tham gia lần hai bằng cùng mã; dùng mã không tồn tại; dùng mã lớp đang chờ duyệt; gửi mã rỗng/sai định dạng; gọi bằng tài khoản không phải sinh viên. Báo cáo TC-04 kiểm tra luồng chính; `frontend/tests/class-join.spec.ts` bao gồm thành công, trùng và mã lạ.

### UC-04 — Biên soạn đề thi, câu hỏi và rubric

**Mô tả.** Giảng viên chọn lớp đang hoạt động, nhập tên bài, hướng dẫn, thời gian và danh sách câu hỏi; có thể thêm đáp án tham khảo cùng rubric rồi lưu nháp hoặc công bố cho lớp.

**Tiêu chí chấp nhận.**

- Bài tập chỉ được tạo trong lớp mà giảng viên có quyền quản lý.
- Câu hỏi và rubric được lưu đúng thứ tự, đúng điểm tối đa; tổng điểm tiêu chí phải thỏa quy tắc bài thi.
- Lưu nháp không làm bài xuất hiện như bài đã công bố; sửa nháp giữ nguyên các trường đã nhập.
- Khi công bố thành công, sinh viên thuộc lớp được xem đề nhưng không nhận đáp án tham khảo/rubric nội bộ.
- Dữ liệu sai hoặc thiếu bắt buộc bị từ chối với thông báo phù hợp.

**Eval case.** Tạo và lưu nháp bài hợp lệ; sửa nháp rồi tải lại; công bố bài; thử tổng điểm rubric không bằng điểm tối đa; tạo bài ở lớp không thuộc quyền; kiểm tra phản hồi sinh viên không chứa đáp án tham khảo. Báo cáo ánh xạ TC-05 cho tạo bài; các ca quyền và bảo vệ đáp án nên chạy bổ sung.

### UC-05 — Ghi âm và nộp bài thi vấn đáp

**Mô tả.** Sinh viên mở bài đang nhận bài, kiểm tra/cấp quyền microphone, ghi câu trả lời, nghe lại và chọn gửi. Hệ thống lưu audio riêng tư, gắn bản ghi với lượt làm/câu hỏi và đưa bài vào trạng thái chờ xử lý.

**Tiêu chí chấp nhận.**

- Chỉ sinh viên thuộc lớp và trong thời gian làm bài mới gửi được câu trả lời.
- Audio đúng MIME, không rỗng và trong giới hạn dung lượng; thời lượng tuân theo quy tắc bài thi.
- Bản ghi được lưu trong bucket riêng tư và metadata liên kết đúng người dùng, câu hỏi, lượt làm.
- Bản ghi quá ngắn hoặc vượt số phiên bản cho phép bị chặn; lỗi tải lên không tạo submission mồ côi.
- Kết quả gửi thành công có trạng thái nhận diện được và có thể tiếp tục xử lý.

**Eval case.** Ghi và nộp audio hợp lệ; audio ngắn hơn 15 giây; vượt giới hạn dung lượng/MIME; hết giờ; gửi từ lớp khác; lỗi mạng khi upload; vượt số phiên bản. Báo cáo ánh xạ TC-06 và TC-07. Lưu ý: báo cáo quy định 5 MB, còn API trong checkout cho phép 25 MB; cần chốt một ngưỡng trước khi xem case dung lượng là tiêu chí nghiệm thu.

### UC-06 — Tự động phân tích STT và chấm điểm AI

**Mô tả.** Pipeline chạy bất đồng bộ trong worker: khi sinh viên ghi âm, backend đưa job nhận dạng vào hàng đợi; khi nộp bài, backend đưa job chấm cho từng câu. Worker chuyển giọng nói thành transcript rồi so sánh câu trả lời với câu hỏi, đáp án tham khảo và rubric. Hệ thống lưu transcript và đề xuất điểm tổng/điểm tiêu chí, nhận xét, bằng chứng trích từ câu trả lời và cờ yêu cầu giảng viên xem lại. Báo cáo mô tả LLM; engine hiện trong repository là xử lý local dựa trên Sentence Transformers/PhoBERT.

**Tiêu chí chấp nhận.**

- Audio hợp lệ tạo transcript hoặc trạng thái `failed` kèm thông báo lỗi; người dùng gửi lại job được (nút thử lại); lỗi STT không tạo điểm giả.
- Output grading tuân theo schema, tổng điểm không vượt quá điểm tối đa và tổng điểm tiêu chí nhất quán.
- Mỗi tiêu chí có trạng thái/điểm và giải thích; evidence phải được trích từ transcript, không bịa lời người học.
- Không tự công bố kết quả; mọi đề xuất được lưu để giảng viên xem xét.
- Đánh giá trên tập mẫu đạt mục tiêu khớp ý chính ≥85% được báo cáo nêu; cần định nghĩa cách tính và lưu kết quả theo phiên bản engine.

**Eval case.** Câu trả lời đúng đủ ý; đúng một phần; sai hoặc thiếu ý; transcript rỗng/không rõ; audio lỗi; rubric có nhiều tiêu chí; đầu ra vượt điểm tối đa; kiểm tra evidence có thực trong transcript; engine timeout rồi retry. Báo cáo ánh xạ TC-07 và đề cập tập 20 bài mẫu, nhưng không cung cấp trong checkout một tập gold hoàn chỉnh để xác minh ngưỡng 85%.

### UC-07 — Duyệt bài, điều chỉnh điểm và công bố

**Mô tả.** Giảng viên mở bài nộp thuộc lớp mình quản lý, nghe audio, đối chiếu transcript và điểm AI, nhập điểm cuối cùng cùng nhận xét rồi công bố kết quả cho sinh viên.

**Tiêu chí chấp nhận.**

- Chỉ giảng viên phụ trách hoặc admin được xem và duyệt bài; sinh viên khác không truy cập được.
- Điểm nhập nằm trong thang điểm hợp lệ; khi thay đổi điểm AI, hệ thống yêu cầu/ghi nhận lý do theo quy tắc nghiệp vụ.
- Trước khi công bố, sinh viên không xem được điểm chính thức; sau công bố, sinh viên chỉ xem kết quả của mình.
- Lịch sử điểm cuối và nhận xét gắn với người duyệt và thời điểm duyệt.
- Công bố không bỏ qua cảnh báo về bài chưa chấm hoặc lượt làm chưa hoàn tất.

**Eval case.** Duyệt không đổi điểm AI; chỉnh điểm và nhập lý do; nhập điểm ngoài thang; sinh viên thử xem trước công bố; sinh viên xem điểm sau công bố; sinh viên A thử truy cập kết quả sinh viên B; giảng viên không phụ trách thử duyệt. Báo cáo TC-08 nêu kiểm tra quyền; UAT mô tả luồng sửa điểm rồi công bố.

### UC-08 — Phê duyệt yêu cầu mở lớp

**Mô tả.** Quản trị viên xem yêu cầu mở lớp đang chờ, kiểm tra thông tin, sau đó phê duyệt hoặc từ chối kèm lý do. Hệ thống cập nhật trạng thái lớp/yêu cầu và thông báo cho giảng viên.

**Tiêu chí chấp nhận.**

- Chỉ admin truy cập được danh sách và endpoint xử lý yêu cầu.
- Phê duyệt chuyển yêu cầu sang trạng thái được chấp thuận và lớp sang trạng thái hoạt động.
- Từ chối yêu cầu lưu lý do, không để lớp bị từ chối tiếp tục xuất hiện như lớp hoạt động.
- Yêu cầu đã xử lý không thể bị xử lý lại theo cách làm sai trạng thái.
- Người gửi nhận được trạng thái và lý do; hành động được lưu để truy vết.

**Eval case.** Admin duyệt yêu cầu hợp lệ; admin từ chối và nhập lý do; từ chối không có lý do; giảng viên/sinh viên gọi endpoint admin; xử lý lại yêu cầu đã hoàn tất; kiểm tra thông báo/trạng thái lớp sau mỗi quyết định. Báo cáo ánh xạ TC-09 và có kiểm thử UI cho duyệt/từ chối.

## 10. Chức năng đã thể hiện trong repository

### Sinh viên

- Đăng nhập/đăng ký và trang theo vai trò.
- Xem lớp, tham gia lớp bằng mã, xem bài tập được công bố.
- Giao diện bài tập cá nhân và API CRUD task.
- Làm bài có đồng hồ: ghi âm nhiều phiên bản mỗi câu, chọn bản nộp, xem/sửa transcript trước khi nộp, nộp bài, xem điểm AI và làm lại bài (nếu giảng viên cho phép) — gọi backend NestJS.
- Một số trang khác (danh sách lớp, cài đặt giảng viên) vẫn còn dòng chữ "ghi âm/AI tạm hoãn" từ giai đoạn trước, cần gỡ để thống nhất.

### Giảng viên

- Tạo và quản lý lớp, yêu cầu duyệt, thành viên lớp.
- Soạn bài tập, câu hỏi, đáp án tham khảo và rubric; lưu nháp/công bố.
- Xem bài nộp, nghe audio, sửa/tải transcript, yêu cầu AI chấm lại (qua hàng đợi), duyệt/sửa điểm, công bố kết quả sau hạn nộp; thống kê lớp.
- Gửi yêu cầu cập nhật học hàm / học vị.

### Quản trị viên

- Thống kê tổng quan, duyệt / từ chối yêu cầu mở lớp, hủy lớp và học hàm (từ chối bắt buộc nhập lý do, giảng viên nhận thông báo).
- Quản lý tài khoản: tìm kiếm, khóa / mở khóa / kích hoạt, chỉnh học hàm.
- Dashboard số liệu AI vẫn chưa triển khai.

### Trạng thái AI cần hiểu đúng

Luồng AI đã nối đầu-cuối trong mã nguồn: frontend → backend NestJS → hàng đợi pg-boss → worker → AI service (Faster-Whisper + engine chấm local) → lưu kết quả qua RPC. Các bước đã kiểm tra: build/typecheck của backend và frontend; backend khởi động và từ chối route khi chưa đăng nhập; bộ SQL mới dựng ra schema giống hệt chuỗi migration cũ. **Chưa chạy** kiểm thử đầu-cuối với project Supabase thật và AI service, nên chưa có số liệu về độ trễ hay tỷ lệ lỗi của pipeline. Để chạy cần đủ 4 tiến trình: web, backend API, worker và AI service.

## 11. Yêu cầu chất lượng và bảo mật

- **Phân quyền:** vai trò student/lecturer/admin; xác thực tại API; chính sách RLS tại CSDL; bảo vệ bài nộp và kết quả theo quan hệ lớp/bài.
- **Bảo vệ đáp án:** API phía sinh viên không trả đáp án tham khảo mặc định; migration có cơ chế điều khiển hiển thị đáp án.
- **Bảo vệ audio:** dùng bucket riêng tư, lưu đường dẫn và cấp signed URL ngắn hạn theo hướng dẫn dự án.
- **Toàn vẹn dữ liệu:** khóa ngoại, CHECK constraint, unique/partial index và RPC cho luồng quan trọng được mô tả trong báo cáo/migration.
- **Duyệt của con người:** điểm AI là gợi ý; giảng viên chịu trách nhiệm điểm cuối cùng và có thể nêu lý do điều chỉnh.
- **Khả năng phục hồi:** job lỗi đánh dấu câu trả lời `failed` kèm lý do, người dùng gửi lại được; job bị treo quá 10 phút được nhận xử lý lại; ghi âm đã lưu không mất khi AI service tạm dừng (job chờ trong hàng đợi). Cần kiểm chứng trong môi trường chạy thực tế.

## 12. Kiểm thử, triển khai và tiến độ

Báo cáo Milestone 2 tuyên bố đã đạt TypeScript 0 lỗi, ESLint 0 lỗi, build thành công và 13/13 bài Playwright; UAT 5/5 người dùng hoàn thành tác vụ và đánh giá dễ dùng 9,2/10. Đây là số liệu được trích từ báo cáo ngày 20/11/2026, không phải kết quả chạy lại khi tạo tài liệu này. Trong checkout có các file kiểm thử Playwright nhưng cấu hình/fixture có thể thay đổi theo nhánh hiện tại.

Báo cáo mô tả triển khai web qua Vercel, Supabase cho dữ liệu và AI service chạy riêng. Với kiến trúc hiện tại cần thêm nơi chạy backend NestJS và worker (process chạy lâu dài, không phù hợp serverless) và biến `DATABASE_URL` cho hàng đợi. Biến môi trường chia theo dịch vụ: `frontend/.env.local`, `backend/.env`, `backend/src/ai-service/.env`; không đưa secret vào client hoặc repository. README hướng dẫn chạy đủ 4 tiến trình cục bộ.

Theo báo cáo, Milestone 1 hoàn thành ngày 14/10/2026; Milestone 2 bàn giao ngày 20/11/2026 với mức tự đánh giá 95%; Milestone 3 dự kiến 15/12/2026, tập trung tích hợp pipeline AI, UAT, hiệu năng và nghiệm thu.

## 13. Rủi ro và điểm cần làm rõ

| Điểm cần xử lý | Vì sao cần làm rõ |
|---|---|
| Chênh lệch giới hạn audio 5 MB (báo cáo) và 25 MB (API hiện tại) | Ảnh hưởng quy tắc nghiệp vụ, kiểm thử và dung lượng lưu trữ |
| Kiểm thử đầu-cuối pipeline AI | Luồng đã nối trong mã nhưng chưa chạy với Supabase thật + AI service; chưa có số liệu độ trễ, lỗi |
| Nơi chạy backend + worker khi triển khai | Worker là process chạy lâu dài; cần chọn nền tảng (VPS, Render, Railway…) thay vì serverless |
| Script đánh giá engine và test AI service | Tài liệu nhắc `evaluate_grader` và `tests/` nhưng cây `backend/src/ai-service/` hiện không có |
| Tiêu chí đánh giá AI | Cần giữ tập dữ liệu chuẩn, cách chấm “khớp ý chính ≥85%” và kết quả theo phiên bản engine để tái lập |
| Chỉ số hiệu năng và UAT | Các con số trong báo cáo cần kèm môi trường, tập mẫu, ngày chạy và log kiểm chứng |
| Dashboard và dữ liệu demo | Gắn nhãn rõ dữ liệu minh họa; gỡ các dòng "ghi âm/AI tạm hoãn" còn sót trên một số trang |
| Tính nhất quán tài liệu | README, báo cáo và mã nguồn có một số tên đường dẫn, giới hạn và trạng thái tính năng khác nhau |

## 14. Hướng phát triển tiếp theo

Bám theo báo cáo Milestone 2 và các khoảng trống hiện tại, ưu tiên cho giai đoạn tiếp theo:

1. Kiểm thử tích hợp toàn tuyến web ↔ backend ↔ hàng đợi ↔ worker ↔ AI service ↔ Supabase bằng dữ liệu mẫu, gồm lỗi timeout, audio không hợp lệ, worker dừng giữa chừng và thử lại.
2. Đánh giá engine trên tập câu trả lời có nhãn và báo cáo sai số theo rubric, môn học, ngôn ngữ và độ dài câu trả lời.
3. Thống nhất quy tắc audio (5 MB theo báo cáo hay 25 MB theo cấu hình), chọn nơi triển khai backend + worker, khôi phục script đánh giá engine.
4. Hoàn thiện hướng dẫn giảng viên/sinh viên, UAT có biên bản và đóng gói demo/nghiệm thu.

## 15. Tài liệu tham chiếu trong repository

- README sản phẩm (cài đặt, biến môi trường, cách chạy): [`README.md`](../../README.md)
- Quy tắc phát triển: [`CLAUDE.md`](../../CLAUDE.md)
- Backend API và worker: [`backend/src/`](../../backend/src/)
- SQL theo chức năng: [`backend/src/supabase/`](../../backend/src/supabase/README.md)
- AI service: [`backend/src/ai-service/`](../../backend/src/ai-service/)
- Kiểm thử web: [`frontend/tests/`](../../frontend/tests/)
- Báo cáo Milestone 2 (`BaoCao_Milestone2_AI_ORAL.docx`): không còn trong repository; các số liệu trích từ báo cáo ở trên giữ nguyên.

---
