# AI OralCheck — Kiểm tra mức độ hiểu bài qua ghi âm

Đồ án môn IE104 (Nhóm 3). Giảng viên giao bài vấn đáp ngắn; sinh viên ghi âm câu trả lời ngay trên trình duyệt; hệ thống chuyển giọng nói thành văn bản (Faster-Whisper) và dùng engine chấm điểm chạy local (Sentence Transformers + PhoBERT, không dùng API AI thương mại) chấm mức độ hiểu theo barem, chỉ ra ý đúng / sai / còn thiếu. Giảng viên nghe lại, chỉnh điểm và công bố điểm chính thức.

**Công nghệ:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · FastAPI + Faster-Whisper · Sentence Transformers / PhoBERT (chấm điểm local) · MediaRecorder / Web Speech API.

## Lộ trình các bài thực hành

Dự án phát triển dần qua các bài thực hành của môn; trang `/tasks` (quản lý công việc học tập) là phần còn lại từ Bài 1–2.

| Tiêu chí | Bài thực hành 1 (Frontend mock) | Bài thực hành 2 (Fullstack) | Đồ án hiện tại (AI OralCheck) |
|:---|:---|:---|:---|
| **Lưu trữ dữ liệu** | React state trong bộ nhớ (mất khi reload) | **Supabase PostgreSQL** (bền vững) | Postgres + **Supabase Storage** (audio, bucket private) |
| **Xác thực** | Form mô phỏng | **Supabase Auth**, tự chuyển hướng | Supabase Auth + 3 vai trò: sinh viên / giảng viên / quản trị viên |
| **Phân quyền** | Không có | **RLS** + JWT Bearer ở API | RLS + **RPC `security definer`** cho mọi thao tác ghi, hàm kiểm tra quyền dùng chung |
| **Kiến trúc** | Chỉ client | Client ↔ Next.js API ↔ Supabase | Thêm **AI service** (FastAPI: Faster-Whisper + engine chấm local) |
| **Môi trường chạy** | localhost:3000 | localhost + **Vercel** | localhost (web + AI service); Vercel cho web, AI service host riêng |
| **Kiểm thử** | Thủ công | 12 ca kiểm thử (T01–T12) + Playwright | Playwright (`tests/`) + 3 lệnh kiểm tra bắt buộc |

---

## Chức năng

### Sinh viên
- Tham gia lớp bằng mã lớp; xem bài tập được giao.
- **Bắt đầu làm bài** → đồng hồ đếm ngược theo thời lượng; hết giờ hệ thống tự nộp. Nội dung câu hỏi chỉ hiện sau khi bấm bắt đầu.
- **Ghi âm trên trình duyệt** (hoặc tải tệp audio): mỗi câu tối đa **5 phiên bản**, nghe lại từng bản, chọn **1 bản để nộp**. Mỗi lần ghi tự dừng theo thời gian của câu.
- Transcript tạm thời khi đang nói (Web Speech API) và transcript Whisper sau khi tải lên; sửa được lỗi nhận dạng trước khi nộp.
- **Ma trận tiến độ** các câu khi làm bài; sau khi nộp chuyển thành **ma trận kết quả** (đúng / đúng một phần / chưa đạt) kèm phân tích: điểm AI, nhận xét theo tiêu chí, ý còn thiếu so với đáp án, phân tích độ phủ từ khóa.
- **Lịch sử bài nộp**: nghe lại audio, xem transcript, điểm AI, điểm và nhận xét chính thức của giảng viên.
- Trang tổng quan: điểm đã công bố, bài chờ duyệt, thông báo khi có điểm.

### Giảng viên
- Tạo lớp (chờ quản trị viên duyệt), quản lý danh sách sinh viên.
- **Soạn bài tập** (kiểu Azota):
  - Thời gian bắt đầu, thời lượng, hạn chót (tự tính = bắt đầu + thời lượng cho thi tập trung, hoặc tự đặt khoảng mở bài dài hơn).
  - **Nhập đề nhanh** bằng cách dán văn bản hoặc tải `.docx` / `.txt`, tự tách theo “Câu 1:, Câu 2 (3 điểm):…”, dòng “Đáp án:” thành đáp án tham khảo.
  - **Barem chấm chung** cho cả bài (viết hoặc tải file), tự tách thành tiêu chí từng câu; sinh viên không xem được barem.
  - Chia đều 10 điểm, sắp xếp câu, danh sách kiểm tra trước khi công bố. Thời gian ghi âm mỗi câu tự tính từ thời lượng.
- **Duyệt bài**: nghe audio, đọc transcript, xem đánh giá AI theo tiêu chí; chấm tay theo barem hoặc yêu cầu AI chấm; nhận xét bắt buộc khi điểm khác điểm AI; chuyển nhanh câu trước / sau.
- **Công bố điểm**: tự nộp các lượt đã hết giờ, báo rõ còn bài nào chưa chấm; sinh viên nhận thông báo.
- **Dashboard thống kê lớp**: tỉ lệ nộp, phân bố điểm, mức độ hiểu theo rubric, chênh lệch điểm GV−AI, câu hỏi khó nhất, bài nộp thiếu nội dung, sinh viên cần chú ý.

### Quản trị viên
- Duyệt / từ chối yêu cầu tạo lớp và hủy lớp; xem và quản lý toàn bộ lớp.

---

## Kiến trúc

```text
Trình duyệt (Next.js client)
   │  MediaRecorder ghi âm, Web Speech API transcript tạm
   ▼
Next.js Route Handlers (frontend/src/app/api)  ── Supabase (Auth, Postgres + RLS, Storage "oral-answers")
   │  xác thực vai trò, gọi RPC Supabase,            ▲
   │  ký URL audio, gọi AI service                   │ lưu transcript / đánh giá qua RPC
   ▼                                                  │
AI service FastAPI (ai-service, cổng 8001) ───────────┘
   ├─ POST /api/transcribe   Faster-Whisper (chạy local)
   └─ POST /api/grade        engine local (ai-service/app/assessment): so khớp ngữ nghĩa + từ khóa theo rubric → JSON có kiểm tra schema
```

- Mọi quyền truy cập dữ liệu được kiểm soát bằng **RLS** và các **RPC `security definer`** trong Supabase; Next.js dùng phiên đăng nhập của người dùng, chỉ dùng `SUPABASE_SECRET_KEY` (server-only) cho bước lưu kết quả AI.
- Next.js và AI service xác thực với nhau bằng header `X-AI-Service-Token` (`AI_SERVICE_TOKEN` giống nhau ở hai bên).

---

## Cấu trúc thư mục

```text
IE104_Nhom3/
├── frontend/                     # Ứng dụng Next.js (giao diện + API)
│   └── src/
│       ├── app/                  # Trang theo vai trò (student/, teacher/, admin/) và api/ (Route Handlers)
│       ├── components/
│       │   ├── assignment/           # Trang làm bài: ma trận, thẻ câu hỏi nhiều phiên bản, phân tích sau nộp
│       │   ├── assignment-builder/   # Soạn bài: lịch, barem, nhập đề nhanh, sửa câu hỏi
│       │   └── *.tsx                 # Các trang/khung giao diện còn lại
│       ├── lib/                  # Logic dùng chung: gọi API, chấm AI, phân tích transcript,
│       │                         # đọc đề/barem, đọc file .docx, ký URL audio…
│       └── services/supabase/    # Supabase client (browser / server)
├── ai-service/                   # FastAPI: Faster-Whisper STT + engine chấm điểm local
├── supabase/
│   ├── migrations/               # 000 → 010: schema, RLS, RPC nghiệp vụ, pipeline AI
│   ├── seed.sql                  # Hàm SQL dùng chung (tái sử dụng) — chạy trước migration 006
│   └── README.md
├── backend/                      # Khung backend Python dự phòng (chưa dùng; API đang ở Next.js)
├── tests/                        # Playwright E2E
├── docs/                         # Thiết kế, mockup, minh chứng
└── package.json                  # Script tiện ích chạy frontend từ thư mục gốc
```

---

## Cài đặt và chạy local

Tóm tắt: cài công cụ → tạo project Supabase và chạy SQL → điền biến môi trường → chạy **2 tiến trình song song** (AI service ở cổng `8001`, web ở cổng `3000`) → tạo tài khoản.

### Bước 0. Cài công cụ

| Công cụ | Phiên bản | macOS | Windows | Ubuntu/Debian |
|---|---|---|---|---|
| Node.js + npm | 20 trở lên | `brew install node` | [nodejs.org](https://nodejs.org) (bản LTS) | `sudo apt install nodejs npm` hoặc dùng `nvm` |
| Python | **3.9 – 3.12** (dự án đang chạy với 3.9) | `brew install python@3.11` | [python.org](https://www.python.org/downloads/) (tick “Add to PATH”) | `sudo apt install python3 python3-venv` |
| Git | bất kỳ | có sẵn / `brew install git` | [git-scm.com](https://git-scm.com) | `sudo apt install git` |

Kiểm tra: `node -v`, `python3 --version` (Windows: `python --version`). Không cần cài FFmpeg: Faster-Whisper đọc audio bằng thư viện PyAV đi kèm.

2. Hướng dẫn thiết lập Cơ sở dữ liệu Supabase & Môi trường

Bước 1: Tạo Project trên Supabase

Truy cập https://supabase.com/dashboard và đăng nhập/đăng ký tài khoản.
Bấm New Project, đặt tên project là viec-hoc-lab, chọn vùng (Region) gần nhất (ví dụ: Singapore), đặt mật khẩu database mạnh và lưu riêng.
Sau khi khởi tạo xong, vào mục Project Settings → API để lấy:
Project URL
Publishable Key (hoặc anon key)
Bước 2: Tạo Bảng và Thiết lập Row Level Security (RLS)

Trong Dashboard Supabase, mở SQL Editor → New query.

Chạy lần lượt toàn bộ nội dung các tệp sau, mỗi tệp trong một query riêng:

   | Thứ tự | File | Nội dung |
   |---|---|---|
   | 1 | `supabase/migrations/000_schema.sql` | bảng tasks (bài tập cũ) |
   | 2 | `supabase/migrations/001_ie104_schema.sql` | toàn bộ bảng nghiệp vụ |
   | 3 | `supabase/migrations/002_oralcheck_backend.sql` | RLS, RPC nghiệp vụ, bucket audio `oral-answers` |
   | 4 | `supabase/migrations/003_signup.sql` | tự tạo hồ sơ khi đăng ký |
   | 5 | `supabase/migrations/004_ai_transcription_and_grading.sql` | pipeline transcript / chấm AI |
   | 6 | `supabase/migrations/005_assignment_exam_duration.sql` | thời lượng làm bài |
   | 7 | `supabase/seed.sql` | **hàm dùng chung** |
   | 8 | `supabase/migrations/006_oral_exam_features.sql` | nhiều phiên bản ghi âm, barem, GV chấm AI, công bố điểm |
   | 9 | `supabase/migrations/007_reference_answer_visibility.sql` | giảng viên bật/tắt cho sinh viên xem đáp án tham khảo sau khi nộp |
   | 10 | `supabase/migrations/008_personal_tasks.sql` | việc cá nhân của sinh viên: hạn chót, ưu tiên, ghi chú |
   | 11 | `supabase/migrations/009_assignment_retakes.sql` | làm lại cả bài nhiều lần, điểm chính thức = lượt cao nhất |
   | 12 | `supabase/migrations/010_publish_after_deadline.sql` | chỉ công bố điểm sau hạn nộp |

   Mỗi lần chạy thành công sẽ hiện *Success. No rows returned*. `seed.sql`, `006` → `010` chạy lại nhiều lần vẫn an toàn.

`profile_mẫu.sql` thì có run chung luôn (tài khoản có sẵn)

Các script tạo schema lớp học/bài tập, RLS và RPC workflow; signup.sql đồng bộ hồ sơ cũ sang public.users mà không ghi đè trạng thái tài khoản hiện có. Khi cập nhật mã SQL, chạy lại script tương ứng trong SQL Editor.

Nếu nâng cấp từ phiên bản backend trước, chạy lại oralcheck_backend.sql sau khi cập nhật để cài các RPC phân quyền admin, tạo lớp/bài tập, xóa sinh viên khỏi lớp, chặn truy cập roster/bài tập của lớp chưa duyệt và hiển thị tên giảng viên an toàn cho thành viên lớp. Khi từ chối yêu cầu mở lớp, bản ghi lớp sẽ được xóa khỏi danh sách; yêu cầu và lý do vẫn được lưu trong approval_requests, đồng thời giảng viên nhận thông báo trong ứng dụng.
Đăng ký công khai chỉ tạo tài khoản sinh viên. Để cấp tài khoản giảng viên, quản trị viên tạo người dùng trong Supabase Auth, lấy UUID của tài khoản rồi chạy câu lệnh sau trong SQL Editor:

insert into public.users (id, full_name, role, account_status)
values ('UUID_CUA_TAI_KHOAN', 'Họ tên giảng viên', 'lecturer', 'active')
on conflict (id) do update
  set full_name = excluded.full_name, role = 'lecturer', account_status = 'active';

insert into public.lecturer_profiles (user_id)
values ('UUID_CUA_TAI_KHOAN')
on conflict (user_id) do nothing;

insert into public.profiles (id, role, institutional_id, full_name, faculty)
values ('UUID_CUA_TAI_KHOAN', 'teacher', 'MSGV', 'Họ tên giảng viên', 'Tên khoa')
on conflict (id) do update
  set role = 'teacher', full_name = excluded.full_name,
      institutional_id = excluded.institutional_id, faculty = excluded.faculty;
Chỉ quản trị viên được chạy thao tác này. public.users.role là nguồn phân quyền chuẩn (student, lecturer, admin); public.profiles chỉ còn để tương thích với dữ liệu đăng ký cũ, ứng dụng đọc role từ public.users. Không cấp quyền giảng viên từ user_metadata do người dùng tự gửi.

Tạo hồ sơ cho tài khoản tạo thủ công

Khi sinh viên đăng ký qua form /signup, các trigger tạo dòng public.profiles, public.users và public.student_profiles. Chạy đủ ba SQL script theo đúng thứ tự ở trên trước khi đăng ký.

Nếu tạo user thủ công trong Authentication → Users, Supabase Auth tạo tài khoản nhưng không tự tạo hồ sơ ứng dụng nếu không có metadata cần thiết. Quản trị viên cần thêm hồ sơ bằng UUID của user. Ví dụ cho sinh viên:

insert into public.users (id, full_name, role, account_status)
values ('UUID_CUA_USER', 'Họ tên sinh viên', 'student', 'active');

insert into public.student_profiles (user_id, student_code, department)
values ('UUID_CUA_USER', 'MSSV_MOI', 'Tên khoa');

insert into public.profiles (id, role, institutional_id, full_name, faculty)
values ('UUID_CUA_USER', 'student', 'MSSV_MOI', 'Họ tên sinh viên', 'Tên khoa');
Mã số (institutional_id) phải chưa được hồ sơ khác sử dụng. Với giảng viên tạo thủ công, dùng hướng dẫn cấp role teacher ở trên. Không chạy lệnh SQL thủ công cho tài khoản đã được trigger tạo hồ sơ thành công, trừ khi cần cập nhật hồ sơ.

Phân biệt quản trị viên Supabase và quản trị viên ứng dụng

Quản trị viên Supabase project/organization: Mời thành viên trong phần Access Control / Team của Supabase và chỉ cấp quyền cần thiết. Đây là quyền quản lý hạ tầng Supabase, không phải role đăng nhập của website.

Quản trị viên trong ứng dụng: Role chuẩn được lưu ở public.users; tạo user trong Supabase Auth rồi thêm public.users.role = 'admin'. Không gán admin vào public.profiles.

Tạo tài khoản đăng nhập admin: Trong Supabase Dashboard → Authentication → Users → Add user, tạo user bằng email và mật khẩu do bạn quản lý (xác nhận email nếu project yêu cầu), rồi sao chép UUID. Trong SQL Editor, chạy lệnh dưới đây sau khi thay UUID và họ tên; sau đó đăng nhập tại /login, ứng dụng sẽ chuyển role admin tới /admin.

insert into public.users (id, full_name, role, account_status)
values ('UUID_TAI_KHOAN_AUTH', 'Họ tên quản trị viên', 'admin', 'active')
on conflict (id) do update
  set full_name = excluded.full_name,
      role = 'admin',
      account_status = 'active';
Chỉ người có quyền quản trị Supabase mới được tạo/cấp role này. Không gửi mật khẩu qua chat và không gán role admin vào user_metadata hoặc public.profiles.

Dashboard giảng viên (/teacher/classes): Giảng viên tạo lớp sẽ gửi yêu cầu chờ admin duyệt. Dropdown khoa của form tạo lớp được cấu hình trong src/components/TeacherClasses.tsx. Danh sách lớp, sinh viên tham gia và bài tập lấy từ API/Supabase. Tạo bài tập chỉ bật cho lớp đang hoạt động.

Dashboard quản trị (/admin): Admin có thể mở /admin/classes để xem lớp, mở danh sách lớp/sinh viên/bài tập, tạo lớp được kích hoạt ngay và soạn bài tập. Lớp có sinh viên hoặc bài tập khi bị xóa sẽ được lưu trữ để giữ nguyên dữ liệu liên quan.

Dashboard sinh viên (/student/classes): Sinh viên tham gia lớp bằng mã lớp và xem các bài tập đã được công bố. API từ chối mã không hợp lệ/lớp không hoạt động và từ chối tham gia trùng mà không cập nhật dữ liệu. Ghi âm, camera, chuyển giọng nói thành văn bản và AI chấm điểm hiện chưa bật.

Xem đề bài (/student/assignments/[id]): Sinh viên xem hướng dẫn, hạn nộp và câu hỏi; đáp án tham khảo/rubric không được trả về cho role sinh viên.

Soạn bài tập (/teacher/assignments/create): Giảng viên và admin chọn lớp đang hoạt động, nhập hướng dẫn, hạn nộp, câu hỏi, đáp án tham khảo và tiêu chí chấm; lưu nháp để tiếp tục chỉnh sửa hoặc công bố cho sinh viên.

Xóa bài tập: Giảng viên có thể xóa bài tập trong chi tiết lớp. Bài tập chưa có bài nộp sẽ bị xóa; bài đã có bài nộp sẽ được lưu trữ để bảo toàn kết quả.

Yêu cầu hủy lớp: Giảng viên gửi yêu cầu từ chi tiết lớp đang hoạt động. Lớp chỉ được lưu trữ sau khi quản trị viên phê duyệt.

Xóa sinh viên khỏi lớp: Giảng viên phụ trách lớp và admin có thể gỡ sinh viên khỏi danh sách lớp. Tài khoản và bài nộp được giữ lại; sinh viên có thể tham gia lại bằng mã lớp nếu lớp còn hoạt động.

Bài tập cá nhân (/tasks): CRUD cá nhân tiếp tục dùng public.tasks.

Ghi chú UX và phần chưa hoàn thiện

Tạo lớp hiện gom mã môn, khoa, phòng và lịch vào trường classes.description; hiện chưa có cột riêng nên việc lọc/sắp xếp theo từng thông tin lớp còn hạn chế.
Thống kê số sinh viên, tiến độ nộp và điểm chưa có nguồn dữ liệu hiển thị trong dashboard; giao diện không nên xem số rỗng là tiến độ bằng 0. Thẻ giảng viên hiện hiển thị số bài tập thực tế; điểm trung bình và quy trình khảo thí vẫn chưa bật.
Sinh viên hiện chỉ xem đề và hạn nộp. Luồng nộp bài, chấm điểm và xem kết quả chưa bật; các mục ghi âm, camera, Speech-to-Text và AI được đánh dấu tạm hoãn.
Quản trị viên duyệt lớp và gửi thông báo được hỗ trợ; quản lý tài khoản và thống kê AI chưa triển khai.
Bước 3: Cấu hình xác nhận email và tài khoản thử nghiệm

Trong Authentication → Providers → Email, bật nhà cung cấp Email. Nếu bật xác nhận email, cấu hình SMTP để gửi thư xác nhận; tài khoản chỉ đăng nhập được sau khi xác nhận.
Trong Authentication → URL Configuration, đặt Site URL phù hợp (ví dụ http://localhost:3000 khi chạy local) để liên kết xác nhận quay về đúng ứng dụng.
Trong Authentication → Users → Add user (hoặc Create user), tạo hai tài khoản thử nghiệm:
Tài khoản A: usera@gm.uit.edu.vn / mật khẩu tự chọn
Tài khoản B: userb@gm.uit.edu.vn / mật khẩu tự chọn
Với tài khoản thử nghiệm tạo thủ công, đánh dấu Auto Confirm Email để có thể đăng nhập ngay.
Bước 4: Cấu hình biến môi trường tại máy Local

Tại thư mục gốc dự án, sao chép .env.example thành .env.local (tệp này đã được .gitignore bảo vệ, tuyệt đối không đưa lên GitHub). Điền URL/key Supabase và chỉ thêm thông tin tài khoản thử nghiệm trong máy cá nhân:

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Biến dùng riêng cho Playwright E2E Test tại local (tùy chọn)
TEST_EMAIL_A=
TEST_PASSWORD_A=
TEST_EMAIL_B=
TEST_PASSWORD_B=

# Dữ liệu dành riêng cho kiểm thử tham gia lớp (không bắt buộc)
TEST_CLASS_JOIN_AVAILABLE_CODE=
TEST_CLASS_JOIN_AVAILABLE_ID=
TEST_CLASS_JOIN_UNKNOWN_CODE=
Không điền mật khẩu/token thật vào .env.example hoặc commit .env.local.

Bài thực hành: tham gia lớp bằng mã

Thiết kế yêu cầu, R1–R3, dữ liệu và vị trí mã nguồn: DESIGN.md.
Ca kiểm thử, trạng thái chạy và minh chứng: TEST_REPORT.md.
Chạy kiểm thử tích hợp với tài khoản/lớp thử đã chuẩn bị: npx playwright test tests/class-join.spec.ts --project=chromium.
Sau khi cập nhật hàm RPC, chạy lại supabase/oralcheck_backend.sql trong Supabase SQL Editor. Ca TC01 tạo dữ liệu thành viên thử và không tự xóa; gỡ thành viên bằng tài khoản giảng viên/admin trước khi chạy lại.
Thông tin sinh viên trong DESIGN.md cần được điền trước khi nộp; không lưu thông tin cá nhân hoặc mật khẩu vào ảnh minh chứng.

### Bước 2. Biến môi trường

```bash
cp frontend/.env.example frontend/.env.local
cp ai-service/.env.example ai-service/.env
# Windows (PowerShell): Copy-Item frontend\.env.example frontend\.env.local ; Copy-Item ai-service\.env.example ai-service\.env
```

Tạo một chuỗi bí mật dùng chung cho `AI_SERVICE_TOKEN`:

```bash
openssl rand -hex 32
# hoặc: python3 -c "import secrets; print(secrets.token_hex(32))"
```

Mở hai file vừa tạo và điền:

| Biến | `frontend/.env.local` | `ai-service/.env` | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✔ | | Bước 1.6 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✔ | | Bước 1.6 |
| `SUPABASE_SECRET_KEY` | ✔ | | Bước 1.6 — cần để lưu kết quả chấm AI |
| `AI_SERVICE_URL` | ✔ | | giữ `http://127.0.0.1:8001` |
| `AI_SERVICE_TOKEN` | ✔ | ✔ | **giống hệt nhau** ở hai file |
| `GRADER_EMBEDDING_MODEL` | | ✔ | mặc định `keepitreal/vietnamese-sbert` (PhoBERT); không cần API key |
| `WHISPER_MODEL` | ✔ | ✔ | `small` (mặc định, khuyến nghị) hoặc `base` (nhanh hơn, sai nhiều hơn với tiếng Việt) |

Không commit các file `.env` thật; chỉ `.env.example` (khóa để trống) nằm trong git.

### Bước 3. Chạy AI service — terminal thứ nhất

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt      # lần đầu tải Faster-Whisper + CTranslate2 (~200 MB)
uvicorn app.main:app --reload --port 8001 --env-file .env
```

Thấy `Uvicorn running on http://127.0.0.1:8001` là được. Kiểm tra ở terminal khác:

```bash
curl http://127.0.0.1:8001/health
# {"status":"ok","service":"faster-whisper","model":"small"}
```

Lần nhận dạng đầu tiên sẽ tải model từ Hugging Face về `~/.cache/huggingface` (`base` ~141 MB, `small` ~464 MB) nên mất 1–2 phút. **Giữ terminal này chạy** trong suốt quá trình dùng web. Những lần sau chỉ cần: `cd ai-service && source .venv/bin/activate && uvicorn app.main:app --reload --port 8001 --env-file .env`.

#### Nhận dạng giọng nói (Faster-Whisper — chạy trên máy)

AI service dùng [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper) (Whisper chạy trên CTranslate2): nhanh hơn và tốn ít RAM hơn bản `openai-whisper`, **không cần PyTorch, FFmpeg hay Rust** — audio được giải mã bằng thư viện PyAV đi kèm. Các bước chống transcript sai đã bật sẵn trong `ai-service/app/speech/transcription.py`:

- Lọc khoảng lặng (VAD) trước khi nhận dạng, giảm tình trạng model tự “bịa” câu khi im lặng.
- Bỏ các đoạn Whisper đánh giá là không có lời nói, đoạn lặp chữ, đoạn trùng nhau và các câu bịa quen thuộc (“Hãy subscribe cho kênh…”).
- Dùng nội dung câu hỏi làm gợi ý ngữ cảnh; không để lỗi của đoạn trước kéo theo đoạn sau.
- Trả thêm `confidence` (0–1) cho mỗi transcript.

Kiểm tra nhanh không cần chạy web (trong venv đã kích hoạt):

```bash
python -c "from faster_whisper import WhisperModel; WhisperModel('small', compute_type='int8'); print('Faster-Whisper OK')"
```

Cấu hình trong `ai-service/.env`:

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `WHISPER_MODEL` | `tiny` / `base` / `small` (mặc định) / `medium` | Có thể dùng repo CTranslate2 trên Hugging Face (ví dụ bản PhoWhisper đã chuyển đổi) |
| `WHISPER_DEVICE` | `auto` (mặc định) / `cpu` / `cuda` | |
| `WHISPER_COMPUTE_TYPE` | `int8` (mặc định, CPU) / `float16` (GPU) | |
| `WHISPER_WORKERS` | `1` | Tăng khi nhiều sinh viên nộp cùng lúc; mỗi worker tốn thêm RAM |

Đo trên MacBook (CPU, int8) với một câu tiếng Việt ~10 giây: `base` ~1,4 giây/câu nhưng sai nhiều thuật ngữ; `small` ~3,9 giây/câu và đúng hơn rõ rệt (**khuyến nghị**). `medium` chính xác hơn nữa nhưng chậm và cần nhiều RAM.

#### Engine chấm điểm (chạy local, không dùng API AI thương mại)

`POST /api/grade` dùng engine trong `ai-service/app/assessment/`:

1. **Tiền xử lý** tiếng Việt: chuẩn hóa, bỏ từ đệm, tách mệnh đề, tách từ cho PhoBERT (`pyvi`).
2. **Xác định ý cần có** của từng tiêu chí: phần sau `=>` trong barem nếu có (`;` = phải đủ, `|` = một trong các ý), nếu không thì tự tách từ đáp án tham khảo.
3. **So khớp ngữ nghĩa** từng ý với các mệnh đề của câu trả lời bằng Sentence Transformers (mặc định `keepitreal/vietnamese-sbert`), kết hợp **độ phủ từ khóa** (chịu lỗi dấu, lỗi nhận dạng một ký tự). Câu hỏi so sánh (“so sánh A và B”) chỉ so ý của A với phần câu trả lời nói về A.
4. **Phát hiện mâu thuẫn** (phủ định ngược, từ trái nghĩa như trước/sau, client/server, riêng/chung) → tiêu chí bị đánh “sai” và bài được đưa cho giảng viên duyệt.
5. **Nhận xét theo mẫu**: không nêu nội dung đáp án/barem trừ khi giảng viên bật xem đáp án.

Đánh giá và hiệu chỉnh trên bộ dữ liệu mẫu (`ai-service/tests/fixtures/vi_grading_cases.json`):

```bash
cd ai-service && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests -q                       # kiểm thử engine
python -m scripts.evaluate_grader --cases       # sai số so với điểm kỳ vọng
python -m scripts.evaluate_grader --calibrate   # dò lại ngưỡng trên tập calib
```

Kết quả hiện tại trên tập test (dữ liệu tổng hợp, chưa phải điểm giảng viên thật): MAE 1,42/10, 58% bài lệch ≤ 1 điểm, tương quan 0,86; bài trả lời sai/lạc đề phần lớn được đánh dấu cần duyệt. Lần chấm đầu tải model embedding (~1 GB).

### Bước 4. Chạy web — terminal thứ hai

```bash
cd frontend
npm install
cd ..
npm run dev
```

Mở **http://localhost:3000**. Sau khi sửa `.env.local` phải dừng (`Ctrl+C`) và chạy lại `npm run dev`.

Chạy bản production: `npm run build && npm run start`.

### Bước 5. Tạo tài khoản và phân quyền

Đăng ký công khai tại `/signup` **luôn tạo tài khoản sinh viên**. Tài khoản giảng viên và quản trị viên được nâng quyền bằng SQL (vai trò lấy từ bảng `public.users`):

1. Đăng ký 3 tài khoản ở `/signup` (ví dụ `sv@example.com`, `gv@example.com`, `admin@example.com`).
2. Trong **SQL Editor** chạy (thay email cho đúng):

```sql
-- Nâng thành GIẢNG VIÊN: đổi vai trò và chuyển hồ sơ sinh viên sang hồ sơ giảng viên
with target as (select id from auth.users where email = 'gv@example.com')
update public.users set role = 'lecturer', updated_at = now() where id in (select id from target);

insert into public.lecturer_profiles (user_id, lecturer_code, department)
select sp.user_id, sp.student_code, sp.department
from public.student_profiles sp
join auth.users au on au.id = sp.user_id
where au.email = 'gv@example.com'
on conflict (user_id) do nothing;

delete from public.student_profiles
where user_id in (select id from auth.users where email = 'gv@example.com');

-- Nâng thành QUẢN TRỊ VIÊN
update public.users set role = 'admin', updated_at = now()
where id in (select id from auth.users where email = 'admin@example.com');
```

3. Tài khoản vừa đổi vai trò cần **đăng xuất rồi đăng nhập lại** (ứng dụng lưu tạm hồ sơ trên trình duyệt) — sẽ được chuyển tới `/teacher` hoặc `/admin`.

#### Cách khác: tạo tài khoản thủ công trong Supabase

Khi tạo user ở **Authentication → Users → Add user** (đánh dấu **Auto Confirm User** để đăng nhập được ngay), Supabase chỉ tạo tài khoản đăng nhập — **không tự tạo hồ sơ ứng dụng** vì thiếu metadata. Sao chép **UUID** của user rồi chạy một trong các lệnh sau trong SQL Editor:

```sql
-- Sinh viên (mã số phải chưa được hồ sơ khác dùng)
insert into public.users (id, full_name, role, account_status)
values ('UUID_CUA_USER', 'Họ tên sinh viên', 'student', 'active');
insert into public.student_profiles (user_id, student_code, department)
values ('UUID_CUA_USER', 'MSSV', 'Tên khoa');

-- Giảng viên
insert into public.users (id, full_name, role, account_status)
values ('UUID_CUA_USER', 'Họ tên giảng viên', 'lecturer', 'active')
on conflict (id) do update set full_name = excluded.full_name, role = 'lecturer', account_status = 'active';
insert into public.lecturer_profiles (user_id, lecturer_code, department)
values ('UUID_CUA_USER', 'MSGV', 'Tên khoa')
on conflict (user_id) do nothing;

-- Quản trị viên ứng dụng
insert into public.users (id, full_name, role, account_status)
values ('UUID_CUA_USER', 'Họ tên quản trị viên', 'admin', 'active')
on conflict (id) do update set full_name = excluded.full_name, role = 'admin', account_status = 'active';
```

Không chạy các lệnh này cho tài khoản đã đăng ký qua `/signup` (trigger đã tạo hồ sơ) — khi đó dùng lệnh nâng quyền ở trên.

#### Nguyên tắc phân quyền

- **`public.users.role` là nguồn phân quyền duy nhất** (`student`, `lecturer`, `admin`). Bảng `public.profiles` (từ Bài 2) chỉ còn để tương thích dữ liệu đăng ký cũ.
- **Không** cấp vai trò qua `user_metadata` — người dùng tự gửi được giá trị này khi đăng ký. Form đăng ký cũng không cho tự chọn vai trò giảng viên.
- **Quản trị viên Supabase** (mời ở *Organization → Team*) là người quản lý hạ tầng: chạy SQL, xem log, đổi cấu hình. **Quản trị viên ứng dụng** là tài khoản đăng nhập website có `role = 'admin'`, dùng để duyệt lớp. Hai loại quyền này độc lập; chỉ quản trị viên Supabase mới cấp được vai trò ứng dụng.
- Không gửi mật khẩu qua chat, không lưu mật khẩu / token vào ảnh minh chứng hay git.

### Bước 6. Thử nhanh để chắc chắn mọi thứ đã kết nối

1. **Giảng viên** → Lớp học → tạo lớp → **Quản trị viên** → Duyệt yêu cầu → duyệt lớp.
2. **Giảng viên** → Soạn bài tập → chọn lớp, giờ bắt đầu = bây giờ, thời lượng 10 phút, thêm 1 câu hỏi → **Công bố bài tập**. Ghi lại **mã lớp**.
3. **Sinh viên** → Lớp học → nhập mã lớp → mở bài → **Bắt đầu làm bài** → cho phép micro → ghi âm 5–10 giây.
   - Thấy “Transcript sẵn sàng” → Supabase Storage + AI service + Whisper đã thông.
   - Bấm **Nộp bài** → thấy điểm AI đề xuất → engine chấm local + `SUPABASE_SECRET_KEY` đã thông.
4. Nếu bước nào lỗi, đọc dòng chữ đỏ trên giao diện và xem mục **Xử lý sự cố** bên dưới.

> Ghi âm chỉ hoạt động trên `http://localhost` hoặc HTTPS. Transcript tạm thời khi đang nói cần Chrome hoặc Edge.

## Kiểm tra trước khi nộp / merge

Mọi thay đổi mã nguồn phải qua 3 lệnh (chạy trong `frontend/`):

```bash
npx eslint .
npx tsc --noEmit
npm run build
```

### Kiểm thử tự động (Playwright)

Playwright đọc biến môi trường từ file **`.env.local` ở thư mục gốc repo** (không phải `frontend/.env.local`). Tạo file này (đã được `.gitignore` chặn) với:

```env
NEXT_PUBLIC_SUPABASE_URL=            # giống frontend/.env.local
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Tài khoản sinh viên thử nghiệm (tạo ở Authentication → Users, bật Auto Confirm User).
# Thiếu thì các ca cần đăng nhập tự bỏ qua (skip), các ca kiểm tra 401 vẫn chạy.
TEST_EMAIL_B=
TEST_PASSWORD_B=

# Dữ liệu cho ca kiểm thử tham gia lớp (tùy chọn — thiếu thì ca đó tự bỏ qua)
TEST_CLASS_JOIN_AVAILABLE_CODE=      # mã một lớp đang hoạt động
TEST_CLASS_JOIN_AVAILABLE_ID=        # UUID của lớp đó
TEST_CLASS_JOIN_UNKNOWN_CODE=        # một mã lớp không tồn tại
```

```bash
cd frontend
npx playwright install chromium         # lần đầu: tải trình duyệt
npx playwright test --project=chromium  # tự khởi động `npm run dev` nếu chưa chạy
npx playwright show-report              # xem báo cáo HTML
npx playwright test ../tests/class-join.spec.ts --project=chromium   # chạy riêng một kịch bản
```

| Kịch bản | Nội dung |
|---|---|
| `tests/tasks.spec.ts` | API `/api/tasks` trả 401 khi thiếu token; kiểm tra độ dài tiêu đề 1/120/121 ký tự; luồng đăng nhập + CRUD công việc |
| `tests/signup.spec.ts` | Đăng ký gửi đúng hồ sơ, không cho tự chọn vai trò giảng viên, kiểm tra mật khẩu xác nhận |
| `tests/auth-routing.spec.ts` | Định tuyến theo `public.users.role`; giảng viên / admin quản lý lớp, duyệt / từ chối / hủy lớp |
| `tests/class-join.spec.ts` | TC01–TC03 tham gia lớp bằng mã (dữ liệu trước / sau). TC01 tạo thành viên thử và **không tự dọn** — gỡ sinh viên khỏi lớp trước khi chạy lại |
| `tests/oralcheck-api.spec.ts` | Các API nghiệp vụ từ chối yêu cầu không có token |
| `tests/assignment-evidence.spec.ts` | Chụp ảnh minh chứng giao diện (E01–E05) với Auth mock |

Một số kịch bản được viết trước khi có luồng làm bài / chấm AI (ví dụ ca kiểm tra trang thi không xin quyền micro); cần cập nhật nếu thay đổi các trang đó.

---

---

## 5. Hướng dẫn Triển khai lên Vercel Free

1. Đưa mã nguồn sạch lên GitHub:
   ```bash
   git add .
   git commit -m "Finish lab 2 database, auth and tests"
   git push origin main
   ```
   *(Kiểm tra đảm bảo `.env.local` không bị đẩy lên GitHub).*
2. Đăng nhập [https://vercel.com](https://vercel.com), chọn **Add New...** → **Project**.
3. Kết nối với tài khoản GitHub và chọn repository `viec-hoc`.
4. Tại mục **Environment Variables**, thêm 2 biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL` = Giá trị Project URL của bạn
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Giá trị Publishable Key của bạn
5. Nhấn **Deploy** và chờ trạng thái **Ready**.
6. Truy cập đường dẫn `https://viec-hoc-*.vercel.app` để nghiệm thu các kịch bản đăng nhập, CRUD và phân quyền online.

---
## Triển khai trực tuyến

Web (Next.js) chạy được trên **Vercel Free**; AI service (Faster-Whisper cần vài trăm MB RAM cho model) **không chạy trên Vercel** — cần host riêng (máy chủ / VPS, Render, Railway, Fly.io…) hoặc chạy trên máy demo và mở ra ngoài bằng tunnel HTTPS.

1. Đưa mã nguồn lên GitHub; kiểm tra **không** có file `.env` / `.env.local` nào được commit (`git status` không được liệt kê chúng).
2. **AI service:** triển khai thư mục `ai-service/` (`pip install -r requirements.txt`, lệnh chạy `uvicorn app.main:app --host 0.0.0.0 --port $PORT`), đặt các biến `WHISPER_MODEL`, `GRADER_EMBEDDING_MODEL`, `AI_SERVICE_TOKEN`. Cần khoảng 3 GB RAM (Faster-Whisper `small` + model embedding + PyTorch); nên cài PyTorch bản chỉ CPU để image nhỏ hơn. Ghi lại URL HTTPS công khai.
3. **Vercel:** [vercel.com](https://vercel.com) → **Add New… → Project** → chọn repository → **Root Directory = `frontend`**.
4. **Environment Variables** trên Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `AI_SERVICE_URL` (URL ở bước 2), `AI_SERVICE_TOKEN` (giống AI service), `WHISPER_MODEL` → **Deploy** và chờ trạng thái **Ready**.
5. **Supabase → Authentication → URL Configuration:** đổi **Site URL** thành domain Vercel (`https://<tên>.vercel.app`) và thêm vào **Redirect URLs** (giữ cả `http://localhost:3000` nếu vẫn chạy local).
6. Nghiệm thu online: đăng nhập 3 vai trò, ghi âm, nộp bài, chấm và công bố điểm.
7. Sau mỗi lần đổi biến môi trường trên Vercel phải **Redeploy** (Deployments → … → Redeploy).

> Nhận dạng giọng nói và chấm AI có thể mất hàng chục giây; nếu gói Vercel đang dùng giới hạn thời gian chạy của hàm serverless thấp hơn, yêu cầu sẽ bị cắt giữa chừng — kiểm tra giới hạn của gói và cấu hình thời lượng tối đa cho các route `/api/submissions/*`.

---

## Câu hỏi chứng minh hiểu bài

1. **Dữ liệu nằm ở đâu sau khi tắt máy phát triển?**
   Trong **Supabase PostgreSQL** trên đám mây (bảng nghiệp vụ) và **Supabase Storage** (file audio, bucket private `oral-answers`), không nằm trong RAM hay LocalStorage. Tắt máy dữ liệu vẫn còn.

2. **Vì sao backend không nhận `user_id` từ form để xác định chủ sở hữu?**
   Người dùng có thể sửa payload bằng DevTools/Postman để mạo danh người khác. Server chỉ lấy `user.id` sau khi xác thực Bearer token JWT bằng `supabase.auth.getUser(token)` trong `authRequest()` (`frontend/src/services/supabase/server.ts`); các RPC trong database cũng dùng `auth.uid()` chứ không tin tham số client gửi.

3. **RLS khác ẩn nút Sửa như thế nào?**
   Ẩn nút chỉ là bảo vệ ở giao diện; kẻ tấn công vẫn gọi thẳng API hoặc Data API của Supabase được. **RLS** chặn ngay trong PostgreSQL (vd. `using (auth.uid() = user_id)`), nên dù biết chính xác ID bản ghi vẫn không đọc/sửa được. Dự án còn tách barem chấm sang bảng riêng chỉ giảng viên đọc được, vì sinh viên có quyền đọc bảng `assignments`.

4. **Vì sao `getSession` phía trình duyệt chưa đủ để API tin người dùng?**
   `getSession` chỉ đọc phiên lưu trong trình duyệt — có thể bị sửa hoặc đã hết hạn. API phải gọi `getUser(token)` tới Supabase Auth để xác minh chữ ký JWT, rồi đọc vai trò từ `public.users`.

5. **Vì sao `npm run build` thành công chưa chứng minh phân quyền đúng?**
   Build chỉ kiểm tra cú pháp, kiểu TypeScript và đóng gói tại compile time. Phân quyền là logic lúc chạy (JWT, RLS policy, RPC kiểm tra vai trò), phải kiểm chứng bằng kiểm thử thực tế với nhiều tài khoản / vai trò.

6. **Sau khi đổi biến môi trường trên Vercel cần làm gì?**
   **Redeploy**. Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build; biến server cũng chỉ áp dụng cho bản deploy mới.

7. **Vì sao `SUPABASE_SECRET_KEY` chỉ được dùng ở server và chỉ cho bước lưu kết quả AI?**
   Secret key bỏ qua RLS. Nếu lộ ra trình duyệt, ai cũng tự ghi điểm được. Vì vậy key không có tiền tố `NEXT_PUBLIC_`, và chỉ dùng để gọi hai RPC chỉ cấp cho `service_role` (đọc ngữ cảnh chấm, lưu đánh giá AI) **sau khi** đã xác thực người dùng và quyền với câu trả lời.

8. **Vì sao điểm AI chỉ là “đề xuất”?**
   Whisper có thể nhận dạng sai, engine chấm có thể chấm sai (đặc biệt câu trả lời đúng chủ đề nhưng nói ngược ý — engine đánh dấu “cần giảng viên duyệt” khi phát hiện mâu thuẫn hoặc không chắc chắn). Giảng viên nghe audio, xem dẫn chứng từng tiêu chí, chỉnh điểm (bắt buộc ghi nhận xét khi khác điểm AI) và chỉ **điểm đã duyệt + công bố** mới hiển thị là điểm chính thức cho sinh viên.

---

## Kịch bản demo nhanh

1. **Quản trị viên** duyệt lớp do giảng viên tạo.
2. **Giảng viên** → Soạn bài tập: đặt giờ bắt đầu + thời lượng, “Nhập đề nhanh / từ file”, “Chèn mẫu” barem, kiểm tra danh sách ✓ → Công bố bài tập.
3. **Sinh viên** tham gia lớp bằng mã → mở bài → **Bắt đầu làm bài** → ghi âm 2 bản cho câu 1, chọn bản ưng ý → Nộp bài → xem ma trận kết quả và phân tích AI.
4. **Giảng viên** → Lớp → tab **Thống kê lớp** → “Chấm bài” → nghe audio, chỉnh điểm theo barem, lưu → **Công bố kết quả đã duyệt**.
5. **Sinh viên** → Trang tổng quan: thông báo “Đã có điểm chính thức”; trang bài tập hiện điểm và nhận xét của giảng viên.

---

## Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| “Không thể tạo transcript” / “Không kết nối được AI service” | AI service chưa chạy ở cổng 8001 → chạy Bước 3 và giữ terminal mở. |
| “Unauthorized AI service request” / “Thiếu AI_SERVICE_TOKEN” | `AI_SERVICE_TOKEN` hai file không khớp; sửa rồi khởi động lại cả `npm run dev` và Uvicorn. |
| Transcript tiếng Việt sai nhiều | Dùng `WHISPER_MODEL=small` hoặc `medium` trong `ai-service/.env`; nhờ sinh viên dùng trang **Thử micro** (`/student/recorder`) để kiểm tra micro và tạp âm trước khi làm bài. |
| Có transcript nhưng AI không chấm được | Thiếu `SUPABASE_SECRET_KEY` trong `frontend/.env.local`, hoặc AI service chưa tải được model embedding lần đầu (cần mạng tới Hugging Face, ~1 GB). Giảng viên vẫn chấm tay được. |
| “Máy chủ chưa chạy supabase/seed.sql và migration 006…” | Chạy SQL số 7 và 8 ở Bước 1. |
| Đăng ký xong không đăng nhập được | “Confirm email” đang bật → bấm link trong email, hoặc tắt ở Bước 1.4. |
| Đăng nhập giảng viên/admin nhưng vẫn vào trang sinh viên | Chưa chạy SQL nâng quyền ở Bước 5, hoặc chưa đăng xuất / đăng nhập lại. |
| `pip install` lỗi khi cài `faster-whisper` / `ctranslate2` / `av` | Dùng Python 3.9–3.12 (bản quá mới có thể chưa có gói dựng sẵn); xóa `.venv`, tạo lại bằng đúng phiên bản rồi cài lại. |
| Lần nhận dạng đầu tiên rất lâu hoặc báo lỗi tải model | Model được tải từ Hugging Face ở lần đầu (`small` ~464 MB); kiểm tra kết nối mạng rồi thử lại. |
| Không ghi âm được | Trình duyệt chỉ cho dùng micro trên `localhost` hoặc HTTPS; kiểm tra quyền micro. Transcript tạm thời cần Chrome/Edge. |
| Không công bố được điểm | Thông báo lỗi ghi rõ số bài chưa duyệt đủ / đang làm dở; chấm các bài đó rồi công bố lại. |

---

## Giới hạn hiện tại

- Đọc đề/barem từ file hỗ trợ `.docx`, `.txt`, `.md`; chưa hỗ trợ `.pdf` / `.doc`.
- Barem gắn theo **số thứ tự câu**; đổi thứ tự câu thì cần kiểm tra lại barem.
- So sánh từ khóa là heuristic (không dùng bộ tách từ tiếng Việt) — chỉ mang tính gợi ý.
- Các trang `/student/recorder` và `/student/exam/*` (phòng thi có camera) đang tạm hoãn; ghi âm nằm trong trang làm bài. Trang `/tasks` là bài tập quản lý công việc từ buổi học trước.
- `backend/` là khung dự phòng, chưa được sử dụng.
- Khi chuyển sang Supabase CLI: `supabase db reset` chạy `seed.sql` **sau** mọi migration, cần đưa các hàm dùng chung thành migration đứng trước 006.

---

## Tài liệu liên quan

- [`docs/DESIGN.md`](docs/DESIGN.md) và `docs/design/`: thiết kế giao diện, mockup.
- `docs/bai-tap-evidence/`: ảnh minh chứng các bài thực hành (không chứa thông tin cá nhân / mật khẩu).
- [`supabase/README.md`](supabase/README.md): thứ tự chạy SQL và vai trò của `seed.sql`.
- [`ai-service/README.md`](ai-service/README.md): chi tiết AI service.
