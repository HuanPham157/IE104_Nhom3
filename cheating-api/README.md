# API chấm bài đọc tiếng Việt

## 1. Chép thư mục vào dự án cũ

Trên Windows, đặt nguyên thư mục `cheating-api` vào thư mục gốc của dự án cũ, ngang cấp với `backend`. Ba file ghi âm mẫu nằm ngay cạnh README này. API chạy như một tiến trình Python riêng. Bạn có thể thử toàn bộ luồng chấm nội dung trên máy mình trước khi mở dự án cũ.

## 2. Cài đặt lần đầu

Cài Python 64-bit (bản dùng để kiểm tra là 3.14.5). Mở PowerShell tại **thư mục gốc dự án cũ** và chạy lần lượt:

```powershell
cd .\cheating-api
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Kết quả mong đợi là `8 passed`. Hãy tạo `.venv` trên máy nhận. Khi bàn giao chỉ cần gửi mã nguồn và dữ liệu mẫu. Máy cần Internet để cài thư viện và tải mô hình Whisper `small` khi gửi bài đọc lần đầu.

## 3. Khởi động và thử một bài đọc

Trong cùng cửa sổ PowerShell, chạy:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Giữ cửa sổ này mở. Truy cập [kiểm tra trạng thái](http://127.0.0.1:8002/health), kết quả mong đợi là `{"status":"ok"}`. Sau đó mở [Swagger](http://127.0.0.1:8002/docs), chọn **POST /api/v1/readings → Try it out**.

| Trường | Giá trị để thử |
|---|---|
| `audio` | Chọn [bai-doc.m4a](bai-doc.m4a). |
| `reference_text` | Hôm nay chúng ta sẽ tìm hiểu về trí tuệ nhân tạo và ứng dụng trong giáo dục. |
| `rubric_json` | Dán nguyên khối JSON dưới đây để chấm trên thang 10. |
| `rubric_id`, `teacher_instruction` | Để trống. |

```json
{
  "question_max_score": 10,
  "criteria": [
    {"id":"00000000-0000-4000-8000-000000000001","text":"Độ chính xác nội dung","max_points":7,"scoring_method":"wer_accuracy"},
    {"id":"00000000-0000-4000-8000-000000000002","text":"Hoàn thành bài đọc","max_points":3,"scoring_method":"completion_rate"}
  ]
}
```

Bấm **Execute**. Khi nhận HTTP 200, xem `transcription.text` (lời nhận diện), `alignment.errors` (các tiếng khác câu chuẩn) và `grading.total_score` (điểm tổng). Nếu lời nhận diện khớp câu chuẩn, điểm là 10. Giữ nguyên câu chuẩn và rubric rồi lần lượt chọn [bai-doc-thieu.m4a](bai-doc-thieu.m4a) và [bai-doc-them.m4a](bai-doc-them.m4a) để thử hai trường hợp khác. Sai khác hiển thị phụ thuộc vào lời Whisper nhận diện.

Nhấn **Ctrl+C** để dừng. Lần sau mở PowerShell tại `cheating-api` và chạy lại lệnh Uvicorn ở bước 3.

### Tự kiểm tra API bằng Playwright

Giữ API ở bước 3 chạy trên cổng 8002. Mở **PowerShell thứ hai** tại thư mục `cheating-api`. Cài Playwright một lần và chạy bài test:

```powershell
.\.venv\Scripts\python.exe -m pip install playwright
.\.venv\Scripts\python.exe -m pytest -v check_playwright.py
```

[Bài test](check_playwright.py) dùng Playwright cho Python để gửi file `bai-doc.m4a` qua HTTP. Bài test kiểm tra mã 200, bản chép có nội dung, trạng thái chấm hoàn tất và điểm đúng theo công thức của tiêu chí chính xác nội dung. Rubric thử này dành cả 10 điểm cho tiêu chí đó. Kết quả thành công là `1 passed`. Bài test chạy độc lập với 8 unit test và không cần cài trình duyệt. Nếu thấy `ECONNREFUSED`, mở lại terminal thứ nhất và kiểm tra [health](http://127.0.0.1:8002/health). Lần sau chỉ cần chạy lại dòng pytest khi API đang mở.

## 4. Gọi API từ backend của dự án cũ

**Nếu chỉ cần demo API, hoàn thành bước 3 là đủ.** Làm tiếp mục này khi muốn bấm chấm một bài trong dự án cũ và thấy điểm được lưu vào chính bài nộp đó. Các đường dẫn dưới đây tính từ gốc dự án của bạn. Chọn một dòng theo file đang có trên máy.

| Nếu dự án có file này | Nơi nối luồng chấm | Nơi thêm cấu hình |
|---|---|---|
| `backend/src/workers/grading.worker.ts` (bản dev) | Trong `runGrading`, ngay sau khi lấy được `context`, chọn bộ chấm bài đọc trước lời gọi `this.grader.grade(...)`. Worker đã có Supabase client `db` và `submissionId`. | `backend/.env` |
| `frontend/src/lib/ai-grading.ts` (bản feat-test cũ) | Trong `runAiGrading`, ngay sau khi lấy được `context`, thêm nhánh bài đọc trước phần gọi `/api/grade`. Hàm này chạy phía server và dùng chung cho hai route `grade` và `ai-grade`. Dùng `adminDb` và `input.submissionId`. | `frontend/.env.local` |

### 4.1. Chọn bài đọc đầu tiên

Trong dự án cũ, chọn một câu yêu cầu đọc thành tiếng. Điền **nguyên văn đoạn học sinh phải đọc** vào đáp án mẫu (`reference_answer`). Để thử cách chấm ở bước 3, dùng hai tiêu chí có điểm tối đa cộng lại đúng bằng điểm tối đa của câu. Trong Supabase, lấy ID của câu từ `questions.id` và ID của từng tiêu chí từ `rubric_criteria.id` theo `question_id` đó.

Thêm các dòng sau vào file môi trường ở bảng trên, thay ba giá trị trong dấu `<...>` bằng UUID thật rồi khởi động lại tiến trình đọc file môi trường. Đây là cấu hình cho **một câu demo**. Với nhiều câu, có thể lưu phương pháp chấm trên từng tiêu chí và trả trường đó trong RPC `get_submission_grading_context`.

```dotenv
READING_API_URL=http://127.0.0.1:8002
READING_QUESTION_ID=<UUID của câu đọc>
READING_ACCURACY_ID=<UUID tiêu chí chính xác nội dung>
READING_COMPLETION_ID=<UUID tiêu chí hoàn thành>
```

Giữ cấu hình `AI_SERVICE_URL` của dịch vụ cũ vì nó còn phục vụ nhận diện và chấm các dạng câu khác. Bản demo dùng rubric gửi trực tiếp trong request nên có thể dùng các bảng hiện có, không cần chạy SQL mẫu. Các địa chỉ trên áp dụng khi backend và Python chạy trực tiếp trên cùng máy.

### 4.2. Thêm hàm gọi API vào mã phía server

Đặt hàm dưới đây trong cùng file TypeScript đã chọn ở bảng trên, bên ngoài class hoặc hàm hiện có. Hai bản đều đã import kiểu `SupabaseClient`. Hàm dùng đường dẫn audio của chính bài nộp sau bước xác thực và giành quyền xử lý (`claim`) hiện có.

```ts
type ReadingContext = {
  reference_answer: string | null;
  max_score: number;
  criteria: Array<{ id: string; text: string; max_points: number }>;
};

async function gradeReading(db: SupabaseClient, submissionId: string, context: ReadingContext) {
  const reference = context.reference_answer?.trim();
  if (!reference) throw new Error('Câu đọc chưa có đoạn văn chuẩn');
  const criteria = context.criteria.map((criterion) => {
    const method = criterion.id === process.env.READING_ACCURACY_ID ? 'wer_accuracy'
      : criterion.id === process.env.READING_COMPLETION_ID ? 'completion_rate' : undefined;
    if (!method) throw new Error('Kiểm tra UUID và phương pháp chấm của từng tiêu chí');
    return { ...criterion, scoring_method: method };
  });
  const { data: answer, error } = await db.from('submissions')
    .select('audio_storage_path').eq('id', submissionId).single();
  if (error || !answer?.audio_storage_path) throw new Error('Không tìm thấy audio bài nộp');
  const path = String(answer.audio_storage_path);
  const { data: audio, error: downloadError } = await db.storage.from('oral-answers').download(path);
  if (downloadError || !audio) throw new Error('Không tải được audio bài nộp');

  const form = new FormData();
  form.append('audio', audio, path.split('/').pop()!);
  form.append('reference_text', reference);
  form.append('rubric_json', JSON.stringify({ question_max_score: context.max_score, criteria }));
  const url = new URL('/api/v1/readings', process.env.READING_API_URL || 'http://127.0.0.1:8002');
  const response = await fetch(url, {
    method: 'POST', body: form, signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`API bài đọc trả HTTP ${response.status}`);
  const result = await response.json();
  const grading = result.grading;
  if (grading?.status !== 'completed' || !Array.isArray(grading.criteria)
      || grading.criteria.length !== criteria.length) {
    throw new Error('Chưa có đủ điểm tự động. Cần giảng viên kiểm tra bài đọc.');
  }
  const scores = criteria.map((criterion) => {
    const row = grading.criteria.find((item: { criterion_id: string }) => item.criterion_id === criterion.id);
    const points = row?.awarded_points;
    if (typeof points !== 'number' || !Number.isFinite(points) || points < 0 || points > criterion.max_points) {
      throw new Error('Điểm tiêu chí trả về không hợp lệ');
    }
    return {
      criterion_id: criterion.id, awarded_points: points,
      assessment: points === 0 ? 'incorrect' : points === criterion.max_points ? 'correct' : 'partial',
      evidence_excerpt: '', explanation: criterion.text,
    };
  });
  return {
    suggested_score: Number(scores.reduce((sum, row) => sum + row.awarded_points, 0).toFixed(2)),
    feedback_summary: String(grading.feedback_summary), criteria: scores,
    needs_teacher_review: Boolean(grading.needs_teacher_review), engine: 'cheating-api-reading',
  };
}
```

### 4.3. Dùng kết quả trong luồng lưu điểm đang có

- **Bản dev (NestJS).** Trong `runGrading`, thay dòng gán `const result = await this.grader.grade(...)` bằng đoạn dưới đây. Lệnh `save_ai_evaluation` ngay sau đó đã đọc đúng các trường hàm mới trả về. Chạy API NestJS và worker ở hai terminal theo các script trong `backend/package.json` (từ `backend` dùng `npm run start:dev` và `npm run worker:dev`). Giữ dịch vụ AI cũ chạy cho bước tạo transcript.

```ts
const gradingContext = context as GradingContext;
const result = gradingContext.question_id === process.env.READING_QUESTION_ID
  ? await gradeReading(db, submissionId, gradingContext)
  : await this.grader.grade(gradingContext, transcript.transcript_text);
```

- **Bản feat-test (Next.js server).** Trong `runAiGrading`, đưa khối hiện tại từ `const aiUrl` đến hết bước kiểm tra `result.suggested_score` vào một hàm cục bộ `async function gradeOriginal()` và thêm `return { ...result, criteria: result.criteria, suggested_score: result.suggested_score };` cuối hàm. Tại vị trí cũ của khối đó, dùng đoạn dưới đây. Giữ phần gọi `save_ai_evaluation` và phần `return` sau nó. Chạy lại dự án bằng lệnh dev hiện có và giữ dịch vụ AI cũ chạy cho bước tạo transcript. Route giảng viên hiện yêu cầu bài đã có transcript trước khi chấm.

```ts
const result = context.question_id === process.env.READING_QUESTION_ID
  ? await gradeReading(adminDb, input.submissionId, context)
  : await gradeOriginal();
```

Ở cả hai bản, giữ một lần lưu cho mỗi lượt chấm và giữ xử lý lỗi của bên gọi. Hàm mẫu cộng `awarded_points` của từng tiêu chí vì RPC so sánh tổng này với `p_suggested_score` theo **thang điểm của câu**. Ví dụ câu tối đa 5 điểm có thể đạt 4/5 dù `grading.total_score` của API là 8/10. Khi API thiếu điểm hoặc không nhận diện được lời nói, hàm báo lỗi để đi theo luồng xử lý hiện có và giảng viên kiểm tra. Điểm bài đọc dựa trên audio gốc, kể cả khi sinh viên đã sửa transcript trong dự án. Nếu cần hiện từng lỗi đọc về sau, cần lưu thêm `alignment.errors` cùng bài nộp. Đoạn mẫu trên chỉ lưu điểm và nhận xét qua RPC hiện có.

### 4.4. Kiểm tra từ dự án cũ

1. Chạy bước 3 một lần để xác nhận API và tải sẵn Whisper. Giữ terminal Python mở.
2. Đăng nhập dự án cũ, nộp audio cho đúng câu đã khai báo ở `READING_QUESTION_ID` và kích hoạt luồng chấm hiện có của bản đang dùng.
3. Xem terminal Python có dòng `POST /api/v1/readings` trả `200`. Mở lại bài nộp ở phía giảng viên, kiểm tra nhận xét, điểm từng tiêu chí và tổng điểm. Thử thêm một câu dạng cũ để xác nhận nó vẫn dùng bộ chấm cũ.
4. Nếu chỉ Swagger hoạt động, kiểm tra UUID câu, tiến trình đã nạp biến môi trường và worker đã chạy (bản dev). Nếu trả `422`, kiểm tra câu chuẩn, UUID tiêu chí và tổng `max_points`. Nếu trả `200` nhưng lưu lỗi, xem log của bên gọi, đối chiếu UUID tiêu chí và thang điểm với bài nộp.

## 5. Chấm phát âm với Azure Speech (tùy chọn)

### Chạy với khóa Azure Speech đã lưu trên Windows

Từ thư mục `cheating-api`, chạy trong PowerShell:

```powershell
$env:AZURE_SPEECH_KEY = [Environment]::GetEnvironmentVariable('AZURE_SPEECH_KEY', 'User')
$env:AZURE_SPEECH_REGION = 'japanwest'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Nếu dự án cũ đang dùng cổng 8001, đổi cổng của lệnh Uvicorn ở trên thành 8002 sau khi dừng phiên Python ở bước 3, giữ `READING_API_URL` trỏ đến cổng 8002 và mở Swagger trên cổng đó. Nếu chạy ở cổng 8001, cập nhật `READING_API_URL` theo cổng 8001 rồi khởi động lại backend hoặc worker. Mở [Swagger cho cổng 8001](http://127.0.0.1:8001/docs) và gửi rubric có `azure_accuracy` hoặc `azure_fluency` để chấm phát âm hoặc độ trôi chảy.

### Chạy bằng cách nhập khóa thủ công

Từ thư mục `cheating-api`, chạy `.\.venv\Scripts\python.exe start_speech.py`. Nhập khóa của tài nguyên Speech vùng `japanwest` khi được hỏi. Sau khi xác thực, mở Swagger tại `http://127.0.0.1:8001/docs`. Để thử nhận diện cục bộ, có thể chạy `.\.venv\Scripts\python.exe -m uvicorn app.main:app` trên cổng 8000.

Để thử với dữ liệu đi kèm, lấy nguyên đối tượng `rubric` trong [vietnamese_readings.json](tests/data/vietnamese_readings.json) dán vào `rubric_json`, dùng câu chuẩn và audio ở bước 3. Rubric này có thêm hai tiêu chí Azure. Cả hai cách thử trong README đều dùng được khi dự án cũ chưa cấu hình Supabase.

Nếu tích hợp Supabase của nhóm, backend lấy câu chuẩn và rubric của câu hỏi theo quyền của người dùng, gửi qua hai trường tương ứng và để trống `rubric_id`. Trường tùy chọn `teacher_instruction` hiện chỉ ghi nhận sự hiện diện của hướng dẫn.

- Dùng `transcription.text` để hiện bản chép, `alignment.errors` để hiện sai khác. Vị trí tính từ 1. Sai khác phản ánh cả giọng đọc và lỗi nhận diện.
- Phương pháp căn chỉnh bằng Python giữ dấu tiếng Việt, chuẩn hóa NFC và đếm theo tiếng tách bởi khoảng trắng. WER = (số thay + số thiếu + số thêm) / số tiếng chuẩn. Điểm nội dung dựa trên max(0, 1 − WER), điểm hoàn thành dựa trên tỷ lệ tiếng không bị thiếu.
- Với tiêu chí Azure, dịch vụ gửi audio và đoạn chuẩn đến Azure Speech vi-VN. Bản REST hiện hỗ trợ bài tối đa 30 giây. Đọc `pronunciation_assessment.status` để biết kết quả dịch vụ.
- Ghép từng kết quả về Supabase bằng `criterion_id`. `awarded_points` là điểm theo `max_points`; `total_score` theo thang 10. Khi còn thiếu tiêu chí có trọng số, giữ điểm tổng null và chuyển giảng viên duyệt. Có thể đọc `grading.feedback_summary` và `grading.suggestions` để hiển thị nhận xét.

## Đánh giá thực nghiệm

Ba lượt chấm Swagger thực tế và bản chép tay đã xác nhận nằm trong `tests/data/vietnamese_readings.json`. Chạy `.\.venv\Scripts\python.exe -X utf8 evaluate_readings.py` để so lời đọc với bài mẫu và Whisper với lời thực đọc.

Để lấy điểm đối chiếu, gửi người chấm các audio và câu chuẩn. Yêu cầu chấm độc lập độ chính xác phát âm trên 4, độ trôi chảy trên 2, kèm vị trí cần nghe lại nếu có. Điền điểm vào hai trường `teacher_pronunciation_4`, `teacher_fluency_2`. Giá trị 0 là điểm thật, null là chưa chấm. Chạy lại lệnh đánh giá để xem sai lệch tuyệt đối trung bình trên các mẫu có đủ cặp điểm.

Khi thêm bản ghi, dùng một tên file riêng và ghi vùng giọng người đọc tự xác nhận vào `region` (Bắc, Trung hoặc Nam). Giữ null khi chưa biết. Ghi câu thực đọc sau khi nghe vào `candidate_transcript`, đánh dấu `full_transcript_verified` và chép transcript, điểm Azure, ID lượt chấm, điểm tổng từ response thật. Nếu dùng câu mới, đặt thêm `reference_text` cho mẫu đó. Nên thu cùng đoạn ở nhiều người đọc mỗi miền và dùng thêm đoạn khác trước khi kết luận về chênh lệch vùng giọng.
