-- =====================================================================
-- 08_submissions.sql — LÀM BÀI CỦA SINH VIÊN
--
-- Bắt đầu lượt (đặt hạn giờ), làm lại, ghi nhận bản ghi âm, chọn bản nộp, sửa transcript trước khi nộp,
-- nộp bài, đọc tiến độ và trạng thái làm lại của chính mình.
-- =====================================================================

begin;

-- Bắt đầu làm bài: trả lượt đang làm; lượt đầu tiên thì tạo mới; đã nộp thì phải dùng start_assignment_retake.
create or replace function public.start_assignment_submission(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.assignment_submissions;
begin
  if not public.student_can_take_assignment(p_assignment_id) then
    raise exception 'Assignment is unavailable to this student';
  end if;

  select * into v_attempt
  from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = (select auth.uid())
  order by (status = 'in_progress') desc, attempt_no desc
  limit 1
  for update;

  if found then
    if v_attempt.status <> 'in_progress' then
      raise exception 'Submission has already been finalized';
    end if;
    return v_attempt.id;
  end if;

  insert into public.assignment_submissions (assignment_id, student_id, status, attempt_no)
  values (p_assignment_id, (select auth.uid()), 'in_progress', 1)
  on conflict (assignment_id, student_id, attempt_no) do nothing;

  select * into v_attempt
  from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = (select auth.uid()) and attempt_no = 1;
  if v_attempt.status <> 'in_progress' then
    raise exception 'Submission has already been finalized';
  end if;
  return v_attempt.id;
end
$$;

revoke all on function public.start_assignment_submission(uuid) from public, anon;
grant execute on function public.start_assignment_submission(uuid) to authenticated;

-- Ghi nhận một phiên bản ghi âm (tối đa 5 bản/câu, chặn sau khi hết giờ); bản mới nhất mặc định là bản nộp.
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
  v_deadline_at timestamptz;
  v_submission_id uuid;
  v_attempt_number integer;
begin
  perform public.require_app_role('student');

  select assignment_id, deadline_at into v_assignment_id, v_deadline_at
  from public.assignment_submissions
  where id = p_assignment_submission_id
    and student_id = (select auth.uid())
    and status = 'in_progress'
  for update;

  if not found or not exists (
    select 1 from public.questions q where q.assignment_id = v_assignment_id and q.id = p_question_id
  ) then
    raise exception 'Question or active submission not found';
  end if;
  if not public.is_within_exam_time(v_deadline_at) then
    raise exception 'Exam time is over';
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
    where bucket_id = 'oral-answers' and name = p_audio_storage_path and owner_id = (select auth.uid())::text
  ) then
    raise exception 'Uploaded audio object not found';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.submissions
  where assignment_submission_id = p_assignment_submission_id and question_id = p_question_id;
  if v_attempt_number > 5 then
    raise exception 'Version limit reached';
  end if;

  update public.submissions
  set is_final = false
  where assignment_submission_id = p_assignment_submission_id and question_id = p_question_id and is_final = true;

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

revoke all on function public.record_submission_answer(uuid, uuid, text, text, bigint, integer) from public, anon;
grant execute on function public.record_submission_answer(uuid, uuid, text, text, bigint, integer) to authenticated;

create or replace function public.finalize_assignment_submission(p_assignment_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_id uuid;
  v_deadline_at timestamptz;
begin
  select assignment_id, deadline_at into v_assignment_id, v_deadline_at
  from public.assignment_submissions
  where id = p_assignment_submission_id
    and student_id = (select auth.uid())
    and status = 'in_progress'
  for update;

  if not found or public.current_app_role() is distinct from 'student' then
    raise exception 'Active submission not found';
  end if;

  if (v_deadline_at is null or v_deadline_at > now()) and exists (
    select 1 from public.questions q
    where q.assignment_id = v_assignment_id
      and not exists (
        select 1 from public.submissions s
        where s.assignment_submission_id = p_assignment_submission_id
          and s.question_id = q.id and s.is_final = true
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

revoke all on function public.finalize_assignment_submission(uuid) from public, anon;
grant execute on function public.finalize_assignment_submission(uuid) to authenticated;

-- Tiến độ của sinh viên: chỉ lượt hiện tại (đang làm hoặc gần nhất), kèm attempt_no.
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
    'attempt_no', ats.attempt_no,
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
          when ats.status <> 'in_progress' and a.show_reference_answer then (
            select nullif(btrim(q.reference_answer), '') from public.questions q where q.id = s.question_id
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
  join public.assignments a on a.id = ats.assignment_id
  where ats.id = public.current_attempt_id(p_assignment_id, (select auth.uid()));
  return v_result;
end
$$;

revoke all on function public.get_own_assignment_submission(uuid) from public, anon;
grant execute on function public.get_own_assignment_submission(uuid) to authenticated;

-- Deadline lượt làm = bắt đầu + thời lượng GV đặt (không đặt thì = tổng thời gian các câu), không vượt hạn chót bài.
create or replace function public.set_assignment_exam_deadline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minutes numeric;
  v_ends_at timestamptz;
  v_started timestamptz := coalesce(new.started_at, now());
begin
  if new.deadline_at is null then
    select coalesce(
             a.duration_minutes::numeric,
             (select sum(q.time_limit_seconds) / 60.0 from public.questions q where q.assignment_id = a.id)
           ),
           a.ends_at
      into v_minutes, v_ends_at
    from public.assignments a where a.id = new.assignment_id;

    if v_minutes is not null then
      new.deadline_at := v_started + make_interval(secs => ceil(v_minutes * 60)::integer);
    end if;
    if v_ends_at is not null and (new.deadline_at is null or v_ends_at < new.deadline_at) then
      new.deadline_at := v_ends_at;
    end if;
  end if;
  return new;
end
$$;

-- Các phiên bản ghi âm của sinh viên trong lượt hiện tại.
create or replace function public.get_own_answer_versions(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.require_app_role('student');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'question_id', s.question_id,
    'attempt_number', s.attempt_number,
    'is_final', s.is_final,
    'status', s.status,
    'submitted_at', s.submitted_at,
    'audio_duration_seconds', s.audio_duration_seconds,
    'audio_storage_path', s.audio_storage_path,
    'transcript', public.latest_transcript(s.id),
    'original_transcript', public.first_transcript(s.id)
  ) order by s.question_id, s.attempt_number), '[]'::jsonb)
  into v_result
  from public.submissions s
  where s.assignment_submission_id = public.current_attempt_id(p_assignment_id, (select auth.uid()))
    and s.student_id = (select auth.uid());
  return v_result;
end
$$;

revoke all on function public.get_own_answer_versions(uuid) from public, anon;
grant execute on function public.get_own_answer_versions(uuid) to authenticated;

-- Chọn một phiên bản làm bản nộp chính thức (chỉ khi lượt làm còn mở và còn giờ).
create or replace function public.select_final_answer_version(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_question_id uuid;
begin
  perform public.require_app_role('student');

  select s.assignment_submission_id, s.question_id into v_attempt_id, v_question_id
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  where s.id = p_submission_id
    and s.student_id = (select auth.uid())
    and ats.status = 'in_progress'
    and public.is_within_exam_time(ats.deadline_at)
  for update of ats;

  if v_attempt_id is null then
    raise exception 'Answer version not found or attempt closed';
  end if;

  update public.submissions
  set is_final = false
  where assignment_submission_id = v_attempt_id and question_id = v_question_id and is_final = true and id <> p_submission_id;
  update public.submissions set is_final = true where id = p_submission_id;
  return p_submission_id;
end
$$;

revoke all on function public.select_final_answer_version(uuid) from public, anon;
grant execute on function public.select_final_answer_version(uuid) to authenticated;

create or replace function public.start_assignment_retake(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last public.assignment_submissions;
  v_max integer;
  v_used integer;
  v_new_id uuid;
begin
  if not public.student_can_take_assignment(p_assignment_id) then
    raise exception 'Assignment is unavailable to this student';
  end if;

  -- Khóa các lượt của sinh viên để hai yêu cầu đồng thời không tạo hai lượt.
  perform 1 from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = (select auth.uid())
  for update;

  select * into v_last
  from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = (select auth.uid())
  order by (status = 'in_progress') desc, attempt_no desc
  limit 1;
  if not found then
    raise exception 'No previous attempt to retake';
  end if;
  if v_last.status = 'in_progress' then
    return v_last.id;
  end if;

  select max_attempts into v_max from public.assignments where id = p_assignment_id;
  select count(*) into v_used
  from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = (select auth.uid());
  if v_used >= v_max then
    raise exception 'Attempt limit reached';
  end if;
  if not public.attempt_has_score(v_last.id) then
    raise exception 'Previous attempt has no score yet';
  end if;

  insert into public.assignment_submissions (assignment_id, student_id, status, attempt_no)
  values (p_assignment_id, (select auth.uid()), 'in_progress', v_used + 1)
  returning id into v_new_id;
  return v_new_id;
end
$$;

revoke all on function public.start_assignment_retake(uuid) from public, anon;
grant execute on function public.start_assignment_retake(uuid) to authenticated;

-- Tình trạng làm lại của sinh viên đang đăng nhập (để giao diện hiện nút "Làm lại" và lý do).
create or replace function public.get_retake_status(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_assignment public.assignments;
  v_current public.assignment_submissions;
  v_used integer;
  v_best public.assignment_submissions;
  v_reason text;
begin
  perform public.require_app_role('student');
  select * into v_assignment from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found';
  end if;

  select count(*) into v_used
  from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = (select auth.uid());
  select * into v_current from public.assignment_submissions
  where id = public.current_attempt_id(p_assignment_id, (select auth.uid()));
  select * into v_best from public.assignment_submissions
  where id = public.best_attempt_id(p_assignment_id, (select auth.uid()));

  v_reason := case
    when v_used = 0 then 'not_started'
    when v_current.status = 'in_progress' then 'in_progress'
    when v_used >= v_assignment.max_attempts then 'max_reached'
    when not public.student_can_take_assignment(p_assignment_id) then 'closed'
    when not public.attempt_has_score(v_current.id) then 'awaiting_score'
    else null
  end;

  return jsonb_build_object(
    'max_attempts', v_assignment.max_attempts,
    'attempts_used', v_used,
    'current_attempt_no', coalesce(v_current.attempt_no, 0),
    'can_retake', v_reason is null,
    'reason', v_reason,
    -- Điểm chính thức chỉ lộ ra khi giảng viên đã công bố.
    'best_attempt_no', case when v_assignment.results_published_at is not null then v_best.attempt_no end,
    'best_score', case when v_assignment.results_published_at is not null then v_best.total_score end
  );
end
$$;

revoke all on function public.get_retake_status(uuid) from public, anon;
grant execute on function public.get_retake_status(uuid) to authenticated;

create or replace function public.save_student_transcript_edit(p_submission_id uuid, p_transcript_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transcription_id uuid;
begin
  perform public.require_app_role('student');
  if not exists (
    select 1 from public.submissions s
    join public.assignment_submissions ats on ats.id = s.assignment_submission_id
    where s.id = p_submission_id
      and s.student_id = (select auth.uid())
      and s.status in ('queued', 'failed')
      and ats.status = 'in_progress'
  ) then
    raise exception 'Submission not available for transcript editing';
  end if;
  if nullif(btrim(p_transcript_text), '') is null or char_length(p_transcript_text) > 50000 then
    raise exception 'Invalid transcript data';
  end if;

  -- Không ghi bản trùng với transcript mới nhất.
  if exists (
    select 1 from public.transcriptions t
    where t.submission_id = p_submission_id
      and t.created_at = (select max(t2.created_at) from public.transcriptions t2 where t2.submission_id = p_submission_id)
      and t.transcript_text = btrim(p_transcript_text)
  ) then
    return null;
  end if;

  insert into public.transcriptions (submission_id, transcript_text, engine_name, language_code, is_edited, edited_by)
  values (p_submission_id, btrim(p_transcript_text), 'student-edit', 'vi', true, (select auth.uid()))
  returning id into v_transcription_id;

  -- Đã có transcript (tự gõ) thì câu trả lời sẵn sàng để chấm, kể cả khi ASR trước đó lỗi.
  update public.submissions set status = 'queued', error_message = null
  where id = p_submission_id and status = 'failed';
  return v_transcription_id;
end
$$;

revoke all on function public.save_student_transcript_edit(uuid, text) from public, anon;
grant execute on function public.save_student_transcript_edit(uuid, text) to authenticated;

drop trigger if exists set_assignment_exam_deadline on public.assignment_submissions;
create trigger set_assignment_exam_deadline
  before insert on public.assignment_submissions
  for each row execute function public.set_assignment_exam_deadline();

commit;
