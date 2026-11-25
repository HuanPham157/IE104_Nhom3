-- =====================================================================
-- 11_tasks.sql — VIỆC CÁ NHÂN
--
-- Trigger tự ghi completed_at / updated_at cho public.tasks (bảng và RLS ở 01_tables.sql, 04_policies.sql).
-- =====================================================================

begin;

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

commit;
