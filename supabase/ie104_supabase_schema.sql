-- IE104 / AI OralCheck and task manager - Supabase PostgreSQL schema
-- Run in Supabase Dashboard > SQL Editor > New query.
-- Uses lowercase snake_case identifiers. PostgreSQL treats unquoted names case-insensitively.
-- RLS policies are provided for tasks. Other tables require role-aware policies before
-- they can be accessed through the Supabase Data API.

begin;

-- 0. Tasks used by the current task-manager backend.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1. User profiles. Authentication accounts are managed by Supabase in auth.users.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'lecturer', 'admin')),
  avatar_url text,
  account_status text not null default 'active'
    check (account_status in ('active', 'pending', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  student_code varchar(30) unique,
  department text,
  major text,
  course_year text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lecturer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  lecturer_code varchar(30) unique,
  academic_degree text,
  academic_title text,
  department text,
  institution text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Classes and membership
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.users(id) on delete restrict,
  class_name text not null,
  description text,
  class_code varchar(10) not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (class_id, student_id)
);

-- 3. Assignments, questions and rubrics
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  lecturer_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  instructions text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed', 'archived')),
  results_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  content text not null,
  reference_answer text not null,
  position integer not null check (position > 0),
  max_score numeric(5,2) not null default 10 check (max_score > 0),
  time_limit_seconds integer not null default 120 check (time_limit_seconds > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, position)
);

create table if not exists public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete restrict,
  criterion_text text not null,
  max_points numeric(5,2) not null check (max_points > 0),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (question_id, position)
);

-- 4. Student attempt and individual audio answers
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  student_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'processing', 'graded')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  total_score numeric(7,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id),
  check (total_score is null or total_score >= 0)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_submission_id uuid not null
    references public.assignment_submissions(id) on delete restrict,
  question_id uuid not null references public.questions(id) on delete restrict,
  student_id uuid not null references public.users(id) on delete restrict,
  audio_storage_path text not null,
  audio_mime_type text,
  audio_duration_seconds integer check (audio_duration_seconds is null or audio_duration_seconds > 0),
  audio_size_bytes bigint check (audio_size_bytes is null or audio_size_bytes > 0),
  attempt_number integer not null default 1 check (attempt_number > 0),
  is_final boolean not null default true,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'failed')),
  error_message text,
  submitted_at timestamptz not null default now()
);

-- At most one final audio answer for a question in a given overall attempt.
create unique index if not exists uq_submissions_one_final_per_question
  on public.submissions (assignment_submission_id, question_id)
  where is_final = true;

create table if not exists public.transcriptions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  transcript_text text not null,
  engine_name text not null,
  language_code varchar(10),
  confidence_score numeric(5,4)
    check (confidence_score is null or confidence_score between 0 and 1),
  is_edited boolean not null default false,
  edited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. AI evaluation and lecturer's official review
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  transcription_id uuid not null references public.transcriptions(id) on delete restrict,
  model_name text not null,
  suggested_score numeric(5,2) not null check (suggested_score >= 0),
  feedback_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_criterion_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete restrict,
  criterion_id uuid not null references public.rubric_criteria(id) on delete restrict,
  awarded_points numeric(5,2) not null check (awarded_points >= 0),
  assessment text not null
    check (assessment in ('correct', 'partial', 'incorrect', 'missing')),
  evidence_excerpt text,
  explanation text,
  created_at timestamptz not null default now(),
  unique (evaluation_id, criterion_id)
);

create table if not exists public.grade_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  evaluation_id uuid references public.evaluations(id) on delete set null,
  lecturer_id uuid not null references public.users(id) on delete restrict,
  final_score numeric(5,2) not null check (final_score >= 0),
  reviewer_feedback text,
  score_modified boolean not null default false,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score_modified = false or nullif(trim(reviewer_feedback), '') is not null)
);

-- 6. Admin approvals and notifications
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete restrict,
  request_type text not null
    check (request_type in ('class_creation', 'class_cancellation', 'student_registration', 'academic_info_update')),
  target_id uuid,
  request_data jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id) on delete set null,
  reject_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Helpful indexes for common joins and dashboard filters.
create index if not exists tasks_owner_created_idx on public.tasks(user_id, created_at desc);
create index if not exists idx_classes_lecturer_id on public.classes(lecturer_id);
create index if not exists idx_class_members_student_id on public.class_members(student_id);
create index if not exists idx_assignments_class_id on public.assignments(class_id);
create index if not exists idx_questions_assignment_id on public.questions(assignment_id);
create index if not exists idx_rubric_criteria_question_id on public.rubric_criteria(question_id);
create index if not exists idx_assignment_submissions_student_id on public.assignment_submissions(student_id);
create index if not exists idx_assignment_submissions_assignment_id on public.assignment_submissions(assignment_id);
create index if not exists idx_submissions_parent_id on public.submissions(assignment_submission_id);
create index if not exists idx_transcriptions_submission_id on public.transcriptions(submission_id);
create index if not exists idx_evaluations_submission_id on public.evaluations(submission_id);
create index if not exists idx_grade_reviews_submission_id on public.grade_reviews(submission_id);
create index if not exists idx_approval_requests_status on public.approval_requests(status);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read);

-- Enable RLS on all public tables. Policies are intentionally not auto-created here:
-- create and test role-aware policies before frontend access. With RLS enabled and no policies,
-- API clients cannot read/write these tables through normal authenticated requests.
alter table public.tasks enable row level security;
alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.lecturer_profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.questions enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.submissions enable row level security;
alter table public.transcriptions enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_criterion_scores enable row level security;
alter table public.grade_reviews enable row level security;
alter table public.approval_requests enable row level security;
alter table public.notifications enable row level security;

-- The current backend uses authenticated requests for task CRUD.
revoke all on public.tasks from public, anon, authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

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

commit;

-- After running this base schema:
-- 1) Run oralcheck_backend.sql to add role-aware policies, private audio storage, and backend RPCs.
-- 2) Add a trusted signup trigger or server-side flow to create public.users and the appropriate profile.
-- 3) Business rules involving SUM across rows (rubric points, final total score) need a trigger or server-side transaction;
--    ordinary CHECK constraints cannot validate sums across multiple rows.
-- Do not expose the service_role key in browser/frontend code.
