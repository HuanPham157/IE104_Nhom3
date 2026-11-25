-- =====================================================================
-- 02_helpers.sql — HÀM DÙNG CHUNG
--
-- Hàm nhỏ, không gắn với một tính năng: vai trò hiện tại, quyền xem lớp/bài/câu trả lời, quyền quản lý bài tập,
-- thời gian làm bài, lượt làm (hiện tại / tốt nhất / đã có điểm), transcript, lõi vòng đời xử lý AI.
-- Các file 03–11 gọi lại các hàm này thay vì lặp logic. Hàm "nội bộ" bị thu hồi quyền khỏi client.
-- =====================================================================

begin;

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

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

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

revoke all on function public.can_view_class(uuid) from public, anon;
grant execute on function public.can_view_class(uuid) to authenticated;

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

revoke all on function public.can_view_assignment(uuid) from public, anon;
grant execute on function public.can_view_assignment(uuid) to authenticated;

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

revoke all on function public.can_view_submission(uuid) from public, anon;
grant execute on function public.can_view_submission(uuid) to authenticated;

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

revoke all on function public.can_view_submission_result(uuid) from public, anon;
grant execute on function public.can_view_submission_result(uuid) to authenticated;

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

revoke all on function public.can_lecturer_view_user(uuid) from public, anon;
grant execute on function public.can_lecturer_view_user(uuid) to authenticated;

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

revoke all on function public.class_lecturer_names(uuid[]) from public, anon;
grant execute on function public.class_lecturer_names(uuid[]) to authenticated;

-- Ném lỗi nếu vai trò hiện tại không thuộc danh sách. Vd: perform public.require_app_role('lecturer', 'admin');
create or replace function public.require_app_role(variadic p_roles text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() is null or not (public.current_app_role() = any (p_roles)) then
    raise exception 'Role % required', array_to_string(p_roles, ' or ');
  end if;
end
$$;

revoke all on function public.require_app_role(text[]) from public, anon;
grant execute on function public.require_app_role(text[]) to authenticated;

-- Người dùng hiện tại có quyền quản lý bài tập: admin, hoặc giảng viên tạo bài.
create or replace function public.can_manage_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id
      and (
        public.current_app_role() = 'admin'
        or (public.current_app_role() = 'lecturer' and a.lecturer_id = (select auth.uid()))
      )
  )
$$;

revoke all on function public.can_manage_assignment(uuid) from public, anon;
grant execute on function public.can_manage_assignment(uuid) to authenticated;

-- Ném lỗi trừ khi bài tập còn là bản nháp và người dùng có quyền sửa.
create or replace function public.assert_draft_assignment_editable(p_assignment_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_assignment(p_assignment_id)
    or not exists (select 1 from public.assignments where id = p_assignment_id and status = 'draft') then
    raise exception 'Draft assignment not found or forbidden';
  end if;
end
$$;

revoke all on function public.assert_draft_assignment_editable(uuid) from public, anon, authenticated;

-- Lượt làm bài còn trong giờ (ân hạn 30 giây cho độ trễ tải audio). Hằng số ân hạn chỉ đặt ở đây.
create or replace function public.is_within_exam_time(p_deadline_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_deadline_at is null or p_deadline_at + interval '30 seconds' >= now()
$$;

revoke all on function public.is_within_exam_time(timestamptz) from public, anon;
grant execute on function public.is_within_exam_time(timestamptz) to authenticated;

-- Transcript mới nhất / đầu tiên (bản Whisper gốc) của một câu trả lời.
create or replace function public.latest_transcript(p_submission_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.transcript_text from public.transcriptions t
  where t.submission_id = p_submission_id
  order by t.created_at desc limit 1
$$;

revoke all on function public.latest_transcript(uuid) from public, anon, authenticated;

create or replace function public.first_transcript(p_submission_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.transcript_text from public.transcriptions t
  where t.submission_id = p_submission_id
  order by t.created_at asc limit 1
$$;

revoke all on function public.first_transcript(uuid) from public, anon, authenticated;

-- Lõi vòng đời chấm AI (nội bộ — không cấp cho client, bên gọi tự kiểm tra quyền trước):
-- chuyển câu trả lời sang 'processing' nếu đang chờ/lỗi hoặc bị kẹt quá 10 phút; trả về id lượt làm (null nếu không nhận được).
create or replace function public.start_answer_ai_processing(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
begin
  update public.submissions s
  set status = 'processing', error_message = null, ai_processing_started_at = now()
  where s.id = p_submission_id
    and (
      s.status in ('queued', 'failed')
      or (s.status = 'processing' and coalesce(s.ai_processing_started_at, s.submitted_at) < now() - interval '10 minutes')
    )
  returning s.assignment_submission_id into v_attempt_id;

  if v_attempt_id is not null then
    update public.assignment_submissions
    set status = 'processing', updated_at = now()
    where id = v_attempt_id and status = 'submitted';
  end if;
  return v_attempt_id;
end
$$;

revoke all on function public.start_answer_ai_processing(uuid) from public, anon, authenticated;

-- Đánh dấu chấm AI thất bại để có thể thử lại (nội bộ).
create or replace function public.mark_answer_ai_failed(p_submission_id uuid, p_error_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.submissions
  set status = 'failed', error_message = left(coalesce(p_error_message, 'AI processing failed'), 500),
      ai_processing_started_at = null
  where id = p_submission_id and status = 'processing';
  return found;
end
$$;

revoke all on function public.mark_answer_ai_failed(uuid, text) from public, anon, authenticated;

-- Tự nộp các lượt làm đã hết giờ nhưng sinh viên chưa bấm nộp (đóng trình duyệt, mất mạng…) — nội bộ.
-- Chỉ nộp lượt có ít nhất một câu trả lời; lượt trống giữ nguyên (coi như không làm bài). Trả về số lượt đã nộp.
create or replace function public.finalize_expired_attempts(p_assignment_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.assignment_submissions ats
  set status = 'submitted',
      submitted_at = coalesce(ats.deadline_at, a.ends_at, now()),
      updated_at = now()
  from public.assignments a
  where a.id = ats.assignment_id
    and ats.assignment_id = p_assignment_id
    and ats.status = 'in_progress'
    and (
      (ats.deadline_at is not null and not public.is_within_exam_time(ats.deadline_at))
      or (a.ends_at is not null and not public.is_within_exam_time(a.ends_at))
    )
    and exists (select 1 from public.submissions s where s.assignment_submission_id = ats.id and s.is_final = true);
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.finalize_expired_attempts(uuid) from public, anon, authenticated;

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

revoke all on function public.current_attempt_id(uuid, uuid) from public, anon, authenticated;

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

revoke all on function public.best_attempt_id(uuid, uuid) from public, anon;
grant execute on function public.best_attempt_id(uuid, uuid) to authenticated;

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

revoke all on function public.attempt_has_score(uuid) from public, anon, authenticated;

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

revoke all on function public.student_can_take_assignment(uuid) from public, anon, authenticated;

commit;
