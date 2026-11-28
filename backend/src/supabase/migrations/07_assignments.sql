-- =====================================================================
-- 07_assignments.sql — SOẠN BÀI TẬP
--
-- Tạo / sửa bản nháp (câu hỏi + rubric), công bố / đóng, thời lượng, barem chấm, hiện đáp án, số lần làm lại, xóa / lưu trữ.
-- =====================================================================

begin;

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

revoke all on function public.create_assignment_with_questions(uuid, jsonb) from public, anon;
grant execute on function public.create_assignment_with_questions(uuid, jsonb) to authenticated;

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

revoke all on function public.update_draft_assignment_with_questions(uuid, jsonb) from public, anon;
grant execute on function public.update_draft_assignment_with_questions(uuid, jsonb) to authenticated;

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

revoke all on function public.set_assignment_status(uuid, text) from public, anon;
grant execute on function public.set_assignment_status(uuid, text) to authenticated;

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

revoke all on function public.delete_or_archive_assignment(uuid) from public, anon;
grant execute on function public.delete_or_archive_assignment(uuid) to authenticated;

-- Thời lượng làm bài (phút) do giảng viên đặt khi soạn bản nháp.
create or replace function public.set_assignment_duration(p_assignment_id uuid, p_duration_minutes integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_draft_assignment_editable(p_assignment_id);
  if p_duration_minutes is not null and p_duration_minutes not between 1 and 600 then
    raise exception 'Invalid duration';
  end if;
  update public.assignments set duration_minutes = p_duration_minutes, updated_at = now() where id = p_assignment_id;
end
$$;

revoke all on function public.set_assignment_duration(uuid, integer) from public, anon;
grant execute on function public.set_assignment_duration(uuid, integer) to authenticated;

-- Ghi barem (chuỗi rỗng = xóa).
create or replace function public.set_assignment_grading_guide(p_assignment_id uuid, p_guide_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_draft_assignment_editable(p_assignment_id);

  if nullif(btrim(coalesce(p_guide_text, '')), '') is null then
    delete from public.assignment_grading_guides where assignment_id = p_assignment_id;
    return;
  end if;
  if char_length(p_guide_text) > 20000 then
    raise exception 'Grading guide too long';
  end if;

  insert into public.assignment_grading_guides (assignment_id, guide_text, updated_by, updated_at)
  values (p_assignment_id, btrim(p_guide_text), (select auth.uid()), now())
  on conflict (assignment_id) do update
    set guide_text = excluded.guide_text, updated_by = excluded.updated_by, updated_at = now();
end
$$;

revoke all on function public.set_assignment_grading_guide(uuid, text) from public, anon;
grant execute on function public.set_assignment_grading_guide(uuid, text) to authenticated;

create or replace function public.set_assignment_reference_visibility(p_assignment_id uuid, p_visible boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visible is null or not public.can_manage_assignment(p_assignment_id) then
    raise exception 'Assignment not found or forbidden';
  end if;
  update public.assignments
  set show_reference_answer = p_visible, updated_at = now()
  where id = p_assignment_id;
  return p_visible;
end
$$;

revoke all on function public.set_assignment_reference_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_assignment_reference_visibility(uuid, boolean) to authenticated;

create or replace function public.set_assignment_max_attempts(p_assignment_id uuid, p_max_attempts integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_max_attempts is null or p_max_attempts not between 1 and 5
    or not public.can_manage_assignment(p_assignment_id) then
    raise exception 'Assignment not found or invalid attempt limit';
  end if;
  update public.assignments set max_attempts = p_max_attempts, updated_at = now() where id = p_assignment_id;
  return p_max_attempts;
end
$$;

revoke all on function public.set_assignment_max_attempts(uuid, integer) from public, anon;
grant execute on function public.set_assignment_max_attempts(uuid, integer) to authenticated;

commit;
