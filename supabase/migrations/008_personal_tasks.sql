-- 008: Hoàn thiện "Việc cá nhân" của sinh viên (bảng public.tasks từ migration 000).
--   - Ghi chú, hạn chót, mức ưu tiên, thời điểm hoàn thành, thời điểm cập nhật.
--   - Giữ nguyên RLS và quyền của migration 000: mỗi sinh viên chỉ đọc/sửa việc của chính mình.
-- Chạy SAU migration 007. Chạy lại nhiều lần vẫn an toàn.

begin;

alter table public.tasks
  add column if not exists notes text,
  add column if not exists due_date date,
  add column if not exists priority text not null default 'normal',
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tasks drop constraint if exists tasks_notes_length;
alter table public.tasks add constraint tasks_notes_length check (notes is null or char_length(notes) <= 1000);
alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks add constraint tasks_priority_check check (priority in ('low', 'normal', 'high'));

-- Việc đã xong từ trước khi có cột completed_at: lấy tạm thời điểm tạo.
update public.tasks set completed_at = created_at where is_done and completed_at is null;

-- Tự ghi thời điểm hoàn thành / cập nhật để client không tự đặt được.
create or replace function public.touch_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.is_done and (tg_op = 'INSERT' or not old.is_done) then
    new.completed_at := now();
  elsif not new.is_done then
    new.completed_at := null;
  end if;
  return new;
end
$$;

drop trigger if exists touch_task on public.tasks;
create trigger touch_task
  before insert or update on public.tasks
  for each row execute function public.touch_task();

-- Lọc "sắp đến hạn" theo người dùng.
create index if not exists tasks_owner_due_idx on public.tasks (user_id, is_done, due_date);

commit;
