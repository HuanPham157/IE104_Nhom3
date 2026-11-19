-- 007: Giảng viên chọn có cho sinh viên xem đáp án tham khảo hay không.
--   - assignments.show_reference_answer (mặc định tắt).
--   - Sinh viên chỉ nhận đáp án khi lượt làm bài đã nộp VÀ giảng viên đã bật.
--   - Giảng viên bật/tắt được cả sau khi công bố bài (ví dụ mở đáp án sau khi chấm xong).
-- Chạy SAU migration 006. Chạy lại nhiều lần vẫn an toàn.

begin;

alter table public.assignments
  add column if not exists show_reference_answer boolean not null default false;

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

-- Thay bản ở migration 004: đáp án tham khảo chỉ trả về sau khi nộp bài và khi giảng viên cho phép
-- (trước đây trả về ngay khi câu trả lời có đánh giá AI).
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
  where ats.assignment_id = p_assignment_id
    and ats.student_id = (select auth.uid());
  return v_result;
end
$$;

revoke all on function public.set_assignment_reference_visibility(uuid, boolean) from public, anon;
revoke all on function public.get_own_assignment_submission(uuid) from public, anon;
grant execute on function public.set_assignment_reference_visibility(uuid, boolean) to authenticated;
grant execute on function public.get_own_assignment_submission(uuid) to authenticated;

commit;
