-- =====================================================================
-- 03_views.sql — VIEW ĐỌC DỮ LIỆU THEO VAI TRÒ
--
-- Giảng viên/admin đọc rubric, câu hỏi (kèm đáp án) và lượt nộp (kèm điểm) qua view thay vì bảng gốc;
-- sinh viên đọc kết quả đã công bố qua student_assignment_results.
-- =====================================================================

begin;

create or replace view public.lecturer_rubric_criteria as
select rc.*
from public.rubric_criteria rc
join public.questions q on q.id = rc.question_id
where public.current_app_role() in ('lecturer', 'admin')
  and public.can_view_assignment(q.assignment_id);

create or replace view public.lecturer_questions as
select q.*
from public.questions q
where public.current_app_role() in ('lecturer', 'admin')
  and public.can_view_assignment(q.assignment_id);

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

create or replace view public.lecturer_assignment_submissions as
select ats.*
from public.assignment_submissions ats
join public.assignments a on a.id = ats.assignment_id
where (a.lecturer_id = (select auth.uid()) and public.current_app_role() = 'lecturer')
  or public.current_app_role() = 'admin';

grant select on public.lecturer_rubric_criteria to authenticated;
grant select on public.lecturer_assignment_submissions to authenticated;
grant select on public.student_assignment_results to authenticated;
grant select on public.lecturer_questions to authenticated;

commit;
