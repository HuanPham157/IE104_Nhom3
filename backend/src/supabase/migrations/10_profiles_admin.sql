-- =====================================================================
-- 10_profiles_admin.sql — HỒ SƠ GIẢNG VIÊN VÀ QUẢN TRỊ TÀI KHOẢN
--
-- Giảng viên gửi yêu cầu cập nhật học hàm / học vị; admin duyệt hoặc từ chối (kèm lý do + thông báo),
-- chỉnh học hàm trực tiếp, khóa / mở khóa / kích hoạt tài khoản.
-- =====================================================================

begin;

create or replace function public.request_academic_info_update(
  p_academic_title text,
  p_academic_degree text,
  p_major text,
  p_institution text,
  p_graduation_year text,
  p_decision_number text
)
returns public.approval_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.approval_requests;
begin
  if public.current_app_role() is distinct from 'lecturer' then
    raise exception 'Lecturer role required';
  end if;
  if nullif(btrim(p_academic_title), '') is null
    or char_length(btrim(p_academic_title)) > 40
    or char_length(coalesce(p_academic_degree, '')) > 80
    or nullif(btrim(p_major), '') is null or char_length(p_major) > 160
    or nullif(btrim(p_institution), '') is null or char_length(p_institution) > 200
    or coalesce(p_graduation_year, '') !~ '^(19|20)[0-9]{2}$'
    or nullif(btrim(p_decision_number), '') is null or char_length(p_decision_number) > 80 then
    raise exception 'Invalid academic info';
  end if;
  if exists (
    select 1 from public.approval_requests
    where requester_id = (select auth.uid())
      and request_type = 'academic_info_update'
      and status = 'pending'
  ) then
    raise exception 'Academic request already pending';
  end if;

  insert into public.approval_requests (requester_id, request_type, target_id, request_data)
  values (
    (select auth.uid()), 'academic_info_update', (select auth.uid()),
    jsonb_build_object(
      'academic_title', btrim(p_academic_title),
      'academic_degree', nullif(btrim(p_academic_degree), ''),
      'major', btrim(p_major),
      'institution', btrim(p_institution),
      'graduation_year', btrim(p_graduation_year),
      'decision_number', btrim(p_decision_number)
    )
  )
  returning * into v_request;

  return v_request;
end
$$;

revoke all on function public.request_academic_info_update(text, text, text, text, text, text) from public, anon;
grant execute on function public.request_academic_info_update(text, text, text, text, text, text) to authenticated;

create or replace function public.review_academic_request(
  p_request_id uuid,
  p_decision text,
  p_reject_reason text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.approval_requests;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Admin role required';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid approval decision';
  end if;
  if p_decision = 'rejected' and nullif(btrim(p_reject_reason), '') is null then
    raise exception 'A rejection reason is required';
  end if;
  if char_length(coalesce(p_reject_reason, '')) > 1000 then
    raise exception 'Rejection reason is too long';
  end if;

  select * into v_request
  from public.approval_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pending' or v_request.request_type <> 'academic_info_update' then
    raise exception 'Pending academic request not found';
  end if;

  update public.approval_requests
  set status = p_decision,
      reviewed_by = (select auth.uid()),
      reject_reason = case when p_decision = 'rejected' then btrim(p_reject_reason) else null end,
      reviewed_at = now()
  where id = p_request_id
  returning * into v_request;

  if p_decision = 'approved' then
    insert into public.lecturer_profiles (user_id, academic_title, academic_degree)
    values (
      v_request.requester_id,
      v_request.request_data ->> 'academic_title',
      v_request.request_data ->> 'academic_degree'
    )
    on conflict (user_id) do update
    set academic_title = excluded.academic_title,
        academic_degree = coalesce(excluded.academic_degree, public.lecturer_profiles.academic_degree),
        updated_at = now();
  end if;

  insert into public.notifications (user_id, title, message, notification_type, related_entity_type, related_entity_id)
  values (
    v_request.requester_id,
    case when p_decision = 'approved' then 'Học hàm / học vị đã được cập nhật' else 'Yêu cầu cập nhật học hàm / học vị bị từ chối' end,
    case
      when p_decision = 'approved'
        then 'Hồ sơ của bạn đã được cập nhật thành ' || coalesce(v_request.request_data ->> 'academic_title', '') || '.'
      else 'Lý do: ' || btrim(p_reject_reason)
    end,
    'academic_approval',
    'user',
    v_request.requester_id
  );

  return v_request;
end
$$;

revoke all on function public.review_academic_request(uuid, text, text) from public, anon;
grant execute on function public.review_academic_request(uuid, text, text) to authenticated;

create or replace function public.admin_set_academic_title(
  p_user_id uuid,
  p_academic_title text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Admin role required';
  end if;
  if char_length(coalesce(p_academic_title, '')) > 40 then
    raise exception 'Invalid academic title';
  end if;
  if not exists (select 1 from public.users where id = p_user_id and role = 'lecturer') then
    raise exception 'Lecturer not found';
  end if;

  insert into public.lecturer_profiles (user_id, academic_title)
  values (p_user_id, nullif(btrim(p_academic_title), ''))
  on conflict (user_id) do update
  set academic_title = excluded.academic_title, updated_at = now();
end
$$;

revoke all on function public.admin_set_academic_title(uuid, text) from public, anon;
grant execute on function public.admin_set_academic_title(uuid, text) to authenticated;

create or replace function public.admin_set_account_status(
  p_user_id uuid,
  p_status text
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_previous text;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Admin role required';
  end if;
  if p_status is null or p_status not in ('active', 'suspended') then
    raise exception 'Invalid account status';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Cannot change own account status';
  end if;

  select account_status into v_previous from public.users where id = p_user_id for update;
  if not found then
    raise exception 'User not found';
  end if;
  if exists (select 1 from public.users where id = p_user_id and role = 'admin') then
    raise exception 'Cannot change another admin account';
  end if;

  update public.users
  set account_status = p_status, updated_at = now()
  where id = p_user_id
  returning * into v_user;

  if p_status = 'active' and v_previous is distinct from 'active' then
    insert into public.notifications (user_id, title, message, notification_type, related_entity_type, related_entity_id)
    values (
      p_user_id,
      case when v_previous = 'pending' then 'Tài khoản đã được kích hoạt' else 'Tài khoản đã được mở khóa' end,
      'Bạn có thể đăng nhập và sử dụng hệ thống bình thường.',
      'account_status', 'user', p_user_id
    );
  end if;

  return v_user;
end
$$;

revoke all on function public.admin_set_account_status(uuid, text) from public, anon;
grant execute on function public.admin_set_account_status(uuid, text) to authenticated;

commit;
