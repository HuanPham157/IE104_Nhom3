-- 009: Làm lại cả bài nhiều lần.
--   - assignments.max_attempts: giảng viên đặt 1–5 (mặc định 1 = như trước).
--   - Mỗi lượt làm là một dòng assignment_submissions (attempt_no 1, 2, …); mỗi lúc tối đa một lượt đang làm.
--   - Được làm lại khi: còn lượt, bài còn trong hạn nộp, và lượt trước đã có điểm
--     (AI đã chấm xong mọi câu, hoặc giảng viên đã duyệt / công bố điểm).
--   - Điểm chính thức = lượt cao nhất đã được giảng viên duyệt. Lượt làm lại sau khi đã công bố điểm
--     vẫn được giảng viên duyệt; nếu cao hơn thì điểm chính thức tự cập nhật và sinh viên nhận thông báo.
-- Chạy SAU migration 008. Chạy lại nhiều lần vẫn an toàn.

begin;

-- ---------------------------------------------------------------------
-- Phần 1. Cấu trúc
-- ---------------------------------------------------------------------

alter table public.assignments add column if not exists max_attempts integer not null default 1;
alter table public.assignments drop constraint if exists assignments_max_attempts_check;
alter table public.assignments add constraint assignments_max_attempts_check check (max_attempts between 1 and 5);

alter table public.assignment_submissions add column if not exists attempt_no integer not null default 1;
alter table public.assignment_submissions drop constraint if exists assignment_submissions_attempt_no_check;
alter table public.assignment_submissions add constraint assignment_submissions_attempt_no_check check (attempt_no between 1 and 5);
-- Bỏ ràng buộc "mỗi sinh viên một lượt" của migration 001, thay bằng "mỗi lượt một số thứ tự".
alter table public.assignment_submissions drop constraint if exists assignment_submissions_assignment_id_student_id_key;
alter table public.assignment_submissions drop constraint if exists assignment_submissions_attempt_key;
alter table public.assignment_submissions add constraint assignment_submissions_attempt_key unique (assignment_id, student_id, attempt_no);
create unique index if not exists uq_assignment_submissions_one_in_progress
  on public.assignment_submissions (assignment_id, student_id) where status = 'in_progress';
grant select (attempt_no) on public.assignment_submissions to authenticated;

-- ---------------------------------------------------------------------
-- Phần 2. Hàm dùng chung
-- ---------------------------------------------------------------------

-- Lượt đang làm nếu có, nếu không thì lượt gần nhất.
create or replace function public.current_attempt_id(p_assignment_id uuid, p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = p_student_id
  order by (status = 'in_progress') desc, attempt_no desc
  limit 1
$$;

-- Lượt được tính điểm chính thức: điểm giảng viên duyệt cao nhất (bằng nhau thì lấy lượt sớm hơn).
create or replace function public.best_attempt_id(p_assignment_id uuid, p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.assignment_submissions
  where assignment_id = p_assignment_id and student_id = p_student_id and status = 'graded'
  order by total_score desc nulls last, attempt_no asc
  limit 1
$$;

-- Lượt đã nộp và đã có điểm: giảng viên đã duyệt/công bố, hoặc AI đã chấm xong mọi câu được nộp.
create or replace function public.attempt_has_score(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignment_submissions ats
    join public.assignments a on a.id = ats.assignment_id
    where ats.id = p_attempt_id
      and ats.status <> 'in_progress'
      and (
        ats.status = 'graded'
        or a.results_published_at is not null
        or (
          exists (select 1 from public.submissions s where s.assignment_submission_id = ats.id and s.is_final)
          and not exists (
            select 1 from public.submissions s
            where s.assignment_submission_id = ats.id and s.is_final
              and not exists (select 1 from public.evaluations e where e.submission_id = s.id)
          )
        )
      )
  )
$$;

-- Sinh viên đang đăng nhập được làm bài lúc này: thuộc lớp đang hoạt động, bài đã công bố và trong thời gian mở.
create or replace function public.student_can_take_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_app_role() = 'student' and exists (
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
  )
$$;

-- ---------------------------------------------------------------------
-- Phần 3. Bắt đầu / làm lại
-- ---------------------------------------------------------------------

-- Thay bản ở migration 002: trả lượt đang làm; lượt đầu tiên thì tạo mới; đã nộp thì phải dùng start_assignment_retake.
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

-- ---------------------------------------------------------------------
-- Phần 4. Đọc tiến độ của sinh viên theo lượt hiện tại
-- ---------------------------------------------------------------------

-- Thay bản ở migration 007: chỉ lượt hiện tại (đang làm hoặc gần nhất), kèm attempt_no.
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

-- Thay bản ở migration 006: chỉ các phiên bản ghi âm của lượt hiện tại.
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

-- Kết quả đã công bố của sinh viên: thêm số lượt và lượt nào được tính điểm chính thức.
create or replace view public.student_assignment_results as
select ats.id, ats.assignment_id, ats.status, ats.total_score,
       ats.submitted_at, ats.graded_at,
       ats.attempt_no,
       ats.id = public.best_attempt_id(ats.assignment_id, ats.student_id) as is_best
from public.assignment_submissions ats
join public.assignments a on a.id = ats.assignment_id
where ats.student_id = (select auth.uid())
  and public.current_app_role() = 'student'
  and a.results_published_at is not null;

-- Định nghĩa như migration 002; tạo lại để view có thêm cột attempt_no.
create or replace view public.lecturer_assignment_submissions as
select ats.*
from public.assignment_submissions ats
join public.assignments a on a.id = ats.assignment_id
where (a.lecturer_id = (select auth.uid()) and public.current_app_role() = 'lecturer')
  or public.current_app_role() = 'admin';

-- ---------------------------------------------------------------------
-- Phần 5. Chấm điểm khi đã công bố: lượt làm lại sau thời điểm công bố vẫn được duyệt
-- ---------------------------------------------------------------------

-- Thay bản ở migration 002. Khác biệt: (1) cho duyệt lượt nộp sau khi đã công bố điểm;
-- (2) khi lượt đó thành điểm chính thức mới (cao hơn) thì báo cho sinh viên.
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

-- Thay bản ở migration 006: giảng viên yêu cầu AI chấm cả lượt làm lại nộp sau khi đã công bố điểm.
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
    and (a.results_published_at is null or ats.submitted_at > a.results_published_at)
    and ats.status in ('submitted', 'processing');

  if v_student_id is null or public.start_answer_ai_processing(p_submission_id) is null then
    raise exception 'Answer not available for AI grading';
  end if;
  return v_student_id;
end
$$;

-- Thay bản ở migration 006: thông báo một lần cho mỗi sinh viên với điểm của lượt cao nhất.
create or replace function public.publish_assignment_results(p_assignment_id uuid)
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

-- ---------------------------------------------------------------------
-- Phần 6. Cài đặt số lần làm (giảng viên)
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- Quyền thực thi
-- ---------------------------------------------------------------------

revoke all on function public.current_attempt_id(uuid, uuid) from public, anon, authenticated;
revoke all on function public.best_attempt_id(uuid, uuid) from public, anon;
revoke all on function public.attempt_has_score(uuid) from public, anon, authenticated;
revoke all on function public.student_can_take_assignment(uuid) from public, anon, authenticated;
revoke all on function public.start_assignment_retake(uuid) from public, anon;
revoke all on function public.get_retake_status(uuid) from public, anon;
revoke all on function public.set_assignment_max_attempts(uuid, integer) from public, anon;
revoke all on function public.publish_assignment_results(uuid) from public, anon;
-- View student_assignment_results gọi hàm này bằng quyền của sinh viên; hàm chỉ trả ID lượt làm (dữ liệu vẫn do RLS bảo vệ).
grant execute on function public.best_attempt_id(uuid, uuid) to authenticated;
grant execute on function public.start_assignment_retake(uuid) to authenticated;
grant execute on function public.get_retake_status(uuid) to authenticated;
grant execute on function public.set_assignment_max_attempts(uuid, integer) to authenticated;
grant execute on function public.publish_assignment_results(uuid) to authenticated;

commit;
