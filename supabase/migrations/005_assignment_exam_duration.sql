alter table public.assignments
add column if not exists duration_minutes integer
check (duration_minutes is null or duration_minutes between 1 and 600);

alter table public.assignment_submissions
add column if not exists deadline_at timestamptz;

grant select (deadline_at) on public.assignment_submissions to authenticated;

create or replace function public.set_assignment_exam_deadline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deadline_at is null then
    select case when a.duration_minutes is null then null
      else coalesce(new.started_at, now()) + make_interval(mins => a.duration_minutes)
    end into new.deadline_at
    from public.assignments a where a.id = new.assignment_id;
  end if;
  return new;
end
$$;

drop trigger if exists set_assignment_exam_deadline on public.assignment_submissions;
create trigger set_assignment_exam_deadline
before insert on public.assignment_submissions
for each row execute function public.set_assignment_exam_deadline();

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
