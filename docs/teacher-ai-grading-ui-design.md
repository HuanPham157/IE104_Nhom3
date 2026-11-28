# Thiết kế giao diện giáo viên xem và duyệt kết quả AI chấm

- **Sản phẩm:** OralCheck / IE104
- **Đối tượng:** Giảng viên phụ trách bài tập, quản trị viên được phân quyền
- **Trạng thái tài liệu:** Thiết kế giao diện và hợp đồng dữ liệu đề xuất
- **Phạm vi:** Danh sách bài cần chấm, màn hình xem kết quả AI, chỉnh điểm theo rubric, lưu duyệt

## 1. Mục tiêu

Giảng viên cần kiểm tra được bài làm gốc, transcript AI, bằng chứng và điểm AI theo từng tiêu chí; có thể sửa từng tiêu chí của rubric và lưu kết quả duyệt. Điểm AI là đề xuất để tham khảo. Điểm chính thức chỉ hình thành sau khi giảng viên duyệt đủ các câu hỏi trong lượt nộp và công bố kết quả theo quy trình bài tập.

Thiết kế ưu tiên làm rõ ba thứ: **bài làm của sinh viên**, **bằng chứng AI**, **điểm cuối do giảng viên chịu trách nhiệm**. Không yêu cầu giáo viên chuyển qua màn hình khác để đối chiếu audio, transcript và rubric.

## 2. Rà soát hiện trạng repo

### Đã có

- Sinh viên nộp bài qua `POST /api/assignments/{id}/submit`; route gọi RPC `finalize_assignment_submission` và trả trạng thái lượt nộp `submitted`.
- Backend NestJS có queue `answer-processing` dùng `pg-boss` trên PostgreSQL/Supabase. Request chỉ gửi job; tiến trình riêng `npm run worker` xử lý. Chưa cần Redis/Celery cho quy mô đồ án hiện tại.
- Worker tải audio từ bucket `oral-answers`, gọi ASR và dịch vụ chấm Python local, rồi ghi vào Supabase qua RPC có kiểm tra quyền service role.
- Schema đã tách dữ liệu theo đối tượng: `transcriptions`, `evaluations`, `evaluation_criterion_scores`, `grade_reviews`; điểm AI đã có `suggested_score`, tiêu chí, trạng thái đánh giá, trích dẫn bằng chứng và giải thích.
- API chi tiết `GET /submissions/:id` trong Nest grading service tổng hợp audio URL có thời hạn, rubric, transcript mới nhất, điểm AI theo tiêu chí và điểm giáo viên đã duyệt.
- API review và RPC `review_submission` hiện chỉ nhận/lưu `final_score` tổng cho câu hỏi cùng nhận xét chung. Chưa lưu điểm giáo viên riêng cho từng tiêu chí.
- Trang `/teacher/evaluations/[id]` hiện là `DeferredFeatureNotice`; `TeacherEvaluation.tsx` là mẫu giao diện tĩnh/dữ liệu giả, chưa nối với API thật.

### Trạng thái cần thể hiện chính xác

Có hai cấp trạng thái:

| Cấp | Các trạng thái hiện có | Ý nghĩa cho giao diện |
|---|---|---|
| Câu trả lời (`submissions`) | `queued`, `processing`, `ready`, `failed` | Chờ AI, đang xử lý, có kết quả AI, xử lý lỗi |
| Lượt nộp (`assignment_submissions`) | `in_progress`, `submitted`, `processing`, `graded` | Chưa nộp, đã nộp/chờ hoàn tất, đang xử lý hoặc chờ duyệt, đã được duyệt đủ câu |

Luồng hiện tại không chuyển lượt nộp sang `graded` ngay sau khi AI chạy xong. `save_ai_evaluation` chuyển câu trả lời sang `ready`; `review_submission` cập nhật lượt nộp thành `graded` khi tất cả câu final đã có `grade_reviews`. Việc công bố điểm là hành động riêng của bài tập.

### Giới hạn hiện tại cần xử lý khi triển khai

1. Lượt nộp gọi `submitted`; các answer final được ghi `queued`. Việc enqueue sau submit phải được bảo đảm trong backend/worker. Cần kiểm tra và hoàn thiện trigger/enqueue theo kiến trúc đang dùng để không có lượt `submitted` nhưng không có job.
2. Đầu vào ASR hiện trả một chuỗi transcript phẳng. Faster-Whisper duyệt các segment theo thứ tự và dùng thời lượng để tính confidence, nhưng `transcriptions` không lưu danh sách segment có timestamp. Vì vậy mockup có thể thiết kế vị trí hiển thị mốc thời gian, còn dữ liệu production cần bổ sung segment/timestamp trước khi hứa đồng bộ chính xác theo câu.
3. Pipeline hiện gửi audio của từng câu trả lời vào một lần gọi ASR; chưa có cắt audio dài thành nhiều chunk do ứng dụng quản lý. Nếu cần chia audio dài, phải lưu offset/thứ tự từng chunk và ghép transcript theo timeline; không lấy trung bình điểm giữa các chunk.
4. Review theo rubric cần mở rộng API/schema/RPC. Hiện chỉ lưu tổng điểm theo câu hỏi, nên không thể khôi phục điểm điều chỉnh từng tiêu chí sau khi tải lại màn hình.
5. `save_ai_evaluation` đã kiểm tra điểm AI bằng tổng điểm tiêu chí và giới hạn điểm từng tiêu chí. Cần có kiểm tra tương đương cho điểm giảng viên, đồng thời ràng buộc tiêu chí phải thuộc đúng câu hỏi của submission.

## 3. Điều hướng và điểm vào

### Danh sách bài cần chấm

Trong trang chi tiết lớp/bài tập, hiển thị bảng bài nộp gồm:

- Sinh viên, MSSV nếu có, số lượt nộp.
- Trạng thái xử lý AI: Đang chờ, Đang xử lý, Cần thử lại, AI đã chấm.
- Trạng thái giảng viên: Chưa duyệt, Đã duyệt một phần, Đã duyệt đủ.
- Tiến độ câu hỏi: ví dụ `2/3 câu AI đã chấm · 1/3 câu đã duyệt`.
- Điểm AI tổng tạm tính và điểm đã duyệt nếu có.
- Nút **Mở bài** dẫn tới `/teacher/evaluations/[submissionId]`.

Bộ lọc mặc định ưu tiên “Cần giảng viên duyệt”, sau đó có thể lọc theo lớp, bài tập, trạng thái AI, trạng thái duyệt và sinh viên. Lỗi AI hoặc transcript có cờ cần xem lại cần có nhãn riêng, không ẩn trong bảng.

## 4. Màn hình đánh giá

### Khung trang

- **Header cố định:** breadcrumb lớp / bài tập / sinh viên; tên bài, lượt nộp, trạng thái AI, trạng thái duyệt; nút quay về danh sách.
- **Thanh câu hỏi:** tab hoặc danh sách dọc theo thứ tự câu hỏi. Mỗi mục có trạng thái AI và duyệt, ví dụ `Câu 1 · AI xong · Chưa duyệt`. Cho phép chuyển câu mà không mất thay đổi chưa lưu.
- **Khu vực làm việc:** hai cột trên desktop, xếp dọc trên mobile. Trái là audio và transcript; phải là phiếu rubric và thao tác duyệt.
- **Thanh thao tác cố định:** điểm AI, điểm giáo viên hiện tại, chênh lệch, trạng thái lưu; nút **Lưu bản nháp** và **Duyệt câu trả lời**. Chỉ hiện hành động hợp lệ với trạng thái/role hiện tại.

### Cột trái — Bài làm và bằng chứng

1. **Thông tin nộp:** tên sinh viên, tên bài/câu hỏi, thời điểm nộp, thời lượng, định dạng file, tình trạng audio.
2. **Audio player:** phát/tạm dừng, tua, thanh tiến độ, tốc độ 0.75x–1.5x, âm lượng, thời gian hiện tại/tổng thời gian. Player phải dùng signed URL do API cấp, không lộ storage path.
3. **Transcript:** nội dung ASR, trạng thái transcript (AI tạo / giảng viên sửa), confidence nếu có. Khi có segment timestamp thì mỗi đoạn có thời gian bấm được để tua audio. Nếu chưa có timestamp, hiển thị transcript liên tục và không giả lập đồng bộ.
4. **Sửa transcript:** vùng chỉnh sửa và nút lưu. Sau khi lưu transcript sửa, hiển thị cảnh báo điểm AI cũ không còn tương ứng và nút **Yêu cầu AI chấm lại**. Kết quả mới phải tạo evaluation mới, không ghi đè mất lịch sử đánh giá cũ.
5. **Câu hỏi và đáp án tham chiếu:** đặt trong vùng thu gọn để đối chiếu. Quyền xem đáp án tham chiếu tuân theo thời điểm công bố/thiết lập assignment.

### Cột phải — Phiếu điểm theo rubric

Phần đầu hiển thị câu hỏi, điểm tối đa, điểm AI tổng và cờ AI (`needs_teacher_review`). Khi chưa có kết quả AI, thay phiếu điểm bằng trạng thái chờ/lỗi và không cho duyệt câu như thể đã có điểm.

Mỗi tiêu chí là một card hoặc một hàng có các thông tin:

| Thành phần | Hiển thị |
|---|---|
| Tiêu chí | Nội dung rubric và điểm tối đa, theo thứ tự rubric |
| AI đề xuất | Điểm AI / điểm tối đa và nhãn `Đúng`, `Một phần`, `Chưa đạt`, `Thiếu` |
| Bằng chứng | Trích dẫn từ câu trả lời và giải thích AI; cho phép mở phần transcript tương ứng nếu có timestamp |
| Điểm giảng viên | Input số hoặc stepper, mặc định bằng AI; giới hạn `0..max_points`, độ chính xác tối đa 2 chữ số thập phân |
| Nhận xét tiêu chí | Tùy chọn; nên yêu cầu khi điểm khác đề xuất để giải thích quyết định cho người học/đợt kiểm tra |
| Tình trạng | `Giữ điểm AI` hoặc `Đã điều chỉnh` cùng delta, ví dụ `−0,5` |

Cuối danh sách có ô nhận xét chung. Tổng điểm giáo viên được tính tự động bằng tổng điểm các tiêu chí; hiện rõ `AI 7,5/10` và `Giảng viên 8,0/10 (+0,5)`. Không cho sửa tổng độc lập với các tiêu chí.

Nếu rubric không có tiêu chí, giao diện dùng cách chấm tổng điểm của câu hỏi và ghi rõ không có phân tích theo tiêu chí. Đây là chế độ tương thích; không tạo tiêu chí giả.

### Xác nhận duyệt

Khi chọn **Duyệt câu trả lời**, xác nhận trong dialog gọn:

- Điểm AI và điểm giảng viên.
- Danh sách tiêu chí đã đổi (nếu có).
- Nhận xét bắt buộc khi điểm bị điều chỉnh.
- Nút **Xác nhận duyệt**.

Sau khi lưu thành công, trạng thái câu chuyển thành `Đã duyệt`; cập nhật tiến độ lượt nộp. Nếu các câu khác chưa duyệt, thông báo `Đã duyệt câu X. Còn N câu cần duyệt.` Khi tất cả câu final được duyệt, lượt thành `graded`; đây chưa nhất thiết là đã công bố cho sinh viên.

## 5. Tương tác và trạng thái giao diện

| Trạng thái | Giao diện |
|---|---|
| Đang tải | Skeleton cho header, audio và rubric; không nhấp nút duyệt |
| `queued` | Nhãn “Đang chờ AI”; cho phép rời trang và quay lại, có thời điểm cập nhật gần nhất |
| `processing` | Nhãn “AI đang xử lý”; cập nhật bằng polling nhẹ hoặc refresh thủ công; tránh spinner toàn trang |
| `ready` + chưa có review | Hiển thị điểm AI và rubric, trạng thái “Chờ giảng viên duyệt” |
| `failed` | Hiển thị thông báo lỗi an toàn từ `error_message`, nút thử chấm lại; giữ audio/transcript đã có |
| Đã sửa nhưng chưa lưu | Gắn chỉ báo “Chưa lưu”; cảnh báo khi đổi câu/rời trang |
| Đang lưu | Khóa nút gửi, giữ nội dung form và hiện tiến trình inline |
| Lưu thành công | Toast xác nhận và cập nhật điểm/trạng thái từ response máy chủ |
| Lưu thất bại | Giữ nguyên input, chỉ rõ lỗi, cho phép thử lại; không xóa dữ liệu người dùng |
| Transcript sửa sau khi có điểm AI | Báo điểm AI hiện tại thuộc phiên bản transcript trước; yêu cầu chấm lại trước khi duyệt hoặc xác nhận duyệt trên phiên bản cũ theo quy tắc nghiệp vụ được chốt |

## 6. Luồng xử lý và lưu dữ liệu

### Luồng nghiệp vụ mục tiêu

1. Sinh viên hoàn tất ghi âm từng câu; audio được upload vào Supabase Storage và metadata câu trả lời được lưu.
2. Sinh viên gọi `POST /api/assignments/{id}/submit`; backend xác thực quyền và gọi RPC finalize, lượt chuyển sang `submitted`.
3. Sau khi finalize thành công, backend đưa từng answer final vào queue. Queue failure cần được log/hiển thị và có cơ chế enqueue lại/reconciliation; không để request AI dài chặn request nộp bài.
4. Worker riêng lấy job, claim answer an toàn qua RPC và chuyển trạng thái answer sang `processing`.
5. Worker tải audio từ Storage; lấy câu hỏi, đáp án tham chiếu và rubric từ Supabase qua RPC context chỉ dành cho service role.
6. Worker gọi FastAPI local cho ASR và đánh giá rubric. Với audio dài được chia đoạn, giữ `chunk_index`, `start_ms`, `end_ms`, ghép transcript theo thứ tự và giữ mốc thời gian gốc.
7. Worker lưu transcript, evaluation và điểm từng tiêu chí bằng RPC `save_ai_evaluation`; mỗi tiêu chí gắn với rubric criterion id. Khi hoàn tất, answer thành `ready`. Lỗi chuyển answer thành `failed`, ghi lỗi an toàn và cho phép retry.
8. Giáo viên xem chi tiết bằng API, so sánh audio/transcript/bằng chứng với rubric, nhập điểm theo từng tiêu chí và nhận xét.
9. Backend kiểm tra dữ liệu và lưu review. Khi tất cả answer final trong lượt có review, lượt thành `graded` và tính tổng từ các câu đã duyệt.
10. Giáo viên công bố kết quả ở cấp bài tập sau khi đủ điều kiện; đây là bước riêng với việc AI chấm và duyệt từng câu.

### Vị trí dữ liệu hiện có

| Dữ liệu | Nơi lưu | Trường/ghi chú |
|---|---|---|
| Audio gốc | Supabase Storage `oral-answers` | `audio_storage_path`, MIME, dung lượng, thời lượng trong `submissions` |
| Trạng thái xử lý AI | `submissions` | `queued`, `processing`, `ready`, `failed`, `error_message` |
| Transcript | `transcriptions` | `transcript_text`, `engine_name`, `language_code`, `is_edited`, thời gian tạo |
| Kết quả AI tổng | `evaluations` | `model_name`, `suggested_score`, `feedback_summary`, `needs_teacher_review`, `transcription_id` |
| Điểm AI từng tiêu chí | `evaluation_criterion_scores` | `criterion_id`, `awarded_points`, `assessment`, `evidence_excerpt`, `explanation` |
| Rubric | `rubric_criteria` | `criterion_text`, `max_points`, `position` |
| Review hiện tại | `grade_reviews` | `evaluation_id`, `final_score`, `reviewer_feedback`, `score_modified`, reviewer/thời điểm |
| Tổng lượt đã duyệt | `assignment_submissions` | `total_score`, `status`, `graded_at` |

### Thay đổi dữ liệu/API đề xuất cho chấm theo rubric

Để có thể lưu và tải lại điểm giáo viên từng tiêu chí, bổ sung bảng, ví dụ `grade_review_criterion_scores`:

- `id`, `grade_review_id`, `criterion_id`, `awarded_points`, `reviewer_comment`, `updated_at`.
- Unique `(grade_review_id, criterion_id)`; FK rubric criterion; constraint không âm. Kiểm tra `awarded_points <= max_points` trong RPC vì giới hạn phụ thuộc hàng rubric.
- Lưu trong cùng transaction với `grade_reviews` để không có review tổng cập nhật mà tiêu chí bị thiếu.
- Gắn `grade_reviews.evaluation_id` với evaluation đã duyệt. Nếu chấm lại AI sau đó, lưu evaluation mới và đánh dấu review cũ đang dựa trên evaluation trước đó; yêu cầu giáo viên xác nhận phiên bản đang duyệt.

Hợp đồng request review đề xuất:

```json
{
  "evaluation_id": "uuid",
  "criteria": [
    {
      "criterion_id": "uuid",
      "awarded_points": 2.5,
      "reviewer_comment": "Đã nêu ý chính nhưng thiếu điều kiện dừng."
    }
  ],
  "reviewer_feedback": "Nhận xét chung cho câu trả lời."
}
```

Server xác thực toàn bộ criterion id thuộc đúng question, đủ tiêu chí rubric hiện hành (nếu chọn quy tắc không bỏ trống), điểm trong phạm vi từng tiêu chí và tổng rubric phù hợp với `question.max_score`. Server tự tính `final_score = sum(criteria.awarded_points)`; không tin tổng do client gửi. Với câu không có rubric, cho phép payload dạng tổng điểm theo luồng tương thích hiện tại. Việc lưu dùng RPC nguyên tử, giữ role/ownership checks hiện hữu.

API GET chi tiết đã trả rubric và điểm AI theo tiêu chí trong Nest service; cần thống nhất route Next proxy với backend. Tránh duy trì hai hợp đồng khác nhau giữa `src/app/api/submissions/[id]` và `backend/src/modules/grading`.

## 7. Xử lý audio dài và timestamp

- Không chia audio theo số giây cố định rồi chấm từng mảnh độc lập để lấy trung bình.
- ASR có thể trả nhiều segment; giữ `start_ms`, `end_ms`, `text`, thứ tự và metadata confidence. Nếu chia audio ở tầng ứng dụng, offset của từng chunk phải cộng lại vào timestamp gốc.
- Tạo một transcript liên tục theo timeline trước khi chấm rubric cho toàn câu trả lời; nếu muốn dùng evidence theo đoạn, phải ánh xạ evidence về khoảng transcript/audio gốc.
- Hiển thị timestamp chỉ khi nguồn trả timestamp hợp lệ. Nếu một tiêu chí có evidence text nhưng chưa có alignment, hiển thị trích dẫn và không đưa nút tua tới vị trí giả định.
- Cần định nghĩa xử lý vùng chồng lấn giữa các chunk (deduplicate theo timestamp/text) và lưu phiên bản pipeline để có thể tái lập kết quả.

## 8. Quy tắc nghiệp vụ và kiểm tra đầu vào

- Điểm mỗi tiêu chí: số hữu hạn, từ `0` đến `max_points`, làm tròn tối đa 2 chữ số.
- Tổng điểm giáo viên do server tính từ các tiêu chí và không vượt `question.max_score`.
- Điều chỉnh bất kỳ tiêu chí nào so với điểm AI phải có nhận xét giải thích (ở tiêu chí hoặc nhận xét chung); giao diện chỉ hỗ trợ dễ nhập, server là nơi thực thi bắt buộc.
- Không thể duyệt khi answer chưa `ready`, không có evaluation hợp lệ, hoặc evaluation gắn transcript khác với transcript đang xem.
- Mỗi lần AI chấm lại tạo version evaluation mới; không ghi đè lịch sử. Review phải lưu rõ evaluation được duyệt.
- Ràng buộc quyền giảng viên theo assignment/class tiếp tục do API/RPC kiểm tra; không dựa vào việc ẩn nút ở UI.
- `graded` là “giảng viên đã duyệt đủ câu”, còn `results_published_at` xác định đã công bố cho sinh viên hay chưa.

## 9. Thiết kế responsive và khả năng tiếp cận

- Desktop từ 1280px: cột bài làm khoảng 45%, rubric khoảng 55%; thanh thao tác cố định trong viewport nhưng không che nội dung.
- Tablet/mobile: chuyển thành tab “Bài làm” / “Rubric”; giữ điểm hiện tại và nút lưu trong sticky footer có vùng đệm cho bàn phím ảo.
- Input điểm có label, đơn vị điểm tối đa, lỗi cụ thể; hỗ trợ bàn phím và screen reader. Màu trạng thái luôn đi kèm chữ/icon.
- Dùng định dạng số theo locale Việt Nam ở UI; gửi JSON number chuẩn dấu chấm thập phân.
- Audio có điều khiển bằng bàn phím, transcript có tương phản và line-height đủ đọc; không chỉ dùng màu để biểu thị phát hiện đúng/sai.

## 10. Các endpoint liên quan

| Mục đích | Endpoint/đối tượng hiện có | Ghi chú |
|---|---|---|
| Nộp lượt | `POST /api/assignments/{id}/submit` | Finalize trả `submitted`; kiểm tra backend enqueue toàn bộ answer final |
| Chi tiết câu trả lời | `GET /submissions/{id}` | Backend grading service trả audio, rubric, transcript, evaluation criteria, review |
| Sửa transcript | `POST /submissions/{id}/transcript` | Sau sửa, cần yêu cầu chấm AI lại |
| Yêu cầu AI chấm lại | `POST /submissions/{id}/ai-grade` | Trả `202`, công việc chạy qua queue |
| Duyệt câu | `POST /submissions/{id}/review` | Hiện chỉ nhận tổng điểm; cần mở rộng payload theo tiêu chí |
| Danh sách bài nộp | `GET /assignments/{id}/submissions` | Dùng cho bảng danh sách giáo viên và tiến độ duyệt |
| Công bố kết quả | `publish_assignment_results` RPC | Riêng với việc duyệt câu; chỉ công bố khi đủ điều kiện/hết hạn |

## 11. Tiêu chí nghiệm thu giao diện

1. Giáo viên mở một submission và thấy thông tin sinh viên, audio, transcript, rubric, AI score và từng điểm AI.
2. Bấm đoạn transcript có timestamp sẽ tua đúng tới vị trí đó khi segment timestamp đã được hỗ trợ; giao diện không bịa timestamp khi chưa có dữ liệu.
3. Giáo viên sửa điểm một tiêu chí; tổng điểm và chênh lệch tự cập nhật, điểm không vượt max của tiêu chí.
4. Giáo viên lưu/duyệt; tải lại trang vẫn thấy được điểm từng tiêu chí đã duyệt, nhận xét, evaluation version được duyệt và trạng thái.
5. Server từ chối tiêu chí sai câu hỏi, điểm ngoài phạm vi, thiếu nhận xét khi điều chỉnh và review khi AI chưa xong.
6. Lượt chỉ thành `graded` sau khi mọi câu trả lời final được duyệt; trạng thái công bố được hiển thị tách biệt.
7. Job AI chạy ngoài request submit; lỗi queue/AI có trạng thái có thể quan sát và luồng thử lại.
8. Với audio dài/chunk, transcript được ghép đúng thứ tự và timestamp ánh xạ về audio gốc; điểm rubric tính trên toàn câu trả lời, không lấy trung bình điểm chunk.

## 12. Thứ tự triển khai đề xuất

1. Hoàn thiện đảm bảo enqueue sau submit và khả năng quan sát/retry job.
2. Hoàn thiện dữ liệu ASR segment/timestamp và quy tắc audio dài.
3. Mở rộng migration/RPC review để lưu điểm giáo viên từng tiêu chí và liên kết evaluation version.
4. Nối API GET/review thật, thống nhất Next route với Nest backend.
5. Xây danh sách bài cần chấm và màn hình đánh giá responsive theo thiết kế.
6. Thêm thông báo, polling trạng thái và xử lý lỗi/đổi transcript/chấm lại.
7. Kiểm tra các luồng lưu, phân quyền, total consistency, xử lý queue retry và UI trạng thái.

## 13. Tham chiếu repo

- `src/app/teacher/evaluations/[id]/page.tsx`
- `src/components/TeacherEvaluation.tsx`
- `src/app/api/assignments/[id]/submit/route.ts`
- `backend/src/modules/grading/grading.controller.ts`
- `backend/src/modules/grading/grading.service.ts`
- `backend/src/queue/queue.service.ts`
- `backend/src/workers/grading.worker.ts`
- `backend/src/integrations/asr.service.ts`
- `backend/src/integrations/grader.service.ts`
- `backend/src/ai-service/app/speech/transcription.py`
- `backend/src/ai-service/app/assessment/engine.py`
- `backend/src/supabase/migrations/01_tables.sql`
- `backend/src/supabase/migrations/08_submissions.sql`
- `backend/src/supabase/migrations/09_grading.sql`
