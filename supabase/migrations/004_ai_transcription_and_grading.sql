begin;

alter table public.evaluations
  add column if not exists needs_teacher_review boolean not null default true;
alter table public.submissions
  add column if not exists ai_processing_started_at timestamptz;

create or replace function public.get_own_assignment_submission(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Student role required';
  end if;
  select jsonb_build_object(
    'attempt_id', ats.id,
    'status', ats.status,
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'question_id', s.question_id,
        'status', s.status,
        'transcript', (
          select t.transcript_text from public.transcriptions t
          where t.submission_id = s.id order by t.created_at desc limit 1
        ),
        'original_transcript', (
          select t.transcript_text from public.transcriptions t
          where t.submission_id = s.id order by t.created_at asc limit 1
        ),
        'reference_answer', case
          when ats.status <> 'in_progress' and exists (
            select 1 from public.evaluations e where e.submission_id = s.id
          ) then (
            select q.reference_answer from public.questions q where q.id = s.question_id
          )
          else null
        end,
        'evaluation', (
          select jsonb_build_object(
            'score', e.suggested_score,
            'feedback', e.feedback_summary,
            'needs_teacher_review', e.needs_teacher_review,
            'criteria', coalesce((
              select jsonb_agg(jsonb_build_object(
                'criterion_id', ecs.criterion_id,
                'awarded_points', ecs.awarded_points,
                'assessment', ecs.assessment,
                'evidence_excerpt', ecs.evidence_excerpt,
                'explanation', ecs.explanation
              )) from public.evaluation_criterion_scores ecs
              where ecs.evaluation_id = e.id
            ), '[]'::jsonb)
          ) from public.evaluations e
          where e.submission_id = s.id order by e.created_at desc limit 1
        )
      ) order by s.submitted_at)
      from public.submissions s
      where s.assignment_submission_id = ats.id and s.is_final = true
    ), '[]'::jsonb)
  ) into v_result
  from public.assignment_submissions ats
  where ats.assignment_id = p_assignment_id
    and ats.student_id = (select auth.uid());
  return v_result;
end
$$;

create or replace function public.get_submission_grading_context(p_student_id uuid, p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Internal AI service role required';
  end if;
  select jsonb_build_object(
    'question_id', q.id,
    'question', q.content,
    'reference_answer', q.reference_answer,
    'max_score', q.max_score,
    'criteria', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rc.id, 'text', rc.criterion_text, 'max_points', rc.max_points
      ) order by rc.position)
      from public.rubric_criteria rc where rc.question_id = q.id
    ), '[]'::jsonb)
  ) into v_result
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  join public.questions q on q.id = s.question_id and q.assignment_id = ats.assignment_id
  where s.id = p_submission_id
    and s.student_id = p_student_id
    and s.is_final = true
    and s.status = 'processing'
    and ats.status = 'processing';

  if v_result is null then
    raise exception 'Submission not available for grading';
  end if;
  return v_result;
end
$$;

create or replace function public.claim_submission_for_ai(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
begin
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Student role required';
  end if;

  update public.submissions s
  set status = 'processing', error_message = null, ai_processing_started_at = now()
  from public.assignment_submissions ats
  where s.id = p_submission_id
    and s.assignment_submission_id = ats.id
    and s.student_id = (select auth.uid())
    and (
      s.status in ('queued', 'failed')
      or (
        s.status = 'processing'
        and coalesce(s.ai_processing_started_at, s.submitted_at) < now() - interval '10 minutes'
      )
    )
    and ats.status in ('in_progress', 'submitted', 'processing')
  returning s.assignment_submission_id into v_attempt_id;

  if v_attempt_id is null then
    return false;
  end if;

  update public.assignment_submissions
  set status = 'processing', updated_at = now()
  where id = v_attempt_id and status = 'submitted';
  return true;
end
$$;

create or replace function public.save_submission_transcription(
  p_submission_id uuid,
  p_transcript_text text,
  p_engine_name text,
  p_language_code text,
  p_is_edited boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transcription_id uuid;
begin
  if public.current_app_role() is distinct from 'student'
    or not exists (
      select 1 from public.submissions s
      join public.assignment_submissions ats on ats.id = s.assignment_submission_id
      where s.id = p_submission_id
        and s.student_id = (select auth.uid())
        and s.is_final = true
        and s.status = 'processing'
        and ats.status in ('in_progress', 'processing')
    ) then
    raise exception 'Submission not available for transcription';
  end if;
  if nullif(btrim(p_transcript_text), '') is null
    or char_length(p_transcript_text) > 50000
    or nullif(btrim(p_engine_name), '') is null
    or char_length(p_engine_name) > 100 then
    raise exception 'Invalid transcript data';
  end if;

  insert into public.transcriptions (
    submission_id, transcript_text, engine_name, language_code,
    is_edited, edited_by
  ) values (
    p_submission_id, btrim(p_transcript_text), btrim(p_engine_name),
    nullif(btrim(p_language_code), ''), coalesce(p_is_edited, false),
    case when coalesce(p_is_edited, false) then (select auth.uid()) else null end
  ) returning id into v_transcription_id;

  update public.submissions
  set status = 'queued', ai_processing_started_at = null
  where id = p_submission_id;

  return v_transcription_id;
end
$$;

create or replace function public.save_ai_evaluation(
  p_student_id uuid,
  p_submission_id uuid,
  p_transcript_text text,
  p_engine_name text,
  p_language_code text,
  p_model_name text,
  p_suggested_score numeric,
  p_feedback_summary text,
  p_criteria jsonb,
  p_is_transcript_edited boolean default false,
  p_needs_teacher_review boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_max_score numeric;
  v_transcription_id uuid;
  v_evaluation_id uuid;
  v_sum numeric := 0;
  v_item jsonb;
  v_criterion_id uuid;
  v_max_points numeric;
  v_awarded numeric;
  v_assessment text;
begin
  if auth.role() is distinct from 'service_role'
    or not exists (
      select 1 from public.submissions s
      join public.assignment_submissions ats on ats.id = s.assignment_submission_id
      where s.id = p_submission_id
        and s.student_id = p_student_id
        and s.is_final = true
        and s.status = 'processing'
        and ats.status = 'processing'
    ) then
    raise exception 'Submission not available for AI evaluation';
  end if;

  select q.id, q.max_score into v_question_id, v_max_score
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  join public.questions q on q.id = s.question_id and q.assignment_id = ats.assignment_id
  where s.id = p_submission_id;

  if nullif(btrim(p_transcript_text), '') is null
    or char_length(p_transcript_text) > 50000
    or nullif(btrim(p_engine_name), '') is null
    or nullif(btrim(p_model_name), '') is null
    or p_suggested_score is null
    or p_suggested_score < 0
    or p_suggested_score > v_max_score
    or p_criteria is null
    or jsonb_typeof(p_criteria) is distinct from 'array' then
    raise exception 'Invalid AI evaluation data';
  end if;

  insert into public.transcriptions (
    submission_id, transcript_text, engine_name, language_code,
    is_edited, edited_by
  ) values (
    p_submission_id, btrim(p_transcript_text), btrim(p_engine_name),
    nullif(btrim(p_language_code), ''), coalesce(p_is_transcript_edited, false),
    case when coalesce(p_is_transcript_edited, false) then p_student_id else null end
  ) returning id into v_transcription_id;

  insert into public.evaluations (
    submission_id, transcription_id, model_name, suggested_score, feedback_summary,
    needs_teacher_review
  ) values (
    p_submission_id, v_transcription_id, btrim(p_model_name), p_suggested_score,
    nullif(btrim(p_feedback_summary), ''), coalesce(p_needs_teacher_review, true)
  ) returning id into v_evaluation_id;

  for v_item in select value from jsonb_array_elements(p_criteria)
  loop
    begin
      v_criterion_id := (v_item->>'criterion_id')::uuid;
      v_awarded := (v_item->>'awarded_points')::numeric;
    exception when others then
      raise exception 'Invalid criterion score payload';
    end;
    v_assessment := v_item->>'assessment';
    select rc.max_points into v_max_points
    from public.rubric_criteria rc
    where rc.id = v_criterion_id and rc.question_id = v_question_id;

    if v_max_points is null or v_awarded < 0 or v_awarded > v_max_points
      or v_assessment is null
      or v_assessment not in ('correct', 'partial', 'incorrect', 'missing') then
      raise exception 'Invalid criterion score';
    end if;

    v_sum := v_sum + v_awarded;
    insert into public.evaluation_criterion_scores (
      evaluation_id, criterion_id, awarded_points, assessment,
      evidence_excerpt, explanation
    ) values (
      v_evaluation_id, v_criterion_id, v_awarded, v_assessment,
      nullif(btrim(v_item->>'evidence_excerpt'), ''),
      nullif(btrim(v_item->>'explanation'), '')
    );
  end loop;

  if jsonb_array_length(p_criteria) > 0 and abs(v_sum - p_suggested_score) > 0.01 then
    raise exception 'Suggested score must equal the sum of criterion scores';
  end if;

  update public.submissions
  set status = 'ready', error_message = null, ai_processing_started_at = null
  where id = p_submission_id;

  return jsonb_build_object(
    'evaluation_id', v_evaluation_id,
    'transcription_id', v_transcription_id,
    'suggested_score', p_suggested_score
  );
end
$$;

create or replace function public.fail_submission_ai_processing(
  p_submission_id uuid,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() is distinct from 'student' then
    raise exception 'Student role required';
  end if;
  update public.submissions
  set status = 'failed', error_message = left(coalesce(p_error_message, 'AI processing failed'), 500),
      ai_processing_started_at = null
  where id = p_submission_id
    and student_id = (select auth.uid())
    and status = 'processing';
  return found;
end
$$;

create or replace function public.attach_latest_evaluation_to_grade_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.evaluation_id is null then
    select e.id into new.evaluation_id
    from public.evaluations e
    where e.submission_id = new.submission_id
    order by e.created_at desc
    limit 1;
  end if;
  return new;
end
$$;

drop trigger if exists attach_latest_evaluation_to_grade_review on public.grade_reviews;
create trigger attach_latest_evaluation_to_grade_review
  before insert or update on public.grade_reviews
  for each row execute function public.attach_latest_evaluation_to_grade_review();

revoke all on function public.claim_submission_for_ai(uuid) from public, anon;
revoke all on function public.get_submission_grading_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_own_assignment_submission(uuid) from public, anon;
revoke all on function public.save_submission_transcription(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.save_ai_evaluation(uuid, uuid, text, text, text, text, numeric, text, jsonb, boolean, boolean) from public, anon, authenticated;
revoke all on function public.fail_submission_ai_processing(uuid, text) from public, anon;
grant execute on function public.claim_submission_for_ai(uuid) to authenticated;
grant execute on function public.get_submission_grading_context(uuid, uuid) to service_role;
grant execute on function public.get_own_assignment_submission(uuid) to authenticated;
grant execute on function public.save_submission_transcription(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.save_ai_evaluation(uuid, uuid, text, text, text, text, numeric, text, jsonb, boolean, boolean) to service_role;
grant execute on function public.fail_submission_ai_processing(uuid, text) to authenticated;

commit;
