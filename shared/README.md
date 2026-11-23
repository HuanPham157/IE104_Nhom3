# shared/

Mã TypeScript thuần (không phụ thuộc thư viện) dùng chung cho `frontend/` và `backend/`:
đọc đề/barem (`exam-text`), phân tích transcript (`answer-analysis`), kiểu dữ liệu việc cá nhân và bài tập của sinh viên.

- Frontend import qua alias `@shared/*` (khai báo trong `frontend/tsconfig.json`).
- Backend import bằng đường dẫn tương đối (`../../../../shared/...`).
- Không thêm `import` thư viện ngoài vào đây: thư mục này không có `node_modules` riêng.
