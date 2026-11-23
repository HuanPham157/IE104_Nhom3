-- =====================================================================
-- 09_grading.sql — CHẤM ĐIỂM
--
-- Hàng đợi xử lý (backend kiểm tra quyền rồi gửi job), các bước của worker (chỉ service_role):
-- ASR → ngữ cảnh chấm → lưu đánh giá AI; giảng viên sửa transcript, duyệt / sửa điểm, công bố điểm sau hạn nộp.
-- Lưu ý: pg-boss tự tạo schema "pgboss" trong cùng database khi backend khởi động lần đầu.
-- =====================================================================

begin;

-- Giảng viên duyệt / sửa điểm một câu trả lời. Duyệt được cả lượt nộp sau khi đã công bố điểm;
-- khi lượt đó thành điểm chính thức mới (cao hơn) thì báo cho sinh viên.
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
  v_student_id uuid;
  v_max_score numeric;
  v_title text;
  v_results_published_at timestamptz;
  v_previous_best numeric;
  v_grade_review public.grade_reviews;
  v_total_questions integer;
  v_reviewed_questions integer;
  v_new_total numeric;
  v_new_status text;
begin
  if public.current_app_role() is distinct from 'lecturer'
    and public.current_app_role() is distinct from 'admin' then
    raise exception 'Lecturer or admin role required';
  end if;

  select ats.assignment_id, ats.id, ats.student_id, q.max_score, a.title, a.results_published_at
  into v_assignment_id, v_parent_id, v_student_id, v_max_score, v_title, v_results_published_at
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  join public.assignments a on a.id = ats.assignment_id
  join public.questions q on q.id = s.question_id
  where s.id = p_submission_id
    and (
      public.current_app_role() = 'admin'
      or a.lecturer_id = (select auth.uid())
    )
    and (a.results_published_at is null or ats.submitted_at > a.results_published_at)
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

  select total_score into v_previous_best
  from public.assignment_submissions
  where id = public.best_attempt_id(v_assignment_id, v_student_id);

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
  where id = v_parent_id
  returning total_score, status into v_new_total, v_new_status;

  -- Đã công bố điểm và lượt này vừa trở thành điểm chính thức cao hơn → báo sinh viên.
  if v_results_published_at is not null
    and v_new_status = 'graded'
    and public.best_attempt_id(v_assignment_id, v_student_id) = v_parent_id
    and (v_previous_best is null or v_new_total > v_previous_best) then
    insert into public.notifications (user_id, title, message, notification_type, related_entity_type, related_entity_id)
    values (
      v_student_id,
      'Điểm chính thức được cập nhật',
      'Lượt làm lại bài "' || v_title || '" đạt ' || v_new_total::text || ' điểm và được tính là điểm chính thức.',
      'grade_published', 'assignment', v_assignment_id
    );
  end if;

  return jsonb_build_object(
    'grade_review', to_jsonb(v_grade_review),
    'assignment_submission_id', v_parent_id,
    'total_score', v_new_total
  );
end
$$;

revoke all on function public.review_submission(uuid, numeric, text, boolean) from public, anon;
grant execute on function public.review_submission(uuid, numeric, text, boolean) to authenticated;

create or replace function public.publish_assignment_results(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_status text;
  v_ends_at timestamptz;
  v_published_at timestamptz;
  v_auto_submitted integer;
  v_ungraded integer;
  v_in_progress integer;
  v_notified integer;
begin
  perform public.require_app_role('lecturer', 'admin');
  if not public.can_manage_assignment(p_assignment_id) then
    raise exception 'Assignment not found or forbidden';
  end if;

  select title, status, ends_at into v_title, v_status, v_ends_at from public.assignments where id = p_assignment_id for update;
  if v_status not in ('published', 'closed', 'archived') then
    raise exception 'Assignment must be published before results';
  end if;
  -- Chỉ công bố sau hạn nộp: trước đó sinh viên còn có thể làm / làm lại. Bài không đặt hạn thì công bố lúc nào cũng được.
  if v_ends_at is not null and v_ends_at > now() then
    return jsonb_build_object(
      'published', false, 'before_deadline', true, 'ends_at', v_ends_at,
      'auto_submitted', 0, 'ungraded', 0, 'in_progress', 0
    );
  end if;

  v_auto_submitted := public.finalize_expired_attempts(p_assignment_id);

  -- Lượt đã nộp mà chưa duyệt đủ mọi câu; lượt đang làm dở (có câu trả lời, còn giờ). Lượt trống không chặn.
  select count(*) filter (where ats.status in ('submitted', 'processing')),
         count(*) filter (where ats.status = 'in_progress'
                            and exists (select 1 from public.submissions s where s.assignment_submission_id = ats.id and s.is_final = true))
    into v_ungraded, v_in_progress
  from public.assignment_submissions ats
  where ats.assignment_id = p_assignment_id;

  if v_ungraded > 0 or v_in_progress > 0 then
    return jsonb_build_object(
      'published', false, 'auto_submitted', v_auto_submitted,
      'ungraded', v_ungraded, 'in_progress', v_in_progress
    );
  end if;

  update public.assignments
  set results_published_at = coalesce(results_published_at, now()), updated_at = now()
  where id = p_assignment_id
  returning results_published_at into v_published_at;

  insert into public.notifications (user_id, title, message, notification_type, related_entity_type, related_entity_id)
  select ats.student_id,
         'Đã có điểm chính thức',
         'Giảng viên đã công bố điểm bài "' || v_title || '": ' || coalesce(ats.total_score::text, '0') || ' điểm'
           || case when ats.attempt_no > 1 or exists (
                select 1 from public.assignment_submissions other
                where other.assignment_id = ats.assignment_id and other.student_id = ats.student_id and other.id <> ats.id
              ) then ' (lượt cao nhất).' else '.' end,
         'grade_published', 'assignment', p_assignment_id
  from public.assignment_submissions ats
  where ats.assignment_id = p_assignment_id
    and ats.id = public.best_attempt_id(ats.assignment_id, ats.student_id)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = ats.student_id and n.notification_type = 'grade_published'
        and n.related_entity_type = 'assignment' and n.related_entity_id = p_assignment_id
    );
  get diagnostics v_notified = row_count;

  return jsonb_build_object(
    'published', true, 'results_published_at', v_published_at, 'auto_submitted', v_auto_submitted,
    'ungraded', 0, 'in_progress', 0, 'notified', v_notified
  );
end
$$;

revoke all on function public.publish_assignment_results(uuid) from public, anon;
grant execute on function public.publish_assignment_results(uuid) to authenticated;

-- Ngữ cảnh chấm AI (chỉ service_role): bổ sung số thứ tự câu và barem chung.
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
    'position', q.position,
    'question', q.content,
    'reference_answer', q.reference_answer,
    'max_score', q.max_score,
    'grading_guide', (select g.guide_text from public.assignment_grading_guides g where g.assignment_id = q.assignment_id),
    'criteria', coalesce((
      select jsonb_agg(jsonb_build_object('id', rc.id, 'text', rc.criterion_text, 'max_points', rc.max_points) order by rc.position)
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

revoke all on function public.get_submission_grading_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_submission_grading_context(uuid, uuid) to service_role;

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

revoke all on function public.save_ai_evaluation(uuid, uuid, text, text, text, text, numeric, text, jsonb, boolean, boolean) from public, anon, authenticated;
grant execute on function public.save_ai_evaluation(uuid, uuid, text, text, text, text, numeric, text, jsonb, boolean, boolean) to service_role;

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

create or replace function public.save_lecturer_transcription(
  p_submission_id uuid,
  p_transcript_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_status text;
  v_transcription_id uuid;
begin
  perform public.require_app_role('lecturer', 'admin');

  select ats.status into v_attempt_status
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  join public.assignments a on a.id = ats.assignment_id
  where s.id = p_submission_id
    and s.is_final = true
    and public.can_manage_assignment(a.id)
    and a.results_published_at is null
    and ats.status in ('submitted', 'processing', 'graded');

  if v_attempt_status is null then
    raise exception 'Answer not available for transcript editing';
  end if;
  if nullif(btrim(p_transcript_text), '') is null or char_length(p_transcript_text) > 50000 then
    raise exception 'Invalid transcript data';
  end if;

  insert into public.transcriptions (
    submission_id, transcript_text, engine_name, language_code, is_edited, edited_by
  ) values (
    p_submission_id, btrim(p_transcript_text), 'lecturer-edit', 'vi', true, (select auth.uid())
  ) returning id into v_transcription_id;

  -- Cho phép chấm lại bằng AI với transcript mới (khi lượt làm chưa được duyệt xong).
  if v_attempt_status in ('submitted', 'processing') then
    update public.submissions
    set status = 'queued', error_message = null, ai_processing_started_at = null
    where id = p_submission_id
      and status in ('ready', 'failed');
  end if;

  return v_transcription_id;
end
$$;

revoke all on function public.save_lecturer_transcription(uuid, text) from public, anon;
grant execute on function public.save_lecturer_transcription(uuid, text) to authenticated;

create or replace function public.can_enqueue_answer_job(p_submission_id uuid, p_kind text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_app_role();
begin
  if p_kind not in ('transcribe', 'grade') then
    return false;
  end if;

  return exists (
    select 1
    from public.submissions s
    join public.assignment_submissions ats on ats.id = s.assignment_submission_id
    join public.assignments a on a.id = ats.assignment_id
    where s.id = p_submission_id
      -- Chỉ khi câu trả lời đang rảnh (hoặc bị treo quá 10 phút).
      and (
        s.status in ('queued', 'failed')
        or (s.status = 'processing' and coalesce(s.ai_processing_started_at, s.submitted_at) < now() - interval '10 minutes')
      )
      and (
        -- Sinh viên: chính câu trả lời của mình.
        (v_role = 'student' and s.student_id = (select auth.uid()) and (
          (p_kind = 'transcribe' and ats.status in ('in_progress', 'submitted', 'processing'))
          or (p_kind = 'grade' and s.is_final = true and ats.status in ('submitted', 'processing'))
        ))
        -- Giảng viên / admin: chấm lại bằng AI câu trả lời đã nộp của lớp mình phụ trách, khi chưa công bố điểm lượt đó.
        or (v_role in ('lecturer', 'admin') and p_kind = 'grade'
          and s.is_final = true
          and public.can_manage_assignment(a.id)
          and (a.results_published_at is null or ats.submitted_at > a.results_published_at)
          and ats.status in ('submitted', 'processing'))
      )
  );
end
$$;

revoke all on function public.can_enqueue_answer_job(uuid, text) from public, anon;
grant execute on function public.can_enqueue_answer_job(uuid, text) to authenticated;

create or replace function public.worker_claim_answer(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Internal worker role required';
  end if;
  if public.start_answer_ai_processing(p_submission_id) is null then
    return null;
  end if;
  select student_id into v_student_id from public.submissions where id = p_submission_id;
  return v_student_id;
end
$$;

revoke all on function public.worker_claim_answer(uuid) from public, anon, authenticated;
grant execute on function public.worker_claim_answer(uuid) to service_role;

create or replace function public.worker_save_transcription(
  p_submission_id uuid,
  p_transcript_text text,
  p_engine_name text,
  p_language_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transcription_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Internal worker role required';
  end if;
  if not exists (select 1 from public.submissions where id = p_submission_id and status = 'processing') then
    raise exception 'Submission not available for transcription';
  end if;
  if nullif(btrim(p_transcript_text), '') is null
    or char_length(p_transcript_text) > 50000
    or nullif(btrim(p_engine_name), '') is null
    or char_length(p_engine_name) > 100 then
    raise exception 'Invalid transcript data';
  end if;

  insert into public.transcriptions (submission_id, transcript_text, engine_name, language_code, is_edited, edited_by)
  values (p_submission_id, btrim(p_transcript_text), btrim(p_engine_name), nullif(btrim(p_language_code), ''), false, null)
  returning id into v_transcription_id;

  -- Trả về trạng thái "chờ chấm"; nếu job có yêu cầu chấm, worker sẽ claim lại.
  update public.submissions set status = 'queued', ai_processing_started_at = null where id = p_submission_id;
  return v_transcription_id;
end
$$;

revoke all on function public.worker_save_transcription(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.worker_save_transcription(uuid, text, text, text) to service_role;

create or replace function public.worker_fail_answer(p_submission_id uuid, p_error_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Internal worker role required';
  end if;
  return public.mark_answer_ai_failed(p_submission_id, p_error_message);
end
$$;

revoke all on function public.worker_fail_answer(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_fail_answer(uuid, text) to service_role;

drop trigger if exists attach_latest_evaluation_to_grade_review on public.grade_reviews;
create trigger attach_latest_evaluation_to_grade_review
  before insert or update on public.grade_reviews
  for each row execute function public.attach_latest_evaluation_to_grade_review();

commit;
