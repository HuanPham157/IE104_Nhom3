-- 010: Chỉ công bố điểm sau hạn nộp của bài tập.
--   Luồng: trong hạn nộp sinh viên làm / làm lại (dựa trên điểm AI); sau hạn nộp giảng viên duyệt và công bố điểm.
--   Bài không đặt hạn nộp thì vẫn công bố được bất cứ lúc nào.
-- Chạy SAU migration 009 (thay hàm publish_assignment_results của 009). Chạy lại nhiều lần vẫn an toàn.

begin;

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

commit;
