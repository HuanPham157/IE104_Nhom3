-- =====================================================================
-- 06_classes.sql — LỚP HỌC
--
-- Giảng viên tạo lớp (chờ admin duyệt), sửa thông tin, yêu cầu hủy; admin duyệt/từ chối (kèm lý do + thông báo);
-- sinh viên tham gia bằng mã lớp; giảng viên xóa thành viên; xóa hoặc lưu trữ lớp.
-- =====================================================================

begin;

create or replace function public.create_class_request(
  p_class_name text,
  p_description text,
  p_class_code varchar
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
  v_request_id uuid;
  v_role text := public.current_app_role();
begin
  if v_role is distinct from 'lecturer' and v_role is distinct from 'admin' then
    raise exception 'Lecturer or admin role required';
  end if;

  if p_class_code is null
    or nullif(btrim(p_class_name), '') is null
    or char_length(btrim(p_class_name)) > 160
    or char_length(coalesce(p_description, '')) > 2000
    or p_class_code !~ '^[A-Z0-9]{6,10}$' then
    raise exception 'Invalid class data';
  end if;

  insert into public.classes (
    lecturer_id, class_name, description, class_code, status, approved_at, approved_by
  )
  values (
    (select auth.uid()), btrim(p_class_name), nullif(btrim(p_description), ''),
    p_class_code,
    case when v_role = 'admin' then 'active' else 'pending' end,
    case when v_role = 'admin' then now() else null end,
    case when v_role = 'admin' then (select auth.uid()) else null end
  )
  returning * into v_class;

  if v_role = 'lecturer' then
    insert into public.approval_requests (
      requester_id, request_type, target_id, request_data
    )
    values (
      (select auth.uid()), 'class_creation', v_class.id,
      jsonb_build_object(
        'class_name', v_class.class_name,
        'class_code', v_class.class_code,
        'description', v_class.description
      )
    )
    returning id into v_request_id;
  end if;

  return jsonb_build_object('class', to_jsonb(v_class), 'approval_request_id', v_request_id);
end
$$;

revoke all on function public.create_class_request(text, text, varchar) from public, anon;
grant execute on function public.create_class_request(text, text, varchar) to authenticated;

create or replace function public.remove_class_member(
  p_class_id uuid,
  p_student_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_app_role();
begin
  if v_role is distinct from 'lecturer' and v_role is distinct from 'admin' then
    raise exception 'Lecturer or admin role required';
  end if;

  if not exists (
    select 1 from public.classes c
    where c.id = p_class_id
      and (
        v_role = 'admin'
        or (c.lecturer_id = (select auth.uid()) and c.status = 'active')
      )
  ) then
    raise exception 'Class member not found or forbidden';
  end if;

  update public.class_members
  set status = 'removed', left_at = now()
  where class_id = p_class_id
    and student_id = p_student_id
    and status = 'active';

  if not found then
    raise exception 'Class member not found or forbidden';
  end if;

  return true;
end
$$;

revoke all on function public.remove_class_member(uuid, uuid) from public, anon;
grant execute on function public.remove_class_member(uuid, uuid) to authenticated;

create or replace function public.request_class_cancellation(
  p_class_id uuid,
  p_reason text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
  v_request public.approval_requests;
begin
  if public.current_app_role() is distinct from 'lecturer' then
    raise exception 'Lecturer role required';
  end if;
  if char_length(coalesce(p_reason, '')) > 1000 then
    raise exception 'Cancellation reason is too long';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
    and lecturer_id = (select auth.uid())
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active class owned by lecturer required';
  end if;
  if exists (
    select 1 from public.approval_requests
    where target_id = p_class_id
      and request_type = 'class_cancellation'
      and status = 'pending'
  ) then
    raise exception 'Pending cancellation request already exists';
  end if;

  insert into public.approval_requests (
    requester_id, request_type, target_id, request_data
  )
  values (
    (select auth.uid()),
    'class_cancellation',
    p_class_id,
    jsonb_build_object(
      'class_name', v_class.class_name,
      'class_code', v_class.class_code,
      'reason', nullif(btrim(p_reason), '')
    )
  )
  returning * into v_request;

  return v_request;
end
$$;

revoke all on function public.request_class_cancellation(uuid, text) from public, anon;
grant execute on function public.request_class_cancellation(uuid, text) to authenticated;

create or replace function public.review_class_request(
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

  select * into v_request
  from public.approval_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pending'
    or v_request.request_type not in ('class_creation', 'class_cancellation') then
    raise exception 'Pending class request not found';
  end if;

  if p_decision = 'rejected' and nullif(btrim(p_reject_reason), '') is null then
    raise exception 'A rejection reason is required';
  end if;
  if char_length(coalesce(p_reject_reason, '')) > 1000 then
    raise exception 'Rejection reason is too long';
  end if;

  update public.approval_requests
  set status = p_decision,
      reviewed_by = (select auth.uid()),
      reject_reason = case when p_decision = 'rejected' then btrim(p_reject_reason) else null end,
      reviewed_at = now()
  where id = p_request_id
  returning * into v_request;

  if v_request.request_type = 'class_creation' then
    if p_decision = 'rejected' then
      delete from public.classes
      where id = v_request.target_id
        and lecturer_id = v_request.requester_id;
    else
      update public.classes
      set status = 'active',
          approved_at = now(),
          approved_by = (select auth.uid()),
          updated_at = now()
      where id = v_request.target_id
        and lecturer_id = v_request.requester_id;
    end if;
  else
    update public.classes
    set status = case when p_decision = 'approved' then 'archived' else 'active' end,
        updated_at = now()
    where id = v_request.target_id
      and lecturer_id = v_request.requester_id;
  end if;

  insert into public.notifications (user_id, title, message, notification_type, related_entity_type, related_entity_id)
  select v_request.requester_id,
         case
           when v_request.request_type = 'class_creation' and p_decision = 'approved' then 'Lớp học đã được duyệt'
           when v_request.request_type = 'class_creation' then 'Yêu cầu tạo lớp bị từ chối'
           when p_decision = 'approved' then 'Lớp học đã được hủy'
           else 'Yêu cầu hủy lớp bị từ chối'
         end,
         case
           when v_request.request_type = 'class_creation' and p_decision = 'approved'
             then 'Lớp học của bạn đã được duyệt và có thể hoạt động.'
           when v_request.request_type = 'class_creation'
             then 'Yêu cầu tạo lớp bị từ chối: ' || btrim(p_reject_reason)
           when p_decision = 'approved'
             then 'Yêu cầu hủy lớp đã được duyệt. Lớp đã được lưu trữ.'
           else 'Yêu cầu hủy lớp bị từ chối: ' || btrim(p_reject_reason)
         end,
         'class_approval',
         'class',
         v_request.target_id;

  return v_request;
end
$$;

revoke all on function public.review_class_request(uuid, text, text) from public, anon;
grant execute on function public.review_class_request(uuid, text, text) to authenticated;

create or replace function public.delete_or_archive_class(p_class_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Admin role required';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
  for update;

  if not found then
    raise exception 'Class not found';
  end if;

  if exists (select 1 from public.class_members where class_id = p_class_id)
    or exists (select 1 from public.assignments where class_id = p_class_id) then
    update public.classes
    set status = 'archived', updated_at = now()
    where id = p_class_id;

    update public.approval_requests
    set status = 'rejected',
        reviewed_by = (select auth.uid()),
        reject_reason = 'Lớp đã được quản trị viên lưu trữ.',
        reviewed_at = now()
    where target_id = p_class_id
      and request_type = 'class_creation'
      and status = 'pending';

    update public.approval_requests
    set status = 'approved',
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where target_id = p_class_id
      and request_type = 'class_cancellation'
      and status = 'pending';

    return true;
  end if;

  update public.approval_requests
  set status = 'rejected',
      reviewed_by = (select auth.uid()),
      reject_reason = 'Lớp đã bị xóa bởi quản trị viên.',
      reviewed_at = now()
  where target_id = p_class_id
    and request_type = 'class_creation'
    and status = 'pending';

  update public.approval_requests
  set status = 'approved',
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where target_id = p_class_id
    and request_type = 'class_cancellation'
    and status = 'pending';

  delete from public.classes where id = p_class_id;
  return false;
end
$$;

revoke all on function public.delete_or_archive_class(uuid) from public, anon;
grant execute on function public.delete_or_archive_class(uuid) to authenticated;

create or replace function public.join_class_by_code(p_class_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
begin
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Student role required';
  end if;

  select id into v_class_id
  from public.classes
  where class_code = upper(btrim(p_class_code))
    and status = 'active';

  if v_class_id is null then
    raise exception 'Active class code not found';
  end if;

  insert into public.class_members as existing_member (
    class_id, student_id, status, joined_at, left_at
  )
  values (v_class_id, (select auth.uid()), 'active', now(), null)
  on conflict (class_id, student_id) do update
    set status = 'active', joined_at = now(), left_at = null
    where existing_member.status <> 'active'
  returning class_id into v_class_id;

  if not found then
    raise exception 'Student already joined this class';
  end if;

  return v_class_id;
end
$$;

revoke all on function public.join_class_by_code(text) from public, anon;
grant execute on function public.join_class_by_code(text) to authenticated;

create or replace function public.update_class_info(
  p_class_id uuid,
  p_class_name text,
  p_description text
)
returns public.classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_app_role();
  v_class public.classes;
begin
  if v_role is distinct from 'lecturer' and v_role is distinct from 'admin' then
    raise exception 'Lecturer or admin role required';
  end if;
  if nullif(btrim(p_class_name), '') is null
    or char_length(btrim(p_class_name)) > 160
    or char_length(coalesce(p_description, '')) > 2000 then
    raise exception 'Invalid class data';
  end if;

  update public.classes
  set class_name = btrim(p_class_name),
      description = nullif(btrim(p_description), ''),
      updated_at = now()
  where id = p_class_id
    and status in ('pending', 'active')
    and (v_role = 'admin' or lecturer_id = (select auth.uid()))
  returning * into v_class;

  if not found then
    raise exception 'Class not found';
  end if;

  -- Giữ nội dung yêu cầu mở lớp đang chờ khớp với thông tin mới để admin duyệt đúng.
  update public.approval_requests
  set request_data = coalesce(request_data, '{}'::jsonb)
        || jsonb_build_object('class_name', v_class.class_name, 'description', v_class.description)
  where target_id = v_class.id
    and request_type = 'class_creation'
    and status = 'pending';

  return v_class;
end
$$;

revoke all on function public.update_class_info(uuid, text, text) from public, anon;
grant execute on function public.update_class_info(uuid, text, text) to authenticated;

commit;
