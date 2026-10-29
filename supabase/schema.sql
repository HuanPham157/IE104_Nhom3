-- 1. Tạo bảng tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Đánh index tối ưu tốc độ truy vấn
create index if not exists tasks_owner_created_idx
  on public.tasks (user_id, created_at desc);

-- 3. Bật Row Level Security (RLS) để cô lập dữ liệu
alter table public.tasks enable row level security;

-- 4. Thu hồi quyền mặc định và cấp quyền CRUD cho người dùng đã đăng nhập (authenticated)
revoke all on public.tasks from anon, authenticated;
grant select, insert, update, delete
  on public.tasks to authenticated;

-- 5. Thiết lập 4 chính sách RLS
-- Chính sách ĐỌC (SELECT): chỉ đọc việc của chính mình
create policy "read own tasks" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Chính sách THÊM (INSERT): chỉ thêm việc gắn với user_id của chính mình
create policy "insert own tasks" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Chính sách SỬA (UPDATE): chỉ sửa việc của mình (kiểm tra cả dòng cũ và mới)
create policy "update own tasks" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Chính sách XÓA (DELETE): chỉ xóa việc của mình
create policy "delete own tasks" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);