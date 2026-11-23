# AI OralCheck — Kiểm tra mức độ hiểu bài qua ghi âm

Đồ án môn IE104 (Nhóm 3). Giảng viên giao bài vấn đáp ngắn; sinh viên ghi âm câu trả lời ngay trên trình duyệt; hệ thống chuyển giọng nói thành văn bản (Faster-Whisper) và dùng engine chấm điểm chạy local (Sentence Transformers + PhoBERT, không dùng API AI thương mại) chấm mức độ hiểu theo barem, chỉ ra ý đúng / sai / còn thiếu. Giảng viên nghe lại, chỉnh điểm và công bố điểm chính thức.

**Công nghệ:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · NestJS 11 + hàng đợi pg-boss · Supabase (Postgres, Auth, Storage, RLS) · FastAPI + Faster-Whisper · Sentence Transformers / PhoBERT (chấm điểm local) · MediaRecorder / Web Speech API.

## Lộ trình các bài thực hành

Dự án phát triển dần qua các bài thực hành của môn; trang `/tasks` (quản lý công việc học tập) là phần còn lại từ Bài 1–2.

| Tiêu chí | Bài thực hành 1 (Frontend mock) | Bài thực hành 2 (Fullstack) | Đồ án hiện tại (AI OralCheck) |
|:---|:---|:---|:---|
| **Lưu trữ dữ liệu** | React state trong bộ nhớ (mất khi reload) | **Supabase PostgreSQL** (bền vững) | Postgres + **Supabase Storage** (audio, bucket private) |
| **Xác thực** | Form mô phỏng | **Supabase Auth**, tự chuyển hướng | Supabase Auth + 3 vai trò: sinh viên / giảng viên / quản trị viên |
| **Phân quyền** | Không có | **RLS** + JWT Bearer ở API | RLS + **RPC `security definer`** cho mọi thao tác ghi, hàm kiểm tra quyền dùng chung |
| **Kiến trúc** | Chỉ client | Client ↔ Next.js API ↔ Supabase | Next.js (giao diện) ↔ **backend NestJS** + worker/hàng đợi ↔ Supabase; **AI service** (FastAPI: Faster-Whisper + engine chấm local) |
| **Môi trường chạy** | localhost:3000 | localhost + **Vercel** | localhost (web + backend + worker + AI service); Vercel cho web, phần còn lại host riêng |
| **Kiểm thử** | Thủ công | 12 ca kiểm thử (T01–T12) + Playwright | Playwright (`frontend/tests/`) + lệnh kiểm tra bắt buộc cho frontend và backend |

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
- Thống kê tổng quan; duyệt / từ chối yêu cầu tạo lớp, hủy lớp và cập nhật học hàm / học vị (từ chối phải nhập lý do, giảng viên nhận thông báo).
- Quản lý tài khoản: tìm kiếm, khóa / mở khóa / kích hoạt, chỉnh học hàm; xem và quản lý toàn bộ lớp.

---

## Kiến trúc

```text
Trình duyệt (Next.js client)
   │  ghi âm (MediaRecorder), gọi /api/... cùng origin kèm access token Supabase
   ▼
Next.js (frontend/, cổng 3000) — chỉ giao diện; rewrite chuyển tiếp mọi /api/* sang backend
   ▼
Backend API (NestJS, backend/, cổng 4000) ─────── Supabase (Auth, Postgres + RLS, Storage "oral-answers")
   │  AuthGuard + @Roles, gọi RPC, lưu audio,          ▲          ▲
   │  chỉ GỬI JOB vào hàng đợi (không gọi AI)         │          │ hàng đợi pg-boss (schema pgboss)
   ▼                                                   │          │
Worker chấm điểm (backend, npm run worker) ────────────┴──────────┘
   │  lấy job: ASR → chấm → lưu điểm (RPC worker_* / save_ai_evaluation, service role)
   ▼
AI service FastAPI (backend/src/ai-service, cổng 8001)
   ├─ POST /api/transcribe   Faster-Whisper (chạy local)
   └─ POST /api/grade        engine local: so khớp ngữ nghĩa + từ khóa theo rubric → JSON có kiểm tra schema
```

- ASR + chấm có thể mất từ vài giây tới vài phút nên chạy **bất đồng bộ**: API trả về ngay, frontend theo dõi `GET /api/submissions/:id/status`.
- Mọi quyền truy cập dữ liệu được kiểm soát bằng **RLS** và các **RPC `security definer`**; backend dùng phiên đăng nhập của người dùng, chỉ worker dùng `SUPABASE_SECRET_KEY`.
- Toàn bộ API nằm ở backend NestJS; frontend không còn Route Handler. Next.js chuyển tiếp `/api/*` tới `BACKEND_URL` (`frontend/next.config.ts`), nên trình duyệt chỉ thấy một origin và không cần CORS.
- Worker và AI service xác thực với nhau bằng header `X-AI-Service-Token` (`AI_SERVICE_TOKEN` giống nhau ở hai bên).

---

## Cấu trúc thư mục

```text
IE104_Nhom3/
├── frontend/                     # Ứng dụng Next.js (chỉ giao diện; /api/* được chuyển tiếp sang backend)
│   └── src/
│       ├── app/                  # Chỉ route (page/layout) theo vai trò: student/, teacher/, admin/
│       ├── features/             # Theo tính năng: auth, landing, dashboard, classes, assignments,
│       │                         # exam, grading, tasks, profile, admin (xem features/README.md)
│       ├── components/           # Dùng chung nhiều tính năng: layout/ (sidebar, khung trang), ui/, answers/
│       ├── hooks/                # Hook dùng chung nhiều tính năng (useAnswerWatcher)
│       └── lib/                  # Dùng chung: gọi API, theo dõi job, Supabase client, hồ sơ, lịch bài tập
├── backend/
│   └── src/
│       ├── modules/              # auth, classes, assignments, submissions, grading, student, profiles, admin, notifications, tasks
│       ├── workers/              # grading.worker.ts: lấy job ASR → chấm → lưu điểm
│       ├── integrations/         # asr.service.ts, grader.service.ts (gọi ai-service)
│       ├── queue/                # hàng đợi pg-boss
│       ├── common/               # AuthGuard, @Roles, filter lỗi, Supabase client
│       ├── backend/src/ai-service/           # FastAPI: Faster-Whisper STT + engine chấm điểm local
│       └── supabase/             # SQL theo chức năng: migrations/01 → 11, seed.sql, cleanup_legacy.sql
├── shared/                       # TypeScript thuần dùng chung frontend + backend (đọc barem, phân tích transcript, kiểu dữ liệu)
├── tests/                        # Playwright E2E
├── docs/                         # Thiết kế, mockup, minh chứng
└── package.json                  # Script tiện ích chạy frontend từ thư mục gốc
```

---

## Cài đặt và chạy local

Tóm tắt: **(0)** cài công cụ → **(1)** tạo project Supabase → **(2)** chạy SQL → **(3)** điền biến môi trường → **(4)** cài và chạy **4 tiến trình** (AI service, backend API, worker, web) → **(5)** tạo tài khoản → **(6)** thử nhanh.

```text
Terminal 1: AI service   backend/src/ai-service   http://127.0.0.1:8001
Terminal 2: Backend API  backend/                 http://localhost:4000/api
Terminal 3: Worker       backend/                 (không mở cổng; lấy job ASR → chấm điểm)
Terminal 4: Web          frontend/                http://localhost:3000  (chuyển tiếp /api/* sang backend)
```

### Bước 0. Cài công cụ

| Công cụ | Phiên bản | macOS | Windows | Ubuntu/Debian |
|---|---|---|---|---|
| Node.js + npm | **20.12 trở lên** (backend dùng `process.loadEnvFile`) | `brew install node` | [nodejs.org](https://nodejs.org) (bản LTS) | `sudo apt install nodejs npm` hoặc dùng `nvm` |
| Python | **3.9 – 3.12** | `brew install python@3.11` | [python.org](https://www.python.org/downloads/) (tick “Add to PATH”) | `sudo apt install python3 python3-venv` |
| Git | bất kỳ | có sẵn / `brew install git` | [git-scm.com](https://git-scm.com) | `sudo apt install git` |

Kiểm tra: `node -v`, `python3 --version` (Windows: `python --version`). Không cần cài FFmpeg: Faster-Whisper đọc audio bằng thư viện PyAV đi kèm.

### Bước 1. Tạo project Supabase và lấy thông tin kết nối

1. Vào [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**, chọn vùng gần nhất (ví dụ Singapore), đặt **mật khẩu database** và lưu lại.
2. Lấy các giá trị sau (dùng ở Bước 3):

   | Giá trị | Lấy ở đâu | Dùng cho biến |
   |---|---|---|
   | Project URL | **Project Settings → Data API** (hoặc nút **Connect**) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` |
   | Publishable key (`sb_publishable_…`, hoặc anon key) | **Project Settings → API Keys** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` |
   | Secret key (`sb_secret_…`, hoặc service_role key) | **Project Settings → API Keys** | `SUPABASE_SECRET_KEY` (chỉ backend) |
   | Chuỗi kết nối Postgres — chế độ **Session pooler** (cổng 5432) | Nút **Connect** → *Connection string* → *Session pooler*; thay `[YOUR-PASSWORD]` bằng mật khẩu database | `DATABASE_URL` (hàng đợi pg-boss) |

3. **Authentication → Sign In / Providers → Email**: bật Email. Khi chạy local có thể tắt **Confirm email** để đăng ký xong đăng nhập được ngay (nếu bật thì phải cấu hình SMTP).
4. **Authentication → URL Configuration**: **Site URL** = `http://localhost:3000`.

### Bước 2. Tạo bảng, phân quyền và hàm nghiệp vụ (SQL)

Mở **SQL Editor → New query**, dán và chạy **lần lượt** nội dung từng file trong `backend/src/supabase/migrations/` (mỗi file một query):

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | `01_tables.sql` | bảng, ràng buộc, index, bật RLS, quyền đọc |
| 2 | `02_helpers.sql` | hàm dùng chung (vai trò, quyền, thời gian làm bài, lượt làm, transcript) |
| 3 | `03_views.sql` | view theo vai trò |
| 4 | `04_policies.sql` | RLS policies, bucket audio `oral-answers` |
| 5 | `05_auth_signup.sql` | tự tạo hồ sơ khi đăng ký |
| 6 | `06_classes.sql` | lớp học: tạo / duyệt / hủy / sửa, tham gia bằng mã |
| 7 | `07_assignments.sql` | soạn bài tập, barem, đáp án, số lần làm lại |
| 8 | `08_submissions.sql` | làm bài, nhiều phiên bản ghi âm, nộp bài |
| 9 | `09_grading.sql` | hàng đợi chấm, worker, giảng viên duyệt, công bố điểm |
| 10 | `10_profiles_admin.sql` | học hàm / học vị, khóa / mở khóa tài khoản |
| 11 | `11_tasks.sql` | việc cá nhân của sinh viên |

- Mỗi file chạy xong hiện *Success. No rows returned*. Mọi file **chạy lại nhiều lần vẫn an toàn**; khi sửa một chức năng chỉ cần chạy lại đúng file đó.
- Database đã từng chạy bộ migration cũ `000 → 012`: chạy lại `01 → 11`, sau đó (tùy chọn) `backend/src/supabase/cleanup_legacy.sql` để bỏ bảng `profiles` và các hàm không còn dùng — **xóa bảng không hoàn tác được**.
- `backend/src/supabase/seed.sql` là dữ liệu mẫu cho dev (thay UUID trước khi chạy). Chi tiết: [backend/src/supabase/README.md](backend/src/supabase/README.md).

### Bước 3. Biến môi trường

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp backend/src/ai-service/.env.example backend/src/ai-service/.env
# Windows (PowerShell):
# Copy-Item frontend\.env.example frontend\.env.local ; Copy-Item backend\.env.example backend\.env ; Copy-Item backend\src\ai-service\.env.example backend\src\ai-service\.env
```

Tạo một chuỗi bí mật dùng chung cho `AI_SERVICE_TOKEN`:

```bash
openssl rand -hex 32
# hoặc: python3 -c "import secrets; print(secrets.token_hex(32))"
```

Mở ba file vừa tạo và điền (giá trị lấy ở Bước 1):

| Biến | `frontend/.env.local` | `backend/.env` | `backend/src/ai-service/.env` | Ghi chú |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | ✔ | ✔ | | cùng một Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | ✔ | ✔ | | cùng một publishable key |
| `BACKEND_URL` | ✔ | | | giữ `http://localhost:4000` (Next.js chuyển tiếp `/api/*` tới đây) |
| `SUPABASE_SECRET_KEY` | | ✔ | | **chỉ backend**; worker lưu kết quả chấm, admin đọc email tài khoản |
| `DATABASE_URL` | | ✔ | | chuỗi Session pooler (Bước 1) cho hàng đợi pg-boss |
| `PORT`, `CORS_ORIGINS` | | ✔ | | giữ `4000` và `http://localhost:3000` |
| `AI_SERVICE_URL` | | ✔ | | giữ `http://127.0.0.1:8001` |
| `AI_SERVICE_TOKEN` | | ✔ | ✔ | **giống hệt nhau** ở hai file |
| `WHISPER_MODEL` | | ✔ | ✔ | `small` (khuyến nghị) hoặc `base` (nhanh hơn, sai nhiều hơn với tiếng Việt) |
| `WORKER_CONCURRENCY` | | ✔ | | số job xử lý song song, nên để `1` |
| `GRADER_EMBEDDING_MODEL` | | | ✔ | để trống = `keepitreal/vietnamese-sbert`; không cần API key |

Các biến còn lại trong `backend/src/ai-service/.env` (`WHISPER_DEVICE`, `GRADER_*`…) để trống là dùng giá trị mặc định. **Không commit** file `.env` / `.env.local` thật; chỉ `.env.example` (khóa để trống) nằm trong git.

### Bước 4. Cài đặt và chạy 4 tiến trình

**Terminal 1 — AI service** (nhận dạng giọng nói + engine chấm điểm):

```bash
cd backend/src/ai-service
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt      # lần đầu tải Faster-Whisper, Sentence Transformers (khá lâu)
uvicorn app.main:app --reload --port 8001 --env-file .env
```

Thấy `Uvicorn running on http://127.0.0.1:8001` là được; kiểm tra: `curl http://127.0.0.1:8001/health`. Lần nhận dạng / chấm đầu tiên tải model từ Hugging Face (Whisper `small` ~464 MB, model embedding ~1 GB) nên mất vài phút. Lần sau chỉ cần `source .venv/bin/activate` rồi lệnh `uvicorn`.

**Terminal 2 — Backend API** và **Terminal 3 — Worker**:

```bash
cd backend
npm install            # chỉ lần đầu
npm run start:dev      # API: http://localhost:4000/api  — kiểm tra: curl http://localhost:4000/api/health
```

```bash
cd backend
npm run worker:dev     # lấy job từ hàng đợi: nhận dạng giọng nói → chấm điểm → lưu điểm
```

Lần đầu khởi động, pg-boss tự tạo schema `pgboss` trong database Supabase. Thiếu biến môi trường thì backend báo rõ **tên** biến còn thiếu (không in giá trị).

**Terminal 4 — Web**:

```bash
cd frontend
npm install            # chỉ lần đầu
npm run dev            # hoặc từ thư mục gốc: npm run dev
```

Mở **http://localhost:3000**. Sau khi sửa file `.env` nào thì khởi động lại đúng tiến trình đó. Bản production: `npm run build && npm start` (trong `frontend/` và `backend/`; worker: `npm run worker`).

> Thiếu tiến trình nào thì: không có **backend** → mọi trang báo lỗi tải dữ liệu; không có **worker** → ghi âm lưu được nhưng transcript / điểm AI chờ mãi; không có **AI service** → câu trả lời báo lỗi nhận dạng, bấm thử lại sau khi bật.

### Bước 5. Tạo tài khoản và phân quyền

Đăng ký công khai tại `/signup` **luôn tạo tài khoản sinh viên**. Vai trò chuẩn nằm ở cột `public.users.role` (`student`, `lecturer`, `admin`).

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

Khi tạo user ở **Authentication → Users → Add user** (đánh dấu **Auto Confirm User** để đăng nhập được ngay), Supabase chỉ tạo tài khoản đăng nhập — **không tự tạo hồ sơ ứng dụng**. Sao chép **UUID** của user rồi chạy một trong các lệnh sau:

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

- **`public.users.role` là nguồn phân quyền duy nhất**. **Không** cấp vai trò qua `user_metadata` — người dùng tự gửi được giá trị này khi đăng ký.
- **Quản trị viên Supabase** (mời ở *Organization → Team*) quản lý hạ tầng: chạy SQL, xem log, đổi cấu hình. **Quản trị viên ứng dụng** là tài khoản website có `role = 'admin'` (duyệt lớp, quản lý tài khoản). Chỉ quản trị viên Supabase mới cấp được vai trò ứng dụng.
- Không gửi mật khẩu qua chat, không lưu mật khẩu / token vào ảnh minh chứng hay git.

### Bước 6. Thử nhanh để chắc chắn mọi thứ đã kết nối

1. `curl http://localhost:3000/api/health` → `{"data":{"ok":true}}` (web → backend đã thông).
2. **Giảng viên** → Lớp học → tạo lớp → **Quản trị viên** → Duyệt yêu cầu → duyệt lớp.
3. **Giảng viên** → Soạn bài tập → chọn lớp, giờ bắt đầu = bây giờ, thời lượng 10 phút, thêm 1 câu hỏi → **Công bố bài tập**. Ghi lại **mã lớp**.
4. **Sinh viên** → Lớp học → nhập mã lớp → mở bài → **Bắt đầu làm bài** → cho phép micro → ghi âm 5–10 giây.
   - Thẻ câu hỏi hiện “đang nhận dạng…” rồi transcript → Storage + worker + AI service (Whisper) đã thông.
   - Bấm **Nộp bài** → điểm AI đề xuất hiện dần → worker + engine chấm + `SUPABASE_SECRET_KEY` của backend đã thông.
5. Nếu bước nào lỗi, đọc dòng chữ đỏ trên giao diện, log của terminal tương ứng và mục **Xử lý sự cố** bên dưới.

> Ghi âm chỉ hoạt động trên `http://localhost` hoặc HTTPS. Transcript tạm thời khi đang nói cần Chrome hoặc Edge.

## Kiểm tra trước khi nộp / merge

```bash
# frontend/
npx eslint .
npx tsc --noEmit
npm run build

# backend/
npm run typecheck
npm run build
```

### Kiểm thử engine chấm điểm (AI service)

```bash
cd backend/src/ai-service && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests -q
python -m scripts.evaluate_grader --cases       # sai số so với điểm kỳ vọng (--calibrate: dò lại ngưỡng)
```

> Test dùng model embedding thật (lần đầu tải từ Hugging Face; đã có trong cache thì thêm `HF_HUB_OFFLINE=1` để chạy không cần mạng). Kết quả hiện tại (dữ liệu tổng hợp, chưa phải điểm giảng viên thật): 64 test qua; tập test MAE 1,42/10, 58% bài lệch ≤ 1 điểm, tương quan 0,86.

### Kiểm thử tự động (Playwright)

Playwright đọc biến môi trường từ **`frontend/.env.local`** (cùng file web dùng). Thêm vào file đó nếu muốn chạy các ca cần đăng nhập thật:

```env
# Tài khoản sinh viên thử nghiệm (tạo ở Authentication → Users, bật Auto Confirm User).
# Thiếu thì các ca cần đăng nhập tự bỏ qua (skip); các ca kiểm tra 401 và ca dùng mock vẫn chạy.
TEST_EMAIL_B=
TEST_PASSWORD_B=

# Dữ liệu cho ca kiểm thử tham gia lớp (tùy chọn — thiếu thì ca đó tự bỏ qua)
TEST_CLASS_JOIN_AVAILABLE_CODE=      # mã một lớp đang hoạt động
TEST_CLASS_JOIN_AVAILABLE_ID=        # UUID của lớp đó
TEST_CLASS_JOIN_UNKNOWN_CODE=        # một mã lớp không tồn tại
```

Backend phải đang chạy (Terminal 2) vì mọi `/api/*` được chuyển tiếp sang đó.

```bash
cd frontend
npx playwright install chromium                                   # lần đầu: tải đúng bản trình duyệt
npx playwright test --project=chromium                            # tự chạy `npm run dev` nếu cổng 3000 chưa có server
npx playwright test tests/class-join.spec.ts --project=chromium   # chạy riêng một kịch bản
npx playwright show-report                                        # xem báo cáo HTML
```

| Kịch bản | Nội dung |
|---|---|
| `tests/tasks.spec.ts` | API `/api/tasks` trả 401 khi thiếu token; độ dài tiêu đề 1/120/121 ký tự; đăng nhập + CRUD công việc |
| `tests/signup.spec.ts` | Đăng ký gửi đúng hồ sơ, không cho tự chọn vai trò giảng viên, kiểm tra mật khẩu xác nhận |
| `tests/auth-routing.spec.ts` | Định tuyến theo `public.users.role`; giảng viên / admin quản lý lớp, duyệt / từ chối / hủy lớp |
| `tests/class-join.spec.ts` | Tham gia lớp bằng mã (thành công, trùng, mã lạ). Ca thành công tạo thành viên thử và **không tự dọn** — gỡ sinh viên khỏi lớp trước khi chạy lại |
| `tests/oralcheck-api.spec.ts` | Các API nghiệp vụ từ chối yêu cầu không có token |
| `tests/assignment-evidence.spec.ts` | Chụp ảnh minh chứng giao diện (E01–E05) và các luồng soạn bài / xem đề với API mock |

> Lần chạy gần nhất: 25 ca qua. 4 ca trong `assignment-evidence.spec.ts` / `auth-routing.spec.ts` còn tìm chữ / nút của giao diện cũ (cần cập nhật kịch bản); 2 ca trong `tasks.spec.ts` cần `backend/.env` thật để xác thực tài khoản thử nghiệm.

---

## Triển khai trực tuyến

Web (Next.js) chạy được trên **Vercel Free**. Backend NestJS + worker (process chạy lâu dài) và AI service (Faster-Whisper cần vài trăm MB RAM cho model) **không chạy trên Vercel** — cần host riêng (máy chủ / VPS, Render, Railway, Fly.io…) hoặc chạy trên máy demo và mở ra ngoài bằng tunnel HTTPS.

1. Đưa mã nguồn lên GitHub; kiểm tra **không** có file `.env` / `.env.local` nào được commit (`git status` không được liệt kê chúng).
2. **AI service:** triển khai thư mục `backend/src/ai-service/` (`pip install -r requirements.txt`, lệnh chạy `uvicorn app.main:app --host 0.0.0.0 --port $PORT`), đặt các biến `WHISPER_MODEL`, `GRADER_EMBEDDING_MODEL`, `AI_SERVICE_TOKEN`. Cần khoảng 3 GB RAM (Faster-Whisper `small` + model embedding + PyTorch); nên cài PyTorch bản chỉ CPU để image nhỏ hơn. Ghi lại URL HTTPS công khai.
3. **Backend + worker:** triển khai thư mục `backend/` (`npm ci && npm run build`; hai tiến trình `npm start` và `npm run worker`), đặt các biến trong `backend/.env.example` (`AI_SERVICE_URL` = URL ở bước 2, `CORS_ORIGINS` = domain Vercel). Ghi lại URL HTTPS công khai của API.
4. **Vercel:** [vercel.com](https://vercel.com) → **Add New… → Project** → chọn repository → **Root Directory = `frontend`**.
5. **Environment Variables** trên Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `BACKEND_URL` (URL ở bước 3) → **Deploy** và chờ trạng thái **Ready**. Frontend không cần secret key hay token AI.
6. **Supabase → Authentication → URL Configuration:** đổi **Site URL** thành domain Vercel (`https://<tên>.vercel.app`) và thêm vào **Redirect URLs** (giữ cả `http://localhost:3000` nếu vẫn chạy local).
7. Nghiệm thu online: đăng nhập 3 vai trò, ghi âm, nộp bài, chấm và công bố điểm.
8. Sau mỗi lần đổi biến môi trường trên Vercel phải **Redeploy** (Deployments → … → Redeploy).

> Nhận dạng giọng nói và chấm AI chạy trong worker (bất đồng bộ), nên request qua Vercel luôn ngắn: API chỉ lưu audio, đưa job vào hàng đợi rồi trả về; giao diện tự hỏi lại trạng thái.

---

## Câu hỏi chứng minh hiểu bài

1. **Dữ liệu nằm ở đâu sau khi tắt máy phát triển?**
   Trong **Supabase PostgreSQL** trên đám mây (bảng nghiệp vụ) và **Supabase Storage** (file audio, bucket private `oral-answers`), không nằm trong RAM hay LocalStorage. Tắt máy dữ liệu vẫn còn.

2. **Vì sao backend không nhận `user_id` từ form để xác định chủ sở hữu?**
   Người dùng có thể sửa payload bằng DevTools/Postman để mạo danh người khác. Backend chỉ lấy `user.id` sau khi xác thực Bearer token JWT bằng `supabase.auth.getUser(token)` trong `AuthGuard` (`backend/src/common/auth/auth.guard.ts`); các RPC trong database cũng dùng `auth.uid()` chứ không tin tham số client gửi.

3. **RLS khác ẩn nút Sửa như thế nào?**
   Ẩn nút chỉ là bảo vệ ở giao diện; kẻ tấn công vẫn gọi thẳng API hoặc Data API của Supabase được. **RLS** chặn ngay trong PostgreSQL (vd. `using (auth.uid() = user_id)`), nên dù biết chính xác ID bản ghi vẫn không đọc/sửa được. Dự án còn tách barem chấm sang bảng riêng chỉ giảng viên đọc được, vì sinh viên có quyền đọc bảng `assignments`.

4. **Vì sao `getSession` phía trình duyệt chưa đủ để API tin người dùng?**
   `getSession` chỉ đọc phiên lưu trong trình duyệt — có thể bị sửa hoặc đã hết hạn. API phải gọi `getUser(token)` tới Supabase Auth để xác minh chữ ký JWT, rồi đọc vai trò từ `public.users`.

5. **Vì sao `npm run build` thành công chưa chứng minh phân quyền đúng?**
   Build chỉ kiểm tra cú pháp, kiểu TypeScript và đóng gói tại compile time. Phân quyền là logic lúc chạy (JWT, RLS policy, RPC kiểm tra vai trò), phải kiểm chứng bằng kiểm thử thực tế với nhiều tài khoản / vai trò.

6. **Sau khi đổi biến môi trường trên Vercel cần làm gì?**
   **Redeploy**. Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build; biến server cũng chỉ áp dụng cho bản deploy mới.

7. **Vì sao `SUPABASE_SECRET_KEY` chỉ được dùng ở server và chỉ cho bước lưu kết quả AI?**
   Secret key bỏ qua RLS. Nếu lộ ra trình duyệt, ai cũng tự ghi điểm được. Vì vậy key chỉ nằm trong `backend/.env` (frontend không có), và chỉ worker dùng để gọi các RPC cấp riêng cho `service_role` (nhận job, lưu transcript, đọc ngữ cảnh chấm, lưu đánh giá AI); API chỉ đưa job vào hàng đợi **sau khi** RPC `can_enqueue_answer_job` xác nhận người gọi có quyền với câu trả lời.

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
| Mọi trang báo lỗi tải dữ liệu / `/api/...` trả 500 hoặc 502 | Backend chưa chạy ở cổng 4000 → chạy Terminal 2 ở Bước 4 (`npm run start:dev` trong `backend/`). |
| Ghi âm xong cứ “đang nhận dạng…” | Worker chưa chạy (Terminal 3: `npm run worker:dev`), hoặc `DATABASE_URL` sai (phải là chuỗi **Session pooler**, đã thay mật khẩu). |
| Backend thoát ngay, báo “Thiếu hoặc sai biến môi trường trong backend/.env: …” | Chưa tạo `backend/.env` hoặc thiếu các biến được liệt kê → xem Bước 3. |
| “Không thể tạo transcript” / “Không kết nối được AI service” | AI service chưa chạy ở cổng 8001 → chạy Terminal 1 ở Bước 4 và giữ terminal mở. |
| “Unauthorized AI service request” / “Thiếu AI_SERVICE_TOKEN” | `AI_SERVICE_TOKEN` trong `backend/.env` và `backend/src/ai-service/.env` không khớp; sửa rồi khởi động lại worker và Uvicorn. |
| Transcript tiếng Việt sai nhiều | Dùng `WHISPER_MODEL=small` hoặc `medium` trong `backend/src/ai-service/.env`; nhờ sinh viên dùng trang **Thử micro** (`/student/recorder`) để kiểm tra micro và tạp âm trước khi làm bài. |
| Có transcript nhưng AI không chấm được | Thiếu `SUPABASE_SECRET_KEY` trong `backend/.env`, hoặc AI service chưa tải được model embedding lần đầu (cần mạng tới Hugging Face, ~1 GB). Giảng viên vẫn chấm tay được. |
| “Máy chủ chưa chạy 0x_….sql …” | Chạy lại file SQL được nêu trong `backend/src/supabase/migrations/`. |
| Đăng ký xong không đăng nhập được | “Confirm email” đang bật → bấm link trong email, hoặc tắt **Confirm email** ở Bước 1. |
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
- Trang `/student/exam/*` (phòng thi có camera) đang tạm hoãn; ghi âm nằm trong trang làm bài, kiểm tra micro ở `/student/recorder`. Trang `/tasks` là bài tập quản lý công việc từ buổi học trước.
- Web cần backend chạy cùng (mọi `/api/*` được chuyển tiếp sang backend); ASR và chấm điểm cần thêm worker và AI service.

---

## Tài liệu liên quan

- [`docs/guide/Tong_quan_du_an_AI_ORAL.md`](docs/guide/Tong_quan_du_an_AI_ORAL.md): tổng quan dự án, use case, kiến trúc.
- `docs/design/`: thiết kế giao diện, mockup (`prototypes/` là các trang mẫu cũ, không nằm trong mã nguồn chạy).
- [`backend/src/supabase/README.md`](backend/src/supabase/README.md): các file SQL theo chức năng và thứ tự chạy.
- [`backend/src/ai-service/README.md`](backend/src/ai-service/README.md): chi tiết AI service.
- [`frontend/src/features/README.md`](frontend/src/features/README.md): cách tổ chức mã nguồn frontend theo tính năng.
- [`shared/README.md`](shared/README.md): mã dùng chung frontend + backend.
