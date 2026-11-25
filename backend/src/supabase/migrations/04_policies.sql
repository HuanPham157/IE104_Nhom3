-- =====================================================================
-- 04_policies.sql — ROW LEVEL SECURITY POLICIES + KHO AUDIO
--
-- Quy định ai đọc được dòng nào (mọi bảng chỉ cho ĐỌC; ghi đi qua RPC), bucket "oral-answers" và quyền trên file audio.
-- =====================================================================

begin;

drop policy if exists "read own tasks" on public.tasks;
create policy "read own tasks" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own tasks" on public.tasks;
create policy "insert own tasks" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own tasks" on public.tasks;
create policy "update own tasks" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own tasks" on public.tasks;
create policy "delete own tasks" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users visible to owner, admin, and class lecturer" on public.users;
create policy "users visible to owner, admin, and class lecturer" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.current_app_role() = 'admin'
    or public.can_lecturer_view_user(id)
    or exists (
      select 1
      from public.classes c
      where c.lecturer_id = id
        and public.can_view_class(c.id)
    )
  );

drop policy if exists "student profiles visible to owner, admin, and class lecturer" on public.student_profiles;
create policy "student profiles visible to owner, admin, and class lecturer" on public.student_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.current_app_role() = 'admin'
    or public.can_lecturer_view_user(user_id)
  );

drop policy if exists "lecturer profiles visible to owner and admin" on public.lecturer_profiles;
create policy "lecturer profiles visible to owner and admin" on public.lecturer_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.current_app_role() = 'admin');

drop policy if exists "classes visible to participants" on public.classes;
create policy "classes visible to participants" on public.classes
  for select to authenticated using (public.can_view_class(id));

drop policy if exists "class members visible to participants" on public.class_members;
create policy "class members visible to participants" on public.class_members
  for select to authenticated
  using (
    (student_id = (select auth.uid()) and public.current_app_role() = 'student')
    or (
      public.can_view_class(class_id)
      and (
        public.current_app_role() = 'admin'
        or exists (
          select 1
          from public.classes c
          where c.id = class_id
            and c.status = 'active'
        )
      )
    )
  );

drop policy if exists "assignments visible to participants" on public.assignments;
create policy "assignments visible to participants" on public.assignments
  for select to authenticated using (public.can_view_assignment(id));

drop policy if exists "questions visible to assignment participants" on public.questions;
create policy "questions visible to assignment participants" on public.questions
  for select to authenticated using (public.can_view_assignment(assignment_id));

drop policy if exists "rubrics visible to assignment participants" on public.rubric_criteria;
create policy "rubrics visible to assignment participants" on public.rubric_criteria
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_id
        and public.can_view_assignment(q.assignment_id)
    )
  );

drop policy if exists "assignment submissions visible to owner, lecturer, and admin" on public.assignment_submissions;
create policy "assignment submissions visible to owner, lecturer, and admin" on public.assignment_submissions
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (a.lecturer_id = (select auth.uid()) or public.current_app_role() = 'admin')
    )
  );

drop policy if exists "submissions visible to owner, lecturer, and admin" on public.submissions;
create policy "submissions visible to owner, lecturer, and admin" on public.submissions
  for select to authenticated using (public.can_view_submission(id));

drop policy if exists "transcriptions visible to reviewer and result owner" on public.transcriptions;
create policy "transcriptions visible to reviewer and result owner" on public.transcriptions
  for select to authenticated
  using (
    public.can_view_submission(submission_id)
    and (
      public.current_app_role() in ('lecturer', 'admin')
      or public.can_view_submission_result(submission_id)
    )
  );

drop policy if exists "evaluations visible to reviewer and result owner" on public.evaluations;
create policy "evaluations visible to reviewer and result owner" on public.evaluations
  for select to authenticated
  using (
    public.can_view_submission(submission_id)
    and (
      public.current_app_role() in ('lecturer', 'admin')
      or public.can_view_submission_result(submission_id)
    )
  );

drop policy if exists "evaluation scores visible to reviewer and result owner" on public.evaluation_criterion_scores;
create policy "evaluation scores visible to reviewer and result owner" on public.evaluation_criterion_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and public.can_view_submission(e.submission_id)
        and (
          public.current_app_role() in ('lecturer', 'admin')
          or public.can_view_submission_result(e.submission_id)
        )
    )
  );

drop policy if exists "grade reviews visible to reviewer and result owner" on public.grade_reviews;
create policy "grade reviews visible to reviewer and result owner" on public.grade_reviews
  for select to authenticated
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and (
          public.current_app_role() = 'admin'
          or exists (
            select 1
            from public.assignment_submissions ats
            join public.assignments a on a.id = ats.assignment_id
            where ats.id = s.assignment_submission_id
              and public.current_app_role() = 'lecturer'
              and a.lecturer_id = (select auth.uid())
          )
          or (
            s.student_id = (select auth.uid())
            and public.current_app_role() = 'student'
            and exists (
              select 1
              from public.assignment_submissions ats
              join public.assignments a on a.id = ats.assignment_id
              where ats.id = s.assignment_submission_id
                and a.results_published_at is not null
            )
          )
        )
    )
  );

drop policy if exists "approval requests visible to requester and admin" on public.approval_requests;
create policy "approval requests visible to requester and admin" on public.approval_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or public.current_app_role() = 'admin');

drop policy if exists "notifications visible to owner" on public.notifications;
create policy "notifications visible to owner" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Bucket audio bài làm (private, tối đa 25 MB, chỉ định dạng âm thanh) và quyền trên file
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oral-answers',
  'oral-answers',
  false,
  26214400,
  array['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "students upload own oral answers" on storage.objects;
create policy "students upload own oral answers" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'oral-answers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_app_role() = 'student'
  );

drop policy if exists "owners and reviewers read oral answers" on storage.objects;
create policy "owners and reviewers read oral answers" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'oral-answers'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.submissions s
        where s.audio_storage_path = name
          and public.can_view_submission(s.id)
      )
    )
  );

drop policy if exists "students remove own unrecorded oral answers" on storage.objects;
create policy "students remove own unrecorded oral answers" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'oral-answers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_app_role() = 'student'
    and not exists (
      select 1 from public.submissions s
      where s.audio_storage_path = name
    )
  );

drop policy if exists "grading guides visible to assignment lecturer and admin" on public.assignment_grading_guides;
create policy "grading guides visible to assignment lecturer and admin" on public.assignment_grading_guides
  for select to authenticated
  using (public.can_manage_assignment(assignment_id));

commit;
