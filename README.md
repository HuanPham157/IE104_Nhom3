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
2. Sao chép toàn bộ nội dung từ tệp [`supabase/schema.sql`](file:///d:/HocTap/Nam%203/HK1/IE104/viec-hoc/supabase/schema.sql) trong dự án và bấm **Run**.
3. Tạo một query mới, sao chép nội dung [`supabase/signup.sql`](./supabase/signup.sql) và bấm **Run**. Nếu bảng `tasks` đã được tạo trước đó thì chỉ cần chạy bước này.
4. Kết quả: Bảng `public.tasks` được bảo vệ bằng RLS; bảng `public.profiles` lưu vai trò, mã số trường, họ tên và khoa. Trigger tự tạo hồ sơ khi đăng ký, còn RLS chỉ cho phép người dùng đọc hồ sơ của chính mình.

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