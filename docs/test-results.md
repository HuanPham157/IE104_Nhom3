# Báo cáo Kiểm thử Bài thực hành 2: Hoàn thiện và Triển khai Website
**Dự án:** Việc học của tôi (`viec-hoc`)  
**Môn học:** IE104 - Thiết kế và Lập trình Web  
**Ngày kiểm thử:** 15/10/2026  
**Môi trường:** Localhost & Vercel Production  

---

## Bảng ma trận kiểm thử chức năng & phân quyền (T01 – T12)

| Mã | Thử điều gì | Thao tác thực hiện | Kết quả mong đợi | Trạng thái |
|:---|:---|:---|:---|:---|
| **T01** | Mở `/tasks` khi chưa đăng nhập | Truy cập thẳng `http://localhost:3000/tasks` | Không hiển thị việc; tự động redirect về `/login` | **ĐẠT (Pass)** |
| **T02** | Đăng nhập sai rồi đúng | 1. Nhập sai pass -> báo lỗi đỏ.<br>2. Nhập đúng pass -> vào trang | Báo lỗi tiếng Việt; đăng nhập đúng chuyển tới `/tasks` | **ĐẠT (Pass)** |
| **T03** | CRUD và reload | Thêm việc mới, tick hoàn thành, bấm F5 reload | Dữ liệu giữ nguyên vẹn từ Supabase | **ĐẠT (Pass)** |
| **T04** | Tên rỗng, chỉ dấu cách, dài >120 ký tự | Gửi ô nhập rỗng hoặc chuỗi 121 ký tự | Báo lỗi sát ô nhập; API trả mã 400 Bad Request | **ĐẠT (Pass)** |
| **T05** | Xóa rồi Hủy (Cancel) | Bấm Xóa, tại popup chọn Cancel | Không xóa, công việc vẫn còn nguyên | **ĐẠT (Pass)** |
| **T06** | Responsive 390px & Phím Tab | Bật DevTools 390px, dùng phím Tab duyệt qua các nút | Không vỡ layout, không tràn ngang, thấy rõ vị trí focus | **ĐẠT (Pass)** |
| **T07** | Mất mạng và thêm việc | Tắt mạng rồi bấm Thêm công việc | Báo lỗi mạng sát ô nhập, không báo lưu giả | **ĐẠT (Pass)** |
| **T08** | API thiếu token hoặc sai token | Gửi request `GET /api/tasks` không kèm header Auth | Trả về mã HTTP 401 Unauthorized | **ĐẠT (Pass)** |
| **T09** | Tài khoản A tạo việc, Tài khoản B đọc | A tạo việc; B đăng nhập ở tab ẩn danh | B hoàn toàn không nhìn thấy bất kỳ việc nào của A | **ĐẠT (Pass)** |
| **T10** | Tài khoản B sửa/xóa ID của A qua API | B lấy token của mình gửi PATCH/DELETE tới task ID của A | API trả mã HTTP 404 Not Found, việc của A không đổi | **ĐẠT (Pass)** |
| **T11** | B insert `user_id = A` trực tiếp vào Supabase | Dùng client chèn dòng mới với `user_id` giả mạo tài khoản A | Bị RLS `insert own tasks` ở PostgreSQL chặn đứng | **ĐẠT (Pass)** |
| **T12** | Đăng xuất rồi bấm Back/Reload | Bấm Đăng xuất, sau đó bấm nút Back của trình duyệt | Session bị hủy, không hiện lại dữ liệu cũ, về `/login` | **ĐẠT (Pass)** |