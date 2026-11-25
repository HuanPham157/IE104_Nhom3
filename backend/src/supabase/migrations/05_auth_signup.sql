-- =====================================================================
-- 05_auth_signup.sql — TẠO HỒ SƠ KHI ĐĂNG KÝ
--
-- Trigger trên auth.users: tạo public.users + student_profiles / lecturer_profiles từ metadata đăng ký.
-- Vai trò lấy từ app_metadata (do admin đặt); người tự đăng ký luôn là sinh viên.
-- =====================================================================

begin;

create or replace function public.create_app_profile_after_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_code text := nullif(btrim(new.raw_user_meta_data ->> 'institutional_id'), '');
  v_full_name text := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  v_department text := nullif(btrim(new.raw_user_meta_data ->> 'faculty'), '');
  v_app_role text := coalesce(new.raw_app_meta_data ->> 'role', 'student');
  v_profile_role text;
begin
  if v_student_code is null and v_full_name is null and v_department is null then
    return new;
  end if;

  if v_app_role not in ('student', 'teacher') then
    return new;
  end if;

  if coalesce(char_length(v_student_code), 0) not between 1 and 30
    or coalesce(char_length(v_full_name), 0) not between 1 and 120
    or coalesce(char_length(v_department), 0) not between 1 and 200 then
    raise exception 'Invalid signup profile';
  end if;

  v_profile_role := case when v_app_role = 'teacher' then 'lecturer' else 'student' end;

  insert into public.users (id, full_name, role, account_status)
  values (new.id, v_full_name, v_profile_role, 'active')
  on conflict (id) do nothing;

  if v_profile_role = 'student' then
    insert into public.student_profiles (user_id, student_code, department)
    values (new.id, v_student_code, v_department)
    on conflict (user_id) do nothing;
  else
    insert into public.lecturer_profiles (user_id, lecturer_code, department)
    values (new.id, v_student_code, v_department)
    on conflict (user_id) do nothing;
  end if;

  return new;
end
$$;

revoke all on function public.create_app_profile_after_signup() from public, anon, authenticated;

drop trigger if exists on_oralcheck_app_profile_signup on auth.users;
create trigger on_oralcheck_app_profile_signup
  after insert on auth.users
  for each row execute function public.create_app_profile_after_signup();

commit;
