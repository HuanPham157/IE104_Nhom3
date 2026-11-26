# Kế hoạch Kiểm thử — Dự án AI ORAL (AIOralCheck / `viec-hoc`)

**Môn học:** Internet và Công nghệ Web (IE104) | **Ngày thực hiện:** 26/11/2026 | **Nhóm:** R11

---

## 1. Phạm vi kiểm thử (3 chức năng trọng tâm)
Dựa trên mức độ quan trọng trong luồng nghiệp vụ chính của dự án, nhóm chọn 3 chức năng cốt lõi để thiết kế và lập trình kiểm thử:
1. **Đăng nhập, Xác thực & Phân quyền (Auth / RBAC):** Đảm bảo người dùng chỉ truy cập đúng phân hệ (`student`, `lecturer`/`teacher`, `admin`) và chặn request thiếu/sai quyền.
2. **Mở lớp học phần của Giảng viên (`POST /api/classes`):** Thực thi quy tắc mở lớp hợp lệ (R1), chặn trùng tên lớp đang hoạt động/chờ duyệt (R2), và giới hạn tối đa 3 lớp chờ duyệt cùng lúc (R3).
3. **Tham gia lớp của Sinh viên & Duyệt điểm bài làm (`POST /api/classes/join`, `POST /api/submissions/[id]/review`):** Kiểm tra mã lớp 6–10 ký tự, chặn tham gia trùng, chặn lớp chưa duyệt và kiểm tra ràng buộc nhập nhận xét khi sửa điểm AI.

---

## 2. Đánh giá rủi ro (Rủi ro = Tần suất × Thiệt hại)

| Chức năng | Tần suất (1–3) | Thiệt hại (1–3) | Điểm rủi ro | Mức ưu tiên & Mức test chọn |
| :--- | :---: | :---: | :---: | :--- |
| **1. Đăng nhập & Phân quyền RBAC** | 3 | 3 | **9** | **Rất cao:** Unit + Integration + E2E (rò rỉ quyền truy cập gây sai lệch dữ liệu toàn lớp). |
| **2. Tham gia lớp & Duyệt/Sửa điểm** | 3 | 3 | **9** | **Rất cao:** Unit + Integration + E2E (sai mã lớp, trùng thành viên hoặc sửa điểm không minh bạch). |
| **3. Mở lớp học phần (R1–R3)** | 2 | 3 | **6** | **Cao:** Unit + Integration + E2E (trùng tên lớp hoặc vượt giới hạn chờ duyệt gây nghẽn Admin). |

---

## 3. Chiến lược kiểm thử theo mô hình Kim tự tháp
- **Unit Test (`tests/unit/` — 7 ca):** Kiểm thử các hàm thuần, Zod schema và quy tắc nghiệp vụ trong `src/lib/oralcheck-validators.ts` và `getProfileRole` (không kết nối DB, không gọi mạng; dùng dữ liệu biên và bảng quyết định).
- **Integration Test (`tests/integration/` — 5 ca):** Gọi trực tiếp Next.js API Route Handlers (`POST /api/classes`, `POST /api/classes/join`, `POST /api/submissions/[id]/review`) kết nối tới **In-Memory Test DB adapter** tách biệt hoàn toàn với Supabase Dev DB; reset dữ liệu ở `beforeEach` và assert cả mã HTTP, JSON body lẫn số dòng DB trước/sau.
- **E2E Test (`tests/e2e/` — 2 kịch bản đa bước):** Dùng Playwright mở trình duyệt Chromium thật, mô phỏng thao tác người dùng đăng nhập → mở lớp R1–R3 → sinh viên tham gia lớp R1–R3.

---

## 4. Ngoài phạm vi (Out of Scope)
- **Kiểm thử tải hiệu năng lớn (k6 / JMeter) và gọi API STT/LLM thật:** Không đưa vào bộ test tự động 90 phút để tránh tiêu tốn quota API bên ngoài và giữ thời gian chạy dưới 30 giây.
- **Các tác vụ ghi âm/chấm AI thủ công trực tiếp trên production Supabase:** Được kiểm thử độc lập ở các đợt UAT riêng, không chạy trên DB dev.

---

## 5. Môi trường kiểm thử & Lệnh chạy
- **Công cụ:** Node.js `v24.15.0`, **Vitest** (`^3.2.4`) cho Unit & Integration, **Playwright** (`^1.64.1`, Chromium) cho E2E.
- **Cơ sở dữ liệu kiểm thử:** In-Memory Test Database Adapter độc lập trong `tests/integration/class-and-review-api.test.ts` + mock route handler cô lập trong E2E (tuyệt đối không ghi rác vào Supabase Dev DB).
- **Chạy toàn bộ 3 mức bằng 1 lệnh duy nhất:**
  ```bash
  npm test
  ```
  *(Tương đương: `npm run test:unit && npm run test:integration && npm run test:e2e`)*
