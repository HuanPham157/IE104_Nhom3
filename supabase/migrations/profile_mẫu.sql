-- Tạo hồ sơ ứng dụng cho user A
insert into public.users (id, full_name, role, account_status)
values ('UUID_USER_A', 'Sinh viên A', 'student', 'active')
on conflict (id) do update
  set full_name = excluded.full_name,
      role = 'student',
      account_status = 'active';

insert into public.student_profiles (user_id, student_code, department)
values ('UUID_USER_A', 'MSSV_A', 'Tên khoa')
on conflict (user_id) do update
  set student_code = excluded.student_code,
      department = excluded.department;

insert into public.profiles (id, role, institutional_id, full_name, faculty)
values ('UUID_USER_A', 'student', 'MSSV_A', 'Sinh viên A', 'Tên khoa')
on conflict (id) do update
  set role = excluded.role,
      institutional_id = excluded.institutional_id,
      full_name = excluded.full_name,
      faculty = excluded.faculty;

-- Tạo hồ sơ ứng dụng cho user B
insert into public.users (id, full_name, role, account_status)
values ('UUID_USER_B', 'Sinh viên B', 'student', 'active')
on conflict (id) do update
  set full_name = excluded.full_name,
      role = 'student',
      account_status = 'active';

insert into public.student_profiles (user_id, student_code, department)
values ('UUID_USER_B', 'MSSV_B', 'Tên khoa')
on conflict (user_id) do update
  set student_code = excluded.student_code,
      department = excluded.department;

insert into public.profiles (id, role, institutional_id, full_name, faculty)
values ('UUID_USER_B', 'student', 'MSSV_B', 'Sinh viên B', 'Tên khoa')
on conflict (id) do update
  set role = excluded.role,
      institutional_id = excluded.institutional_id,
      full_name = excluded.full_name,
      faculty = excluded.faculty;