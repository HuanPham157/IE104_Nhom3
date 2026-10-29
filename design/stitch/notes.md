# GHI CHÚ THIẾT KẾ VÀ HỆ THỐNG GIAO DIỆN (DESIGN SYSTEM NOTES)
**Dự án:** OralEval IE104 - Hệ thống Khảo thí Thông minh (AI-Powered Oral Exam & Task Management)  
**Tài nguyên đối chiếu:** `login.html`, `tasks.html`, `login-desktop.jpg`, `tasks-desktop.jpg`, `tasks-mobile.jpg`  
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
* **Bố cục Desktop:** Chia 2 cột tỷ lệ `50% - 50%` (`min-h-screen flex flex-col lg:flex-row`).
  * *Cột trái (Thương hiệu & Storytelling):* Nền gradient tím tối (#1E1B4B đến #312E81), chứa Logo OralEval IE104, Institutional Badge của UIT, bộ trực quan hóa sóng âm giọng nói (Waveform visualizer) và 3 khối Bento cam kết chuẩn Barem Khoa.
  * *Cột phải (Khung đăng nhập):* Nền trắng tinh (`#ffffff`), căn giữa form. Chứa Bộ chuyển vai trò (Segmented Tab: Sinh viên / Giảng viên / Quản trị viên), ô Email trường, ô Password có icon ẩn/hiện mắt, nút Đăng nhập chính và nút SSO Office 365.
* **Bố cục Mobile (< 768px):** Cột trái tự động co lại hoặc xếp chồng lên trên form đăng nhập; ưu tiên hiển thị form nhập liệu rõ ràng.

### 4.2. Màn hình Quản trị Công việc / Thiết lập Đề thi (`/tasks`)
* **Bố cục Desktop:**
  * *Top Navigation Bar (Sticky top h-16):* Logo OralEval IE104, menu Cohorts/Assessments/Analytics/Rubrics, thanh tìm kiếm nhanh, nút thông báo, trợ giúp và Avatar giảng viên.
  * *Sidebar dọc (w-64 bên trái):* Ẩn trên tablet/mobile, hiển thị trên `lg:flex`. Nút `+ New Assessment`, các menu điều hướng với tab `Question Builder` ở trạng thái Active.
  * *Workspace chính (2 Cột Bento tỷ lệ 8/4):*
    * Cột trái (8 Cols): Phần 1 - Thông tin chung (Tên bài tập, Deadline, Max retakes); Phần 2 - Danh sách thẻ câu hỏi (Thẻ đang mở chi tiết: ô textarea đề bài, nút chọn thời lượng 60s/90s/120s, trọng số điểm, các chip từ khóa Speech Entity Extraction, slider mức độ khắt khe AI, textarea rubric chi tiết). Thẻ câu hỏi thu gọn (dạng summary). Nút nét đứt `+ Thêm câu hỏi mới`.
    * Cột phải (4 Cols): Card phân bổ trọng số điểm (Progress bar), Card mẫu Barem chuẩn gợi ý của Khoa CNTT, Card quy định chấm điểm tự động.

---

## 5. YÊU CẦU ĐÁP ỨNG DI ĐỘNG (MOBILE RESPONSIVE AT 390PX)

Đối chiếu theo ảnh `tasks-mobile.jpg` và các tiêu chuẩn kiểm thử B1-05:
1. **Thanh điều hướng & Sidebar:** Sidebar 64px bên trái tự động ẩn hoàn toàn trên màn hình `390px`. Top Navbar co gọn, ẩn các liên kết chữ, chỉ giữ lại logo, icon tìm kiếm và avatar.
2. **Ngăn tràn ngang (No Horizontal Scroll):** Toàn bộ container sử dụng `w-full max-w-full overflow-x-hidden`. Các bảng 2 cột chuyển thành `flex-col` hoặc `grid-cols-1`.
3. **Cụm Bento 8/4:** Chuyển từ `xl:grid-cols-12` thành xếp chồng 1 cột duy nhất: Thông tin bài tập $\rightarrow$ Danh sách câu hỏi $\rightarrow$ Khối phân bổ điểm $\rightarrow$ Thư viện barem gợi ý.
4. **Các nút chọn nhanh thời gian & Chip từ khóa:** Bật chế độ `flex-wrap gap-2` để các nút `60 giây`, `90 giây`, `120 giây` và các chip tự động xuống hàng mượt mà, không làm vỡ viền card ở chiều rộng `390px`.
5. **Vùng chạm cảm ứng (Touch Target):** Chiều cao tối thiểu các nút bấm và ô input trên mobile đạt ít nhất `40px` - `44px` để thuận tiện thao tác chạm.