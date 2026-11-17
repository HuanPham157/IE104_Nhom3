-- =====================================================================
-- seed.sql — HÀM DÙNG CHUNG (tái sử dụng) của AI OralCheck
--
-- Chứa các hàm nhỏ, không gắn với một tính năng cụ thể: kiểm tra vai trò, quyền quản lý bài tập,
-- hạn giờ làm bài, đọc transcript, lõi vòng đời chấm AI. Các migration từ 006 trở đi gọi lại các hàm này
-- thay vì lặp logic.
--
-- Thứ tự chạy (Supabase SQL Editor): migrations 000 → 005  →  seed.sql  →  migrations 006 → …
-- Idempotent (create or replace) → chạy lại an toàn mỗi khi file thay đổi. Không đặt dữ liệu cá nhân/bí mật ở đây.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Hàm dùng chung
-- ---------------------------------------------------------------------

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

-- Lượt làm bài còn trong giờ (ân hạn 30 giây cho độ trễ tải audio). Hằng số ân hạn chỉ đặt ở đây.
create or replace function public.is_within_exam_time(p_deadline_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_deadline_at is null or p_deadline_at + interval '30 seconds' >= now()
$$;

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

-- ---------------------------------------------------------------------
-- Quyền thực thi
-- ---------------------------------------------------------------------

-- Hàm kiểm tra dùng trong RLS policy / có thể gọi từ client: cấp cho authenticated.
revoke all on function public.require_app_role(text[]) from public, anon;
revoke all on function public.can_manage_assignment(uuid) from public, anon;
revoke all on function public.is_within_exam_time(timestamptz) from public, anon;
grant execute on function public.require_app_role(text[]) to authenticated;
grant execute on function public.can_manage_assignment(uuid) to authenticated;
grant execute on function public.is_within_exam_time(timestamptz) to authenticated;

-- Hàm nội bộ: chỉ được gọi từ bên trong các hàm security definer khác, client không gọi trực tiếp.
revoke all on function public.assert_draft_assignment_editable(uuid) from public, anon, authenticated;
revoke all on function public.latest_transcript(uuid) from public, anon, authenticated;
revoke all on function public.first_transcript(uuid) from public, anon, authenticated;
revoke all on function public.start_answer_ai_processing(uuid) from public, anon, authenticated;
revoke all on function public.mark_answer_ai_failed(uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_expired_attempts(uuid) from public, anon, authenticated;

commit;
