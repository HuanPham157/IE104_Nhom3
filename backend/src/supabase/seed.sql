-- =====================================================================
-- seed.sql — DỮ LIỆU MẪU CHO MÔI TRƯỜNG DEV (không chạy trên production)
--
-- Gắn hồ sơ ứng dụng cho tài khoản đã tạo sẵn trong Supabase Auth (Authentication → Users).
-- Thay UUID_*, họ tên, mã số bằng giá trị thật rồi chạy SAU migrations 01 → 11.
-- Không đặt mật khẩu, token hay dữ liệu cá nhân thật vào file này.
-- =====================================================================

begin;

-- Sinh viên mẫu
insert into public.users (id, full_name, role, account_status)
values ('UUID_STUDENT', 'Sinh viên mẫu', 'student', 'active')
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

insert into public.student_profiles (user_id, student_code, department)
values ('UUID_STUDENT', 'MSSV_MAU', 'Tên khoa')
on conflict (user_id) do update
  set student_code = excluded.student_code, department = excluded.department;

-- Giảng viên mẫu
insert into public.users (id, full_name, role, account_status)
values ('UUID_LECTURER', 'Giảng viên mẫu', 'lecturer', 'active')
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

insert into public.lecturer_profiles (user_id, lecturer_code, department, academic_title)
values ('UUID_LECTURER', 'MSGV_MAU', 'Tên khoa', 'Th.S')
on conflict (user_id) do update
  set lecturer_code = excluded.lecturer_code, department = excluded.department, academic_title = excluded.academic_title;

-- Admin mẫu
insert into public.users (id, full_name, role, account_status)
values ('UUID_ADMIN', 'Quản trị viên', 'admin', 'active')
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

commit;
