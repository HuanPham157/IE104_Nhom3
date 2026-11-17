-- 006: Tính năng làm bài vấn đáp — dùng các hàm dùng chung trong supabase/seed.sql.
--   Phần 1. Bắt đầu có đồng hồ, nhiều phiên bản ghi âm mỗi câu, chọn 1 bản để nộp
--   Phần 2. Barem chấm điểm chung cho bài tập (bảng riêng, sinh viên không đọc được)
--   Phần 3. Vòng đời chấm AI cho sinh viên và giảng viên (dùng chung lõi trong seed.sql)
--   Phần 4. Công bố điểm: tự nộp lượt hết giờ, báo rõ lý do chưa công bố được, gửi thông báo cho sinh viên
-- Chạy SAU supabase/seed.sql.

begin;

-- Báo lỗi rõ ràng nếu chưa chạy seed.sql (RLS policy bên dưới tham chiếu hàm dùng chung).
do $$
begin
  if to_regprocedure('public.can_manage_assignment(uuid)') is null
    or to_regprocedure('public.start_answer_ai_processing(uuid)') is null
    or to_regprocedure('public.finalize_expired_attempts(uuid)') is null then
    raise exception 'Hãy chạy supabase/seed.sql (hàm dùng chung) trước migration 006';
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Phần 1. Làm bài: bắt đầu có đồng hồ, nhiều phiên bản ghi âm, chọn 1 bản để nộp
-- ---------------------------------------------------------------------

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

-- Lưu transcript Whisper cho mọi phiên bản khi lượt làm còn mở (không chỉ bản is_final).
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
  perform public.require_app_role('student');
  if not exists (
    select 1 from public.submissions s
    join public.assignment_submissions ats on ats.id = s.assignment_submission_id
    where s.id = p_submission_id
      and s.student_id = (select auth.uid())
      and s.status = 'processing'
      and (ats.status = 'in_progress' or (s.is_final = true and ats.status = 'processing'))
  ) then
    raise exception 'Submission not available for transcription';
  end if;
  if nullif(btrim(p_transcript_text), '') is null
    or char_length(p_transcript_text) > 50000
    or nullif(btrim(p_engine_name), '') is null
    or char_length(p_engine_name) > 100 then
    raise exception 'Invalid transcript data';
  end if;

  insert into public.transcriptions (submission_id, transcript_text, engine_name, language_code, is_edited, edited_by)
  values (
    p_submission_id, btrim(p_transcript_text), btrim(p_engine_name),
    nullif(btrim(p_language_code), ''), coalesce(p_is_edited, false),
    case when coalesce(p_is_edited, false) then (select auth.uid()) else null end
  ) returning id into v_transcription_id;

  update public.submissions set status = 'queued', ai_processing_started_at = null where id = p_submission_id;
  return v_transcription_id;
end
$$;

-- Toàn bộ phiên bản ghi âm của sinh viên trong một bài tập (kể cả bản không được chọn).
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
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  where ats.assignment_id = p_assignment_id
    and ats.student_id = (select auth.uid())
    and s.student_id = (select auth.uid());
  return v_result;
end
$$;

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

-- ---------------------------------------------------------------------
-- Phần 2. Barem chấm điểm chung cho bài tập (bảng riêng để sinh viên không đọc được)
-- ---------------------------------------------------------------------

create table if not exists public.assignment_grading_guides (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  guide_text text not null check (char_length(guide_text) between 1 and 20000),
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.assignment_grading_guides enable row level security;
revoke all on public.assignment_grading_guides from public, anon, authenticated;
grant select on public.assignment_grading_guides to authenticated;

drop policy if exists "grading guides visible to assignment lecturer and admin" on public.assignment_grading_guides;
create policy "grading guides visible to assignment lecturer and admin" on public.assignment_grading_guides
  for select to authenticated
  using (public.can_manage_assignment(assignment_id));

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

-- ---------------------------------------------------------------------
-- Phần 3. Vòng đời chấm AI — sinh viên và giảng viên dùng chung lõi trong seed.sql
-- ---------------------------------------------------------------------

-- Sinh viên nhận câu trả lời của mình để nhận dạng/chấm AI (thay bản ở migration 004, hành vi giữ nguyên).
create or replace function public.claim_submission_for_ai(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_app_role('student');
  if not exists (
    select 1 from public.submissions s
    join public.assignment_submissions ats on ats.id = s.assignment_submission_id
    where s.id = p_submission_id
      and s.student_id = (select auth.uid())
      and ats.status in ('in_progress', 'submitted', 'processing')
  ) then
    return false;
  end if;
  return public.start_answer_ai_processing(p_submission_id) is not null;
end
$$;

create or replace function public.fail_submission_ai_processing(p_submission_id uuid, p_error_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_app_role('student');
  if not exists (select 1 from public.submissions where id = p_submission_id and student_id = (select auth.uid())) then
    return false;
  end if;
  return public.mark_answer_ai_failed(p_submission_id, p_error_message);
end
$$;

-- Giảng viên kích hoạt chấm AI cho câu đã nộp mà chưa được chấm; trả về student_id cho các RPC service_role.
create or replace function public.claim_submission_for_lecturer_ai(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
begin
  perform public.require_app_role('lecturer', 'admin');

  select s.student_id into v_student_id
  from public.submissions s
  join public.assignment_submissions ats on ats.id = s.assignment_submission_id
  join public.assignments a on a.id = ats.assignment_id
  where s.id = p_submission_id
    and s.is_final = true
    and public.can_manage_assignment(a.id)
    and a.results_published_at is null
    and ats.status in ('submitted', 'processing');

  if v_student_id is null or public.start_answer_ai_processing(p_submission_id) is null then
    raise exception 'Answer not available for AI grading';
  end if;
  return v_student_id;
end
$$;

create or replace function public.fail_lecturer_ai_processing(p_submission_id uuid, p_error_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_app_role('lecturer', 'admin');
  if not exists (
    select 1 from public.submissions s
    join public.assignment_submissions ats on ats.id = s.assignment_submission_id
    where s.id = p_submission_id and public.can_manage_assignment(ats.assignment_id)
  ) then
    return false;
  end if;
  return public.mark_answer_ai_failed(p_submission_id, p_error_message);
end
$$;

-- ---------------------------------------------------------------------
-- Phần 4. Công bố điểm chính thức
-- ---------------------------------------------------------------------

-- Đổi kiểu trả về (timestamptz → jsonb) nên phải drop bản cũ của migration 002.
drop function if exists public.publish_assignment_results(uuid);

-- Không ném lỗi khi chưa đủ điều kiện mà trả về lý do, để các lượt vừa được tự nộp vẫn được lưu lại.
-- Kết quả: { published, results_published_at, auto_submitted, ungraded, in_progress, notified }
create function public.publish_assignment_results(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_status text;
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

  select title, status into v_title, v_status from public.assignments where id = p_assignment_id for update;
  if v_status not in ('published', 'closed', 'archived') then
    raise exception 'Assignment must be published before results';
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
         'Giảng viên đã công bố điểm bài "' || v_title || '": ' || coalesce(ats.total_score::text, '0') || ' điểm.',
         'grade_published', 'assignment', p_assignment_id
  from public.assignment_submissions ats
  where ats.assignment_id = p_assignment_id
    and ats.status = 'graded'
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

-- ---------------------------------------------------------------------
-- Quyền thực thi
-- ---------------------------------------------------------------------

-- RPC nghiệp vụ cho client đã đăng nhập (vai trò được kiểm tra bên trong từng hàm).
revoke all on function public.get_own_answer_versions(uuid) from public, anon;
revoke all on function public.select_final_answer_version(uuid) from public, anon;
revoke all on function public.set_assignment_duration(uuid, integer) from public, anon;
revoke all on function public.set_assignment_grading_guide(uuid, text) from public, anon;
revoke all on function public.claim_submission_for_lecturer_ai(uuid) from public, anon;
revoke all on function public.fail_lecturer_ai_processing(uuid, text) from public, anon;
revoke all on function public.publish_assignment_results(uuid) from public, anon;
grant execute on function public.get_own_answer_versions(uuid) to authenticated;
grant execute on function public.select_final_answer_version(uuid) to authenticated;
grant execute on function public.set_assignment_duration(uuid, integer) to authenticated;
grant execute on function public.set_assignment_grading_guide(uuid, text) to authenticated;
grant execute on function public.claim_submission_for_lecturer_ai(uuid) to authenticated;
grant execute on function public.fail_lecturer_ai_processing(uuid, text) to authenticated;
grant execute on function public.publish_assignment_results(uuid) to authenticated;

revoke all on function public.get_submission_grading_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_submission_grading_context(uuid, uuid) to service_role;

commit;
