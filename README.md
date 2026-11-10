# Dự án: Việc học của tôi (OralEval IE104) - Hoàn thiện & Triển khai Website (Bài thực hành 2)

Ứng dụng web quản lý danh sách công việc học tập và cấu hình câu hỏi vấn đáp cho hệ thống **OralEval IE104**, được xây dựng bằng Next.js App Router, TypeScript, Tailwind CSS, kết nối lưu trữ thật trên **Supabase PostgreSQL**, xác thực người dùng bằng **Supabase Auth**, phân quyền dữ liệu bằng **Row Level Security (RLS)**, kiểm thử tự động với **Playwright** và triển khai trực tuyến trên **Vercel Free**.

---

## 1. Điểm nổi bật & Khác biệt giữa Bài 1 và Bài 2

| Tiêu chí | Bài thực hành 1 (Frontend Mock) | Bài thực hành 2 (Fullstack Production) |
|:---|:---|:---|
| **Lưu trữ dữ liệu** | In-memory React State (mất khi reload) | **Supabase PostgreSQL** thật (dữ liệu bền vững sau reload) |
| **Xác thực (Auth)** | Form mô phỏng, có link bỏ qua | **Supabase Auth** thật, phiên làm việc an toàn, tự động redirect |
| **Phân quyền (Authz)** | Không phân quyền | **Row Level Security (RLS)** ở Database + JWT Bearer Token ở API |
| **Kiến trúc** | Client-only component | **Client ↔ Next.js API Routes (`/api/tasks`) ↔ Supabase Database** |
| **Môi trường chạy** | Chỉ localhost:3000 | **Localhost + Triển khai Production trên Vercel** |
| **Kiểm thử** | Thao tác thủ công cơ bản | **12 Test Cases (T01–T12) + Playwright E2E Testing** |

---

## 2. Hướng dẫn thiết lập Cơ sở dữ liệu Supabase & Môi trường

### Bước 1: Tạo Project trên Supabase
1. Truy cập [https://supabase.com/dashboard](https://supabase.com/dashboard) và đăng nhập/đăng ký tài khoản.
2. Bấm **New Project**, đặt tên project là `viec-hoc-lab`, chọn vùng (Region) gần nhất (ví dụ: `Singapore`), đặt mật khẩu database mạnh và lưu riêng.
3. Sau khi khởi tạo xong, vào mục **Project Settings** → **API** để lấy:
   - **Project URL**
   - **Publishable Key (hoặc anon key)**

### Bước 2: Tạo Bảng và Thiết lập Row Level Security (RLS)
1. Trong Dashboard Supabase, mở **SQL Editor** → **New query**.
2. Chạy lần lượt toàn bộ nội dung các tệp sau, mỗi tệp trong một query riêng:
   - [`supabase/ie104_supabase_schema.sql`](./supabase/ie104_supabase_schema.sql)
   - [`supabase/oralcheck_backend.sql`](./supabase/oralcheck_backend.sql)
   - [`supabase/signup.sql`](./supabase/signup.sql)
3. Các script tạo schema lớp học/bài tập, RLS và RPC workflow; `signup.sql` đồng bộ hồ sơ cũ sang `public.users` mà không ghi đè trạng thái tài khoản hiện có. Khi cập nhật mã SQL, chạy lại script tương ứng trong SQL Editor.
   - Nếu nâng cấp từ phiên bản backend trước, chạy lại `oralcheck_backend.sql` sau khi cập nhật để cài các RPC phân quyền admin, tạo lớp/bài tập, xóa sinh viên khỏi lớp, chặn truy cập roster/bài tập của lớp chưa duyệt và hiển thị tên giảng viên an toàn cho thành viên lớp. Khi từ chối yêu cầu mở lớp, bản ghi lớp sẽ được xóa khỏi danh sách; yêu cầu và lý do vẫn được lưu trong `approval_requests`, đồng thời giảng viên nhận thông báo trong ứng dụng.
4. Đăng ký công khai chỉ tạo tài khoản sinh viên. Để cấp tài khoản giảng viên, quản trị viên tạo người dùng trong Supabase Auth, lấy UUID của tài khoản rồi chạy câu lệnh sau trong SQL Editor:

   ```sql
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
   ```

   Chỉ quản trị viên được chạy thao tác này. `public.users.role` là nguồn phân quyền chuẩn (`student`, `lecturer`, `admin`); `public.profiles` chỉ còn để tương thích với dữ liệu đăng ký cũ, ứng dụng đọc role từ `public.users`. Không cấp quyền giảng viên từ `user_metadata` do người dùng tự gửi.

#### Tạo hồ sơ cho tài khoản tạo thủ công

- Khi sinh viên đăng ký qua form `/signup`, các trigger tạo dòng `public.profiles`, `public.users` và `public.student_profiles`. Chạy đủ ba SQL script theo đúng thứ tự ở trên trước khi đăng ký.
- Nếu tạo user thủ công trong **Authentication → Users**, Supabase Auth tạo tài khoản nhưng không tự tạo hồ sơ ứng dụng nếu không có metadata cần thiết. Quản trị viên cần thêm hồ sơ bằng UUID của user. Ví dụ cho sinh viên:

  ```sql
  insert into public.users (id, full_name, role, account_status)
  values ('UUID_CUA_USER', 'Họ tên sinh viên', 'student', 'active');

  insert into public.student_profiles (user_id, student_code, department)
  values ('UUID_CUA_USER', 'MSSV_MOI', 'Tên khoa');

  insert into public.profiles (id, role, institutional_id, full_name, faculty)
  values ('UUID_CUA_USER', 'student', 'MSSV_MOI', 'Họ tên sinh viên', 'Tên khoa');
  ```

- Mã số (`institutional_id`) phải chưa được hồ sơ khác sử dụng. Với giảng viên tạo thủ công, dùng hướng dẫn cấp role `teacher` ở trên. Không chạy lệnh SQL thủ công cho tài khoản đã được trigger tạo hồ sơ thành công, trừ khi cần cập nhật hồ sơ.

#### Phân biệt quản trị viên Supabase và quản trị viên ứng dụng

- **Quản trị viên Supabase project/organization:** Mời thành viên trong phần **Access Control / Team** của Supabase và chỉ cấp quyền cần thiết. Đây là quyền quản lý hạ tầng Supabase, không phải role đăng nhập của website.
- **Quản trị viên trong ứng dụng:** Role chuẩn được lưu ở `public.users`; tạo user trong Supabase Auth rồi thêm `public.users.role = 'admin'`. Không gán `admin` vào `public.profiles`.
- **Tạo tài khoản đăng nhập admin:** Trong Supabase Dashboard → **Authentication → Users → Add user**, tạo user bằng email và mật khẩu do bạn quản lý (xác nhận email nếu project yêu cầu), rồi sao chép UUID. Trong **SQL Editor**, chạy lệnh dưới đây sau khi thay UUID và họ tên; sau đó đăng nhập tại `/login`, ứng dụng sẽ chuyển role admin tới `/admin`.

  ```sql
  insert into public.users (id, full_name, role, account_status)
  values ('UUID_TAI_KHOAN_AUTH', 'Họ tên quản trị viên', 'admin', 'active')
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = 'admin',
        account_status = 'active';
  ```

  Chỉ người có quyền quản trị Supabase mới được tạo/cấp role này. Không gửi mật khẩu qua chat và không gán role `admin` vào `user_metadata` hoặc `public.profiles`.
- **Dashboard giảng viên (`/teacher/classes`):** Giảng viên tạo lớp sẽ gửi yêu cầu chờ admin duyệt. Dropdown khoa của form tạo lớp được cấu hình trong `src/components/TeacherClasses.tsx`. Danh sách lớp, sinh viên tham gia và bài tập lấy từ API/Supabase. Tạo bài tập chỉ bật cho lớp đang hoạt động.
- **Dashboard quản trị (`/admin`):** Admin có thể mở `/admin/classes` để xem lớp, mở danh sách lớp/sinh viên/bài tập, tạo lớp được kích hoạt ngay và soạn bài tập. Lớp có sinh viên hoặc bài tập khi bị xóa sẽ được lưu trữ để giữ nguyên dữ liệu liên quan.
- **Dashboard sinh viên (`/student/classes`):** Sinh viên tham gia lớp bằng mã lớp và xem các bài tập đã được công bố. Ghi âm, camera, chuyển giọng nói thành văn bản và AI chấm điểm hiện chưa bật.
- **Xem đề bài (`/student/assignments/[id]`):** Sinh viên xem hướng dẫn, hạn nộp và câu hỏi; đáp án tham khảo/rubric không được trả về cho role sinh viên.
- **Soạn bài tập (`/teacher/assignments/create`):** Giảng viên và admin chọn lớp đang hoạt động, nhập hướng dẫn, hạn nộp, câu hỏi, đáp án tham khảo và tiêu chí chấm; lưu nháp để tiếp tục chỉnh sửa hoặc công bố cho sinh viên.
- **Xóa bài tập:** Giảng viên có thể xóa bài tập trong chi tiết lớp. Bài tập chưa có bài nộp sẽ bị xóa; bài đã có bài nộp sẽ được lưu trữ để bảo toàn kết quả.
- **Yêu cầu hủy lớp:** Giảng viên gửi yêu cầu từ chi tiết lớp đang hoạt động. Lớp chỉ được lưu trữ sau khi quản trị viên phê duyệt.
- **Xóa sinh viên khỏi lớp:** Giảng viên phụ trách lớp và admin có thể gỡ sinh viên khỏi danh sách lớp. Tài khoản và bài nộp được giữ lại; sinh viên có thể tham gia lại bằng mã lớp nếu lớp còn hoạt động.
- **Bài tập cá nhân (`/tasks`):** CRUD cá nhân tiếp tục dùng `public.tasks`.

### Ghi chú UX và phần chưa hoàn thiện

- Tạo lớp hiện gom mã môn, khoa, phòng và lịch vào trường `classes.description`; hiện chưa có cột riêng nên việc lọc/sắp xếp theo từng thông tin lớp còn hạn chế.
- Thống kê số sinh viên, tiến độ nộp và điểm chưa có nguồn dữ liệu hiển thị trong dashboard; giao diện không nên xem số rỗng là tiến độ bằng 0. Thẻ giảng viên hiện hiển thị số bài tập thực tế; điểm trung bình và quy trình khảo thí vẫn chưa bật.
- Sinh viên hiện chỉ xem đề và hạn nộp. Luồng nộp bài, chấm điểm và xem kết quả chưa bật; các mục ghi âm, camera, Speech-to-Text và AI được đánh dấu tạm hoãn.
- Quản trị viên duyệt lớp và gửi thông báo được hỗ trợ; quản lý tài khoản và thống kê AI chưa triển khai.

### Bước 3: Cấu hình xác nhận email và tài khoản thử nghiệm
1. Trong **Authentication** → **Providers** → **Email**, bật nhà cung cấp Email. Nếu bật xác nhận email, cấu hình SMTP để gửi thư xác nhận; tài khoản chỉ đăng nhập được sau khi xác nhận.
2. Trong **Authentication** → **URL Configuration**, đặt **Site URL** phù hợp (ví dụ `http://localhost:3000` khi chạy local) để liên kết xác nhận quay về đúng ứng dụng.
3. Trong **Authentication** → **Users** → **Add user** (hoặc **Create user**), tạo hai tài khoản thử nghiệm:
   - **Tài khoản A**: `usera@gm.uit.edu.vn` / mật khẩu tự chọn
   - **Tài khoản B**: `userb@gm.uit.edu.vn` / mật khẩu tự chọn
4. Với tài khoản thử nghiệm tạo thủ công, đánh dấu **Auto Confirm Email** để có thể đăng nhập ngay.

### Bước 4: Cấu hình biến môi trường tại máy Local
Tại thư mục gốc dự án, tạo tệp `.env.local` (tệp này đã được `.gitignore` bảo vệ, tuyệt đối không đưa lên GitHub):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY

# Biến dùng riêng cho Playwright E2E Test tại local (tùy chọn)
TEST_EMAIL_A=usera@gm.uit.edu.vn
TEST_PASSWORD_A=YourSecurePassword123#
TEST_EMAIL_B=userb@gm.uit.edu.vn
TEST_PASSWORD_B=YourSecurePassword123#
```

Tham khảo mẫu chuẩn tại [`.env.example`](file:///d:/HocTap/Nam%203/HK1/IE104/viec-hoc/.env.example).

---

## 3. Cài đặt và Chạy ứng dụng

```bash
# 1. Cài đặt các gói thư viện
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).  
- Khi chưa đăng nhập, truy cập `/` hoặc `/tasks` sẽ tự động chuyển về `/login`.
- Đăng nhập bằng tài khoản A để thêm, sửa, đánh dấu hoàn thành và xóa công việc.
- Dùng cửa sổ ẩn danh đăng nhập bằng tài khoản B để xác minh tính năng cô lập dữ liệu (B không thấy việc của A).

---

## 4. Các lệnh kiểm tra chất lượng & Kiểm thử tự động

```bash
# 1. Kiểm tra định dạng mã nguồn
npx eslint .

# 2. Kiểm tra kiểu dữ liệu nghiêm ngặt
npx tsc --noEmit

# 3. Đóng gói kiểm thử toàn bộ ứng dụng Next.js
npm run build

# 4. Chạy bộ kiểm thử tự động Playwright (headless)
npx playwright test --project=chromium

# 5. Xem báo cáo chi tiết kiểm thử Playwright dạng trực quan
npx playwright show-report
```

*Ma trận kết quả kiểm thử 12 kịch bản chi tiết xem tại [`docs/test-results.md`](file:///d:/HocTap/Nam%203/HK1/IE104/viec-hoc/docs/test-results.md).*

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

## 6. Câu hỏi chứng minh hiểu bài (Trả lời phỏng vấn / Báo cáo)

1. **Dữ liệu nằm ở đâu sau khi tắt máy phát triển?**  
   *Trả lời:* Dữ liệu nằm an toàn và bền vững trên hệ quản trị cơ sở dữ liệu **Supabase PostgreSQL** trên đám mây, không nằm ở RAM máy học hay LocalStorage. Tắt máy phát triển thì dữ liệu vẫn còn nguyên.

2. **Vì sao backend không nhận `user_id` từ form để xác định chủ sở hữu?**  
   *Trả lời:* Người dùng có thể chỉnh sửa payload gửi lên qua DevTools/Postman để giả mạo `user_id` của người khác. Backend chỉ trích xuất và xác thực `user.id` từ Bearer Token JWT do Supabase Auth ký thông qua `authRequest()`.

3. **RLS khác ẩn nút Sửa như thế nào?**  
   *Trả lời:* Ẩn nút Sửa chỉ là che giấu trên tầng giao diện (UI protection). Kẻ tấn công vẫn có thể tự gửi HTTP request trực tiếp tới API hoặc database. **RLS** là tầng phòng thủ sâu tại nhân cơ sở dữ liệu PostgreSQL (`USING auth.uid() = user_id`), chặn đứng hành vi truy xuất trái phép dù kẻ tấn công biết chính xác ID dữ liệu.

4. **Vì sao `getSession` phía trình duyệt chưa đủ để API tin người dùng?**  
   *Trả lời:* `getSession` ở client chỉ đọc dữ liệu lưu tạm ở trình duyệt (có thể bị giả mạo hoặc hết hạn). API phía server phải gọi `getUser(token)` gửi tới Supabase Auth server để xác thực chữ ký số mật mã của JWT.

5. **Vì sao `npm run build` thành công chưa chứng minh phân quyền đúng?**  
   *Trả lời:* `build` chỉ kiểm tra cú pháp, đóng gói tài nguyên tĩnh và kiểm tra kiểu TypeScript hợp lệ tại thời điểm compile time. Phân quyền là logic nghiệp vụ động tại runtime (liên quan đến JWT, SQL Policies, RLS).

6. **Sau khi đổi biến môi trường trên Vercel cần làm gì?**  
   *Trả lời:* Cần tiến hành **Redeploy** lại bản build mới nhất (Project → Deployments → Redeploy), vì các biến môi trường có tiền tố `NEXT_PUBLIC_` được Next.js nhúng trực tiếp vào bundle mã nguồn tĩnh ở thời điểm build.