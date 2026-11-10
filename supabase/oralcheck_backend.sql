-- Backend policies and transactional operations for the OralCheck workflow.
-- Run after ie104_supabase_schema.sql in Supabase SQL Editor.

begin;

alter table public.approval_requests
  drop constraint if exists approval_requests_request_type_check;
alter table public.approval_requests
  add constraint approval_requests_request_type_check
  check (request_type in ('class_creation', 'class_cancellation', 'student_registration', 'academic_info_update'));

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.users u
  where u.id = (select auth.uid())
    and u.account_status = 'active'
$$;

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
drop trigger if exists on_oralcheck_student_signup on auth.users;
drop trigger if exists on_oralcheck_app_profile_signup on auth.users;
create trigger on_oralcheck_app_profile_signup
  after insert on auth.users
  for each row execute function public.create_app_profile_after_signup();

create or replace function public.can_view_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and (
        (c.lecturer_id = (select auth.uid()) and public.current_app_role() = 'lecturer')
        or public.current_app_role() = 'admin'
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = c.id
            and c.status = 'active'
            and cm.student_id = (select auth.uid())
            and cm.status = 'active'
            and public.current_app_role() = 'student'
        )
      )
  )
$$;

create or replace function public.can_view_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    where a.id = p_assignment_id
      and (
        (
          a.lecturer_id = (select auth.uid())
          and public.current_app_role() = 'lecturer'
          and exists (
            select 1
            from public.classes c
            where c.id = a.class_id
              and c.status = 'active'
          )
        )
        or public.current_app_role() = 'admin'
        or (
          (a.status in ('published', 'closed') or a.results_published_at is not null)
          and public.current_app_role() = 'student'
          and exists (
            select 1
            from public.classes c
            where c.id = a.class_id
              and c.status = 'active'
          )
          and exists (
            select 1
            from public.class_members cm
            where cm.class_id = a.class_id
              and cm.student_id = (select auth.uid())
              and cm.status = 'active'
          )
        )
      )
  )
$$;

create or replace function public.can_view_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.assignment_submissions ats
      on ats.id = s.assignment_submission_id
    join public.assignments a on a.id = ats.assignment_id
    where s.id = p_submission_id
      and (
        (s.student_id = (select auth.uid()) and public.current_app_role() = 'student')
        or (a.lecturer_id = (select auth.uid()) and public.current_app_role() = 'lecturer')
        or public.current_app_role() = 'admin'
      )
  )
$$;

create or replace function public.can_view_submission_result(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.assignment_submissions ats
      on ats.id = s.assignment_submission_id
    join public.assignments a on a.id = ats.assignment_id
    where s.id = p_submission_id
      and a.results_published_at is not null
      and s.student_id = (select auth.uid())
      and public.current_app_role() = 'student'
  )
$$;

create or replace function public.can_lecturer_view_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    join public.class_members cm on cm.class_id = c.id
    where c.lecturer_id = (select auth.uid())
      and cm.student_id = p_user_id
      and public.current_app_role() = 'lecturer'
  )
$$;

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

create or replace function public.class_lecturer_names(p_class_ids uuid[])
returns table (class_id uuid, lecturer_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, u.full_name
  from public.classes c
  join public.users u on u.id = c.lecturer_id
  where c.id = any(coalesce(p_class_ids, array[]::uuid[]))
    and public.can_view_class(c.id)
$$;

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

  insert into public.class_members (class_id, student_id, status, joined_at, left_at)
  values (v_class_id, (select auth.uid()), 'active', now(), null)
  on conflict (class_id, student_id) do update
    set status = 'active', joined_at = now(), left_at = null;

  return v_class_id;
end
$$;

create or replace function public.create_assignment_with_questions(
  p_class_id uuid,
  p_assignment jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_id uuid;
  v_question_id uuid;
  v_question jsonb;
  v_criterion jsonb;
  v_position integer := 0;
  v_criterion_position integer;
  v_max_score numeric;
  v_class public.classes;
  v_role text := public.current_app_role();
begin
  if v_role is distinct from 'lecturer' and v_role is distinct from 'admin' then
    raise exception 'Active class owned by lecturer required';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
    and status = 'active'
    and (v_role = 'admin' or lecturer_id = (select auth.uid()));

  if not found then
    raise exception 'Active class owned by lecturer required';
  end if;

  if nullif(btrim(p_assignment->>'title'), '') is null
    or char_length(btrim(p_assignment->>'title')) > 200
    or coalesce(jsonb_typeof(p_assignment->'questions'), '') <> 'array'
    or coalesce(jsonb_array_length(p_assignment->'questions'), 0) = 0
    or abs(coalesce((
      select sum(coalesce((question.value->>'max_score')::numeric, 10))
      from jsonb_array_elements(p_assignment->'questions') as question(value)
    ), 0) - 10) > 0.01 then
    raise exception 'Assignment title, questions, and total score are invalid';
  end if;

  insert into public.assignments (
    class_id, lecturer_id, title, instructions, starts_at, ends_at, status
  )
  values (
    p_class_id,
    v_class.lecturer_id,
    btrim(p_assignment->>'title'),
    nullif(btrim(p_assignment->>'instructions'), ''),
    nullif(p_assignment->>'starts_at', '')::timestamptz,
    nullif(p_assignment->>'ends_at', '')::timestamptz,
    'draft'
  )
  returning id into v_assignment_id;

  for v_question in select value from jsonb_array_elements(p_assignment->'questions')
  loop
    v_position := v_position + 1;
    if nullif(btrim(v_question->>'content'), '') is null
      or char_length(v_question->>'content') > 10000
      or char_length(coalesce(v_question->>'reference_answer', '')) > 10000 then
      raise exception 'Invalid question data';
    end if;
    insert into public.questions (
      assignment_id, content, reference_answer, position, max_score, time_limit_seconds
    )
    values (
      v_assignment_id,
      btrim(v_question->>'content'),
      coalesce(v_question->>'reference_answer', ''),
      coalesce((v_question->>'position')::integer, v_position),
      coalesce((v_question->>'max_score')::numeric, 10),
      coalesce((v_question->>'time_limit_seconds')::integer, 120)
    )
    returning id into v_question_id;

    select coalesce((v_question->>'max_score')::numeric, 10)
      into v_max_score;
    if coalesce((
      select sum((criterion.value->>'max_points')::numeric)
      from jsonb_array_elements(coalesce(v_question->'rubric', '[]'::jsonb)) as criterion(value)
    ), 0) > v_max_score then
      raise exception 'Rubric points exceed question maximum score';
    end if;

    v_criterion_position := 0;
    for v_criterion in
      select value from jsonb_array_elements(coalesce(v_question->'rubric', '[]'::jsonb))
    loop
      v_criterion_position := v_criterion_position + 1;
      if nullif(btrim(v_criterion->>'criterion_text'), '') is null
        or char_length(v_criterion->>'criterion_text') > 500 then
        raise exception 'Invalid rubric criterion';
      end if;
      insert into public.rubric_criteria (
        question_id, criterion_text, max_points, position
      )
      values (
        v_question_id,
        btrim(v_criterion->>'criterion_text'),
        (v_criterion->>'max_points')::numeric,
        coalesce((v_criterion->>'position')::integer, v_criterion_position)
      );
    end loop;
  end loop;

  return v_assignment_id;
end
$$;

create or replace function public.update_draft_assignment_with_questions(
  p_assignment_id uuid,
  p_assignment jsonb
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.assignments;
  v_question_id uuid;
  v_question jsonb;
  v_criterion jsonb;
  v_position integer := 0;
  v_criterion_position integer;
  v_max_score numeric;
begin
  if (
      public.current_app_role() is distinct from 'lecturer'
      and public.current_app_role() is distinct from 'admin'
    )
    or nullif(btrim(p_assignment->>'title'), '') is null
    or char_length(btrim(p_assignment->>'title')) > 200
    or coalesce(jsonb_typeof(p_assignment->'questions'), '') <> 'array'
    or coalesce(jsonb_array_length(p_assignment->'questions'), 0) = 0
    or abs(coalesce((
      select sum(coalesce((question.value->>'max_score')::numeric, 10))
      from jsonb_array_elements(p_assignment->'questions') as question(value)
    ), 0) - 10) > 0.01 then
    raise exception 'Invalid draft assignment';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
    and (
      public.current_app_role() = 'admin'
      or (
        public.current_app_role() = 'lecturer'
        and lecturer_id = (select auth.uid())
      )
    )
    and status = 'draft'
  for update;

  if not found then
    raise exception 'Draft assignment not found or forbidden';
  end if;

  if exists (
    select 1 from public.assignment_submissions
    where assignment_id = p_assignment_id
  ) then
    raise exception 'Draft assignment with submissions cannot be edited';
  end if;

  update public.assignments
  set title = btrim(p_assignment->>'title'),
      instructions = nullif(btrim(p_assignment->>'instructions'), ''),
      starts_at = nullif(p_assignment->>'starts_at', '')::timestamptz,
      ends_at = nullif(p_assignment->>'ends_at', '')::timestamptz,
      updated_at = now()
  where id = p_assignment_id
  returning * into v_assignment;

  delete from public.rubric_criteria
  where question_id in (
    select id from public.questions where assignment_id = p_assignment_id
  );
  delete from public.questions where assignment_id = p_assignment_id;

  for v_question in select value from jsonb_array_elements(p_assignment->'questions')
  loop
    v_position := v_position + 1;
    if nullif(btrim(v_question->>'content'), '') is null
      or char_length(v_question->>'content') > 10000
      or char_length(coalesce(v_question->>'reference_answer', '')) > 10000 then
      raise exception 'Invalid question data';
    end if;

    insert into public.questions (
      assignment_id, content, reference_answer, position, max_score, time_limit_seconds
    )
    values (
      p_assignment_id,
      btrim(v_question->>'content'),
      coalesce(v_question->>'reference_answer', ''),
      coalesce((v_question->>'position')::integer, v_position),
      coalesce((v_question->>'max_score')::numeric, 10),
      coalesce((v_question->>'time_limit_seconds')::integer, 120)
    )
    returning id into v_question_id;

    v_max_score := coalesce((v_question->>'max_score')::numeric, 10);
    if coalesce((
      select sum((criterion.value->>'max_points')::numeric)
      from jsonb_array_elements(coalesce(v_question->'rubric', '[]'::jsonb)) as criterion(value)
    ), 0) > v_max_score then
      raise exception 'Rubric points exceed question maximum score';
    end if;

    v_criterion_position := 0;
    for v_criterion in
      select value from jsonb_array_elements(coalesce(v_question->'rubric', '[]'::jsonb))
    loop
      v_criterion_position := v_criterion_position + 1;
      if nullif(btrim(v_criterion->>'criterion_text'), '') is null
        or char_length(v_criterion->>'criterion_text') > 500 then
        raise exception 'Invalid rubric criterion';
      end if;
      insert into public.rubric_criteria (question_id, criterion_text, max_points, position)
      values (
        v_question_id,
        btrim(v_criterion->>'criterion_text'),
        (v_criterion->>'max_points')::numeric,
        coalesce((v_criterion->>'position')::integer, v_criterion_position)
      );
    end loop;
  end loop;

  return v_assignment;
end
$$;

create or replace function public.set_assignment_status(
  p_assignment_id uuid,
  p_status text
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.assignments;
begin
  if p_status is null or p_status not in ('draft', 'published', 'closed', 'archived') then
    raise exception 'Invalid assignment status';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
    and (
      public.current_app_role() = 'admin'
      or (
        public.current_app_role() = 'lecturer'
        and lecturer_id = (select auth.uid())
      )
    )
  for update;

  if not found then
    raise exception 'Assignment not found or forbidden';
  end if;
  if v_assignment.status in ('closed', 'archived') and p_status = 'published' then
    raise exception 'Closed assignments cannot be reopened';
  end if;
  if p_status = 'draft' and exists (
    select 1 from public.assignment_submissions
    where assignment_id = p_assignment_id
  ) then
    raise exception 'An assignment with submissions cannot return to draft';
  end if;
  if v_assignment.results_published_at is not null and p_status = 'draft' then
    raise exception 'Published results cannot be reverted to draft';
  end if;

  update public.assignments
  set status = p_status, updated_at = now()
  where id = p_assignment_id
  returning * into v_assignment;

  return v_assignment;
end
$$;

create or replace function public.delete_or_archive_assignment(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.assignments;
begin
  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
    and (
      public.current_app_role() = 'admin'
      or (
        public.current_app_role() = 'lecturer'
        and lecturer_id = (select auth.uid())
      )
    )
  for update;

  if not found then
    raise exception 'Assignment not found or forbidden';
  end if;

  if exists (
    select 1 from public.assignment_submissions
    where assignment_id = p_assignment_id
  ) then
    update public.assignments
    set status = 'archived', updated_at = now()
    where id = p_assignment_id;
    return true;
  end if;

  delete from public.rubric_criteria
  where question_id in (
    select id from public.questions where assignment_id = p_assignment_id
  );
  delete from public.questions where assignment_id = p_assignment_id;
  delete from public.assignments where id = p_assignment_id;
  return false;
end
$$;

create or replace function public.start_assignment_submission(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_id uuid;
begin
  if public.current_app_role() is distinct from 'student' or not exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    join public.class_members cm on cm.class_id = a.class_id
    where a.id = p_assignment_id
      and c.status = 'active'
      and a.status = 'published'
      and (a.starts_at is null or a.starts_at <= now())
      and (a.ends_at is null or a.ends_at >= now())
      and cm.student_id = (select auth.uid())
      and cm.status = 'active'
  ) then
    raise exception 'Assignment is unavailable to this student';
  end if;

  insert into public.assignment_submissions (assignment_id, student_id, status)
  values (p_assignment_id, (select auth.uid()), 'in_progress')
  on conflict (assignment_id, student_id) do nothing;

  select id into v_submission_id
  from public.assignment_submissions
  where assignment_id = p_assignment_id
    and student_id = (select auth.uid())
  for update;

  if exists (
    select 1 from public.assignment_submissions
    where id = v_submission_id and status <> 'in_progress'
  ) then
    raise exception 'Submission has already been finalized';
  end if;

  return v_submission_id;
end
$$;

create or replace function public.record_submission_answer(
  p_assignment_submission_id uuid,
  p_question_id uuid,
  p_audio_storage_path text,
  p_audio_mime_type text,
  p_audio_size_bytes bigint,
  p_audio_duration_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_id uuid;
  v_submission_id uuid;
  v_attempt_number integer;
begin
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Student role required';
  end if;

  select assignment_id into v_assignment_id
  from public.assignment_submissions
  where id = p_assignment_submission_id
    and student_id = (select auth.uid())
    and status = 'in_progress'
  for update;

  if not found or not exists (
    select 1
    from public.questions q
    where q.assignment_id = v_assignment_id
      and q.id = p_question_id
  ) then
    raise exception 'Question or active submission not found';
  end if;

  if p_audio_storage_path is null
    or p_audio_storage_path !~ ('^' || (select auth.uid())::text || '/' || v_assignment_id::text || '/' || p_question_id::text || '/') then
    raise exception 'Invalid audio storage path';
  end if;
  if p_audio_mime_type is null
    or p_audio_mime_type not in ('audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg')
    or p_audio_size_bytes is null
    or p_audio_size_bytes not between 1 and 26214400
    or (p_audio_duration_seconds is not null and p_audio_duration_seconds not between 1 and 7200) then
    raise exception 'Invalid audio metadata';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'oral-answers'
      and name = p_audio_storage_path
      and owner_id = (select auth.uid())::text
  ) then
    raise exception 'Uploaded audio object not found';
  end if;

  update public.submissions
  set is_final = false
  where assignment_submission_id = p_assignment_submission_id
    and question_id = p_question_id
    and is_final = true;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.submissions
  where assignment_submission_id = p_assignment_submission_id
    and question_id = p_question_id;

  insert into public.submissions (
    assignment_submission_id, question_id, student_id,
    audio_storage_path, audio_mime_type, audio_size_bytes,
    audio_duration_seconds, attempt_number, is_final, status
  )
  values (
    p_assignment_submission_id, p_question_id, (select auth.uid()),
    p_audio_storage_path, p_audio_mime_type, p_audio_size_bytes,
    p_audio_duration_seconds, v_attempt_number, true, 'queued'
  )
  returning id into v_submission_id;

  return v_submission_id;
end
$$;

create or replace function public.finalize_assignment_submission(p_assignment_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_id uuid;
begin
  select assignment_id into v_assignment_id
  from public.assignment_submissions
  where id = p_assignment_submission_id
    and student_id = (select auth.uid())
    and status = 'in_progress'
  for update;

  if not found or public.current_app_role() is distinct from 'student' then
    raise exception 'Active submission not found';
  end if;

  if exists (
    select 1
    from public.questions q
    where q.assignment_id = v_assignment_id
      and not exists (
        select 1 from public.submissions s
        where s.assignment_submission_id = p_assignment_submission_id
          and s.question_id = q.id
          and s.is_final = true
      )
  ) then
    raise exception 'Every question must have a final audio answer';
  end if;

  update public.assignment_submissions
  set status = 'submitted', submitted_at = now(), updated_at = now()
  where id = p_assignment_submission_id;

  return p_assignment_submission_id;
end
$$;

create or replace function public.review_submission(
  p_submission_id uuid,
  p_final_score numeric,
  p_reviewer_feedback text default null,
  p_score_modified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_id uuid;
  v_parent_id uuid;
  v_max_score numeric;
  v_grade_review public.grade_reviews;
  v_total_questions integer;
  v_reviewed_questions integer;
begin
  if public.current_app_role() is distinct from 'lecturer'
    and public.current_app_role() is distinct from 'admin' then
    raise exception 'Lecturer or admin role required';
  end if;

  select ats.assignment_id, ats.id, q.max_score
  into v_assignment_id, v_parent_id, v_max_score
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  join public.assignments a on a.id = ats.assignment_id
  join public.questions q on q.id = s.question_id
  where s.id = p_submission_id
    and (
      public.current_app_role() = 'admin'
      or a.lecturer_id = (select auth.uid())
    )
    and a.results_published_at is null
    and ats.status in ('submitted', 'processing', 'graded')
    and s.is_final = true
  for update of ats, a;

  if not found then
    raise exception 'Submitted answer not found or forbidden';
  end if;
  if p_final_score is null or p_final_score < 0 or p_final_score > v_max_score then
    raise exception 'Score is outside the question score range';
  end if;
  if coalesce(p_score_modified, false)
    and nullif(btrim(p_reviewer_feedback), '') is null then
    raise exception 'Feedback is required when the score is modified';
  end if;

  insert into public.grade_reviews (
    submission_id, lecturer_id, final_score, reviewer_feedback, score_modified
  )
  values (
    p_submission_id, (select auth.uid()), p_final_score,
    nullif(btrim(p_reviewer_feedback), ''), p_score_modified
  )
  on conflict (submission_id) do update
    set lecturer_id = excluded.lecturer_id,
        final_score = excluded.final_score,
        reviewer_feedback = excluded.reviewer_feedback,
        score_modified = excluded.score_modified,
        reviewed_at = now(),
        updated_at = now()
  returning * into v_grade_review;

  select count(*), count(gr.id)
  into v_total_questions, v_reviewed_questions
  from public.submissions s
  left join public.grade_reviews gr on gr.submission_id = s.id
  where s.assignment_submission_id = v_parent_id
    and s.is_final = true;

  update public.assignment_submissions
  set total_score = (
        select coalesce(sum(gr.final_score), 0)
        from public.submissions s
        join public.grade_reviews gr on gr.submission_id = s.id
        where s.assignment_submission_id = v_parent_id and s.is_final = true
      ),
      status = case
        when v_total_questions > 0 and v_total_questions = v_reviewed_questions then 'graded'
        else 'submitted'
      end,
      graded_at = case
        when v_total_questions > 0 and v_total_questions = v_reviewed_questions then now()
        else null
      end,
      updated_at = now()
  where id = v_parent_id;

  return jsonb_build_object(
    'grade_review', to_jsonb(v_grade_review),
    'assignment_submission_id', v_parent_id,
    'total_score', (
      select total_score from public.assignment_submissions where id = v_parent_id
    )
  );
end
$$;

create or replace function public.publish_assignment_results(p_assignment_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_results_published_at timestamptz;
  v_assignment_title text;
  v_assignment_status text;
begin
  select title, status into v_assignment_title, v_assignment_status
  from public.assignments
  where id = p_assignment_id
    and (
      public.current_app_role() = 'admin'
      or (
        public.current_app_role() = 'lecturer'
        and lecturer_id = (select auth.uid())
      )
    )
  for update;

  if not found then
    raise exception 'Assignment not found or forbidden';
  end if;
  if v_assignment_status not in ('published', 'closed', 'archived') then
    raise exception 'Assignment must be published before results';
  end if;

  if exists (
    select 1 from public.assignment_submissions
    where assignment_id = p_assignment_id
      and status <> 'graded'
  ) then
    raise exception 'All submitted work must be graded before publishing';
  end if;

  update public.assignments
  set results_published_at = coalesce(results_published_at, now()),
      updated_at = now()
  where id = p_assignment_id
  returning results_published_at into v_results_published_at;

  insert into public.notifications (
    user_id, title, message, notification_type, related_entity_type, related_entity_id
  )
  select ats.student_id,
         'Đã công bố kết quả bài tập',
         'Kết quả bài tập "' || v_assignment_title || '" đã được công bố.',
         'grade_published',
         'assignment',
         p_assignment_id
  from public.assignment_submissions ats
  where ats.assignment_id = p_assignment_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = ats.student_id
        and n.notification_type = 'grade_published'
        and n.related_entity_type = 'assignment'
        and n.related_entity_id = p_assignment_id
    );

  return v_results_published_at;
end
$$;

-- Read access is mediated by the policies below. All business writes use the
-- owner-checked RPCs above so related records change atomically.
revoke all on public.users, public.student_profiles, public.lecturer_profiles,
  public.classes, public.class_members, public.assignments, public.questions,
  public.rubric_criteria, public.assignment_submissions, public.submissions,
  public.transcriptions, public.evaluations, public.evaluation_criterion_scores,
  public.grade_reviews, public.approval_requests, public.notifications
from public, anon, authenticated;
grant select on public.users, public.student_profiles, public.lecturer_profiles,
  public.classes, public.class_members, public.assignments,
  public.submissions,
  public.transcriptions, public.evaluations, public.evaluation_criterion_scores,
  public.grade_reviews, public.approval_requests, public.notifications
to authenticated;

revoke all on public.rubric_criteria from public, anon, authenticated;
create or replace view public.lecturer_rubric_criteria as
select rc.*
from public.rubric_criteria rc
join public.questions q on q.id = rc.question_id
where public.current_app_role() in ('lecturer', 'admin')
  and public.can_view_assignment(q.assignment_id);
grant select on public.lecturer_rubric_criteria to authenticated;

revoke all on public.assignment_submissions from public, anon, authenticated;
grant select (
  id, assignment_id, student_id, status, started_at, submitted_at,
  graded_at, created_at, updated_at
) on public.assignment_submissions to authenticated;

create or replace view public.lecturer_assignment_submissions as
select ats.*
from public.assignment_submissions ats
join public.assignments a on a.id = ats.assignment_id
where (a.lecturer_id = (select auth.uid()) and public.current_app_role() = 'lecturer')
  or public.current_app_role() = 'admin';
grant select on public.lecturer_assignment_submissions to authenticated;

create or replace view public.student_assignment_results as
select ats.id, ats.assignment_id, ats.status, ats.total_score,
       ats.submitted_at, ats.graded_at
from public.assignment_submissions ats
join public.assignments a on a.id = ats.assignment_id
where ats.student_id = (select auth.uid())
  and public.current_app_role() = 'student'
  and a.results_published_at is not null;
grant select on public.student_assignment_results to authenticated;

revoke all on public.questions from public, anon, authenticated;
grant select (
  id, assignment_id, content, position, max_score, time_limit_seconds,
  created_at, updated_at
) on public.questions to authenticated;

create or replace view public.lecturer_questions as
select q.*
from public.questions q
where public.current_app_role() in ('lecturer', 'admin')
  and public.can_view_assignment(q.assignment_id);
grant select on public.lecturer_questions to authenticated;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.can_view_class(uuid) from public, anon;
revoke all on function public.class_lecturer_names(uuid[]) from public, anon;
revoke all on function public.can_view_assignment(uuid) from public, anon;
revoke all on function public.can_view_submission(uuid) from public, anon;
revoke all on function public.can_view_submission_result(uuid) from public, anon;
revoke all on function public.can_lecturer_view_user(uuid) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_view_class(uuid) to authenticated;
grant execute on function public.class_lecturer_names(uuid[]) to authenticated;
grant execute on function public.can_view_assignment(uuid) to authenticated;
grant execute on function public.can_view_submission(uuid) to authenticated;
grant execute on function public.can_view_submission_result(uuid) to authenticated;
grant execute on function public.can_lecturer_view_user(uuid) to authenticated;

revoke all on function public.create_class_request(text, text, varchar) from public, anon;
revoke all on function public.remove_class_member(uuid, uuid) from public, anon;
revoke all on function public.request_class_cancellation(uuid, text) from public, anon;
revoke all on function public.review_class_request(uuid, text, text) from public, anon;
revoke all on function public.delete_or_archive_class(uuid) from public, anon;
revoke all on function public.join_class_by_code(text) from public, anon;
revoke all on function public.create_assignment_with_questions(uuid, jsonb) from public, anon;
revoke all on function public.update_draft_assignment_with_questions(uuid, jsonb) from public, anon;
revoke all on function public.delete_or_archive_assignment(uuid) from public, anon;
revoke all on function public.set_assignment_status(uuid, text) from public, anon;
revoke all on function public.start_assignment_submission(uuid) from public, anon;
revoke all on function public.record_submission_answer(uuid, uuid, text, text, bigint, integer) from public, anon;
revoke all on function public.finalize_assignment_submission(uuid) from public, anon;
revoke all on function public.review_submission(uuid, numeric, text, boolean) from public, anon;
revoke all on function public.publish_assignment_results(uuid) from public, anon;
grant execute on function public.create_class_request(text, text, varchar) to authenticated;
grant execute on function public.remove_class_member(uuid, uuid) to authenticated;
grant execute on function public.request_class_cancellation(uuid, text) to authenticated;
grant execute on function public.review_class_request(uuid, text, text) to authenticated;
grant execute on function public.delete_or_archive_class(uuid) to authenticated;
grant execute on function public.join_class_by_code(text) to authenticated;
grant execute on function public.create_assignment_with_questions(uuid, jsonb) to authenticated;
grant execute on function public.update_draft_assignment_with_questions(uuid, jsonb) to authenticated;
grant execute on function public.delete_or_archive_assignment(uuid) to authenticated;
grant execute on function public.set_assignment_status(uuid, text) to authenticated;
grant execute on function public.start_assignment_submission(uuid) to authenticated;
grant execute on function public.record_submission_answer(uuid, uuid, text, text, bigint, integer) to authenticated;
grant execute on function public.finalize_assignment_submission(uuid) to authenticated;
grant execute on function public.review_submission(uuid, numeric, text, boolean) to authenticated;
grant execute on function public.publish_assignment_results(uuid) to authenticated;

drop policy if exists "users visible to owner, admin, and class lecturer" on public.users;
create policy "users visible to owner, admin, and class lecturer" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.current_app_role() = 'admin'
    or public.can_lecturer_view_user(id)
    or exists (
      select 1
      from public.classes c
      where c.lecturer_id = id
        and public.can_view_class(c.id)
    )
  );

drop policy if exists "student profiles visible to owner, admin, and class lecturer" on public.student_profiles;
create policy "student profiles visible to owner, admin, and class lecturer" on public.student_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.current_app_role() = 'admin'
    or public.can_lecturer_view_user(user_id)
  );

drop policy if exists "lecturer profiles visible to owner and admin" on public.lecturer_profiles;
create policy "lecturer profiles visible to owner and admin" on public.lecturer_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.current_app_role() = 'admin');

drop policy if exists "classes visible to participants" on public.classes;
create policy "classes visible to participants" on public.classes
  for select to authenticated using (public.can_view_class(id));

drop policy if exists "class members visible to participants" on public.class_members;
create policy "class members visible to participants" on public.class_members
  for select to authenticated
  using (
    (student_id = (select auth.uid()) and public.current_app_role() = 'student')
    or (
      public.can_view_class(class_id)
      and (
        public.current_app_role() = 'admin'
        or exists (
          select 1
          from public.classes c
          where c.id = class_id
            and c.status = 'active'
        )
      )
    )
  );

drop policy if exists "assignments visible to participants" on public.assignments;
create policy "assignments visible to participants" on public.assignments
  for select to authenticated using (public.can_view_assignment(id));

drop policy if exists "questions visible to assignment participants" on public.questions;
create policy "questions visible to assignment participants" on public.questions
  for select to authenticated using (public.can_view_assignment(assignment_id));

drop policy if exists "rubrics visible to assignment participants" on public.rubric_criteria;
create policy "rubrics visible to assignment participants" on public.rubric_criteria
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_id
        and public.can_view_assignment(q.assignment_id)
    )
  );

drop policy if exists "assignment submissions visible to owner, lecturer, and admin" on public.assignment_submissions;
create policy "assignment submissions visible to owner, lecturer, and admin" on public.assignment_submissions
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (a.lecturer_id = (select auth.uid()) or public.current_app_role() = 'admin')
    )
  );

drop policy if exists "submissions visible to owner, lecturer, and admin" on public.submissions;
create policy "submissions visible to owner, lecturer, and admin" on public.submissions
  for select to authenticated using (public.can_view_submission(id));

drop policy if exists "transcriptions visible to reviewer and result owner" on public.transcriptions;
create policy "transcriptions visible to reviewer and result owner" on public.transcriptions
  for select to authenticated
  using (
    public.can_view_submission(submission_id)
    and (
      public.current_app_role() in ('lecturer', 'admin')
      or public.can_view_submission_result(submission_id)
    )
  );

drop policy if exists "evaluations visible to reviewer and result owner" on public.evaluations;
create policy "evaluations visible to reviewer and result owner" on public.evaluations
  for select to authenticated
  using (
    public.can_view_submission(submission_id)
    and (
      public.current_app_role() in ('lecturer', 'admin')
      or public.can_view_submission_result(submission_id)
    )
  );

drop policy if exists "evaluation scores visible to reviewer and result owner" on public.evaluation_criterion_scores;
create policy "evaluation scores visible to reviewer and result owner" on public.evaluation_criterion_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and public.can_view_submission(e.submission_id)
        and (
          public.current_app_role() in ('lecturer', 'admin')
          or public.can_view_submission_result(e.submission_id)
        )
    )
  );

drop policy if exists "grade reviews visible to reviewer and result owner" on public.grade_reviews;
create policy "grade reviews visible to reviewer and result owner" on public.grade_reviews
  for select to authenticated
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and (
          public.current_app_role() = 'admin'
          or exists (
            select 1
            from public.assignment_submissions ats
            join public.assignments a on a.id = ats.assignment_id
            where ats.id = s.assignment_submission_id
              and public.current_app_role() = 'lecturer'
              and a.lecturer_id = (select auth.uid())
          )
          or (
            s.student_id = (select auth.uid())
            and public.current_app_role() = 'student'
            and exists (
              select 1
              from public.assignment_submissions ats
              join public.assignments a on a.id = ats.assignment_id
              where ats.id = s.assignment_submission_id
                and a.results_published_at is not null
            )
          )
        )
    )
  );

drop policy if exists "approval requests visible to requester and admin" on public.approval_requests;
create policy "approval requests visible to requester and admin" on public.approval_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or public.current_app_role() = 'admin');

drop policy if exists "notifications visible to owner" on public.notifications;
create policy "notifications visible to owner" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

create unique index if not exists uq_grade_reviews_submission_id
  on public.grade_reviews (submission_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oral-answers',
  'oral-answers',
  false,
  26214400,
  array['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "students upload own oral answers" on storage.objects;
create policy "students upload own oral answers" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'oral-answers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_app_role() = 'student'
  );

drop policy if exists "owners and reviewers read oral answers" on storage.objects;
create policy "owners and reviewers read oral answers" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'oral-answers'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.submissions s
        where s.audio_storage_path = name
          and public.can_view_submission(s.id)
      )
    )
  );

drop policy if exists "students remove own unrecorded oral answers" on storage.objects;
create policy "students remove own unrecorded oral answers" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'oral-answers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_app_role() = 'student'
    and not exists (
      select 1 from public.submissions s
      where s.audio_storage_path = name
    )
  );

commit;
