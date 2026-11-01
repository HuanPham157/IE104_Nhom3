# GHI CHÚ THIẾT KẾ VÀ HỆ THỐNG GIAO DIỆN (DESIGN SYSTEM NOTES)
**Dự án:** OralEval IE104 - Hệ thống Khảo thí Thông minh (AI-Powered Oral Exam & Task Management)  
**Tài nguyên đối chiếu:** `login.html`, `tasks.html`, `login-redesign-reference.png`, `teacher-dashboard-reference.png`, `dashboard-teacher.png`, `class-teacher.png`, `dashboard-student.png`, `task-student.png`, `tasks-student-reference.png`, `tasks-oral-reference.png`, `login-desktop.png`, `tasks-desktop.png`, `tasks-mobile.png`
**Ngày lập tài liệu:** 04/10/2026

---

## 1. HỆ THỐNG BẢNG MÀU (COLOR PALETTE & TOKENS)

Thiết kế dựa trên nền tảng Material 3 kết hợp thẩm mỹ Công nghệ Cao (High-Tech Deep Indigo / Violet):

| Tên Token / Class | Mã màu Hex | Ngữ cảnh sử dụng |
| :--- | :--- | :--- |
| `primary` | `#2a14b4` | Màu thương hiệu chính, nút CTA chính, viền active |
| `primary-container` | `#4338ca` | Nút hành động nổi bật (Publish, Add), badge icon nền |
| `primary-fixed` | `#e3dfff` | Nền chip icon, badge làm nổi bật |
| `primary-fixed-dim` | `#c3c0ff` | Màu chữ phụ trên nền tối (Left column login) |
| `secondary` | `#006c49` | Màu xanh lá biểu thị trạng thái tích cực, sẵn sàng |
| `secondary-container`| `#6cf8bb` | Accent xanh neon, điểm số đạt, waveform audio |
| `background` / `surface`| `#f9f9ff` | Nền sáng tổng thể của toàn bộ ứng dụng |
| `surface-container-lowest` | `#ffffff` | Nền thẻ Card chính, ô input form, thanh Navbar trắng |
| `surface-container-low` | `#f0f3ff` | Nền tab switcher, khung phụ, input focus/hover |
| `surface-container-high`| `#dee8ff` | Nền pill đếm, badge điểm số, thanh tiến trình |
| `surface-container-highest` | `#d8e3fb` | Phân cách nền, thanh trượt slider |
| `on-surface` | `#111c2d` | Màu chữ chính (Dark text, độ tương phản cao) |
| `on-surface-variant` | `#464554` | Màu chữ phụ, mô tả hướng dẫn, nhãn nhạt |
| `outline` | `#777586` | Viền placeholder, icon phụ |
| `outline-variant` | `#c7c4d7` | Đường kẻ phân cách border, viền card, viền input |
| `error` | `#ba1a1a` | Màu cảnh báo, nút xóa, trường bắt buộc `*` |
| `error-container` | `#ffdad6` | Nền cảnh báo lỗi, badge cảnh báo |

> **Bảng màu Gradient & Dark Accent (Cột thương hiệu Login):**
> * Dải Gradient: `from-[#1E1B4B] via-[#241E66] to-[#312E81]`
> * Hào quang Neon (Blur): `#6029c9` (30% opacity) và `#4338ca` (40% opacity)

---

## 2. TYPOGRAPHY (FONT CHỮ & QUY TẮC PHÔNG)

Hệ thống sử dụng bộ 3 phông chữ Google Fonts chính thức:
* **Display / Headline Font:** `Plus Jakarta Sans` (Font sans-serif hình học hiện đại dùng cho logo, tiêu đề lớn, tên trang và tên thẻ).
* **Body / Label Font:** `Inter` (Tối ưu khả năng đọc cho văn bản dài, nhãn form, nút bấm, thông báo).
* **Code / Monospace Font:** `JetBrains Mono` (Dành cho bộ đếm thời gian `02:47.38`, thông số âm thanh, điểm số `/10`, mã môn học).
* **Biểu tượng (Iconography):** `Google Material Symbols Outlined` (Kích thước chuẩn: `16px`, `20px`, `24px`).

### Phân cấp cỡ chữ chuẩn (Font Sizes & Line Heights)
* `display-lg`: `40px` (Line height: `48px`, font-weight: `700`)
* `headline-lg`: `32px` (Line height: `40px`, font-weight: `600`)
* `headline-md`: `24px` (Line height: `32px`, font-weight: `600`)
* `headline-sm`: `18px` (Line height: `26px`, font-weight: `600`)
* `body-lg`: `16px` (Line height: `26px`, font-weight: `400`)
* `body-md`: `14px` (Line height: `22px`, font-weight: `400`)
* `body-sm`: `12px` (Line height: `18px`, font-weight: `400`)
* `code-sm`: `12px` (Line height: `16px`, font-weight: `500`)
* `code-xs`: `10px` (Line height: `14px`, font-weight: `500`)

---

## 3. BO GÓC & BỐ CỤC KHÔNG GIAN (SPACING & RADIUS)

* **Bán kính bo góc (Border Radius):**
  * Nút nhỏ / Input / Chip: `rounded-lg` (`8px`)
  * Thẻ Card / Container / Bento box: `rounded-xl` (`12px`) hoặc `rounded-2xl` (`16px`)
  * Segmented Pill / Tag / Nút tròn: `rounded-full` (`9999px`)
* **Khoảng cách & Padding (Spacing):**
  * Padding Card chuẩn: `p-6` (`24px`) trên Desktop; `p-4` (`16px`) trên Mobile.
  * Khoảng cách giữa các phần tử form: `space-y-4` hoặc `space-y-5`.
  * Grid khoảng cách: `gap-6` đến `gap-8`.

---

## 4. CHI TIẾT BỐ CỤC CÁC TRANG & THÀNH PHẦN (COMPONENT SPECIFICATIONS)

### 4.1. Màn hình Đăng nhập (`/login`)
* **Bố cục Desktop:** Thanh điều hướng sáng ở trên cùng; phần nội dung chia hai cột với giới thiệu sản phẩm, minh họa waveform và số liệu ở bên trái, thẻ xác thực ở bên phải.
* **Thẻ đăng nhập:** Có tab đăng nhập/đăng ký, đăng nhập bằng email và mật khẩu, thông báo lỗi, nút hiện/ẩn mật khẩu và nút gửi chính. Vai trò được đọc từ hồ sơ sau xác thực; đăng ký chuyển tới `/signup`.
* **Bố cục Mobile:** Hai cột chuyển thành một cột, form vẫn rộng theo màn hình và các thành phần có thể xuống dòng.
* **Ảnh tham chiếu mới:** `login-redesign-reference.png`. UI dùng email vì Supabase Auth hiện xác thực bằng email và mật khẩu.
* Đăng ký công khai chỉ tạo tài khoản sinh viên. Role giảng viên phải được quản trị viên cấp trong `profiles`.

### 4.2. Bảng điều khiển giảng viên (`/teacher`)
* Bố cục theo `dashboard-teacher.png`: sidebar, topbar, thẻ chỉ số, khu vực bài thi chờ chấm, lớp phụ trách, trạng thái AI, phúc khảo, ký số và trình phát bản ghi.
* Hồ sơ và role giảng viên lấy từ Supabase; các số liệu, lớp học, bài thi, model AI và trạng thái HSM trong dashboard là dữ liệu minh họa, được gắn nhãn `DỮ LIỆU DASHBOARD MINH HỌA`.
* Các thao tác chưa kết nối dữ liệu hiển thị thông báo xem trước thay vì giả lập hoàn thành. Đăng xuất vẫn hoạt động.
* **Ảnh tham chiếu:** `dashboard-teacher.png`; `teacher-dashboard-reference.png` là ảnh tham chiếu cũ.

### 4.3. Quản lý lớp học giảng viên (`/teacher/classes`)
* Bố cục theo `class-teacher.png`: thống kê, tabs lớp giảng dạy/cố vấn, tìm kiếm, lọc và sắp xếp, thẻ lớp học phần và hồ sơ lớp cố vấn.
* Tên giảng viên/khoa lấy từ hồ sơ Supabase; toàn bộ số liệu lớp, sĩ số, điểm, rubric, cảnh báo và tiến độ là dữ liệu demo có nhãn riêng. Hành động chưa tích hợp mở thông báo xem trước.
* **Ảnh tham chiếu:** `class-teacher.png`.

### 4.4. Dashboard sinh viên (`/student`)
* Bố cục theo `dashboard-student.png`: điểm và tiến độ, bài Oral sắp đến hạn, lớp đã ghi danh, kết quả gần nhất, kiểm tra âm thanh, bảng xếp hạng và lịch vấn đáp.
* Hồ sơ tên/MSSV lấy từ Supabase; các điểm số, bài thi, lớp học, bảng xếp hạng và lịch đều là dữ liệu demo. `/tasks` vẫn là khu vực bài Oral và CRUD công việc cá nhân.
* Đăng nhập và đăng ký sinh viên chuyển đến `/student`; mục Bài tập oral chuyển đến `/tasks`.
* **Ảnh tham chiếu:** `dashboard-student.png`.

### 4.5. Màn hình Công việc Sinh viên (`/tasks`)
* **Bố cục:** Mô phỏng trang quản lý bài thi Oral trong `task-student.png`: sidebar, topbar, breadcrumb, bốn thẻ thống kê, bộ lọc theo trạng thái/môn, danh sách bài thi và panel âm học, tips, lịch thi.
* **Dữ liệu demo:** Các bài thi, deadline, rubric, trạng thái AI, điểm và lịch thi trên đầu trang là dữ liệu tĩnh minh họa, có nhãn `DỮ LIỆU DEMO`; các thao tác mở nội dung chỉ mở thông báo xem trước và không giả vờ lưu kết quả.
* **Dữ liệu thật:** Khu vực `Công việc cá nhân` bên dưới tiếp tục hỗ trợ thêm, đánh dấu hoàn thành, sửa và xóa task được lưu trong `public.tasks`.
* **Ảnh tham chiếu:** `task-student.png`. Ảnh `tasks-oral-reference.png` là một tham chiếu cũ hơn.

---

## 5. YÊU CẦU ĐÁP ỨNG DI ĐỘNG (MOBILE RESPONSIVE AT 390PX)

Đối chiếu theo ảnh `task-student.png`:
1. Sidebar chỉ hiển thị từ breakpoint `md`; nội dung chính và panel chuyển thành một cột ở màn hình nhỏ.
2. Tìm kiếm và bộ lọc tác động lên các card demo; card demo và số liệu demo được nhận diện rõ bằng nhãn xem trước.
3. CRUD công việc cá nhân gọi API hiện có, tách biệt khỏi nội dung demo.