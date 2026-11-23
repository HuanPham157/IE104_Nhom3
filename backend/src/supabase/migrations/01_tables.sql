-- =====================================================================
-- 01_tables.sql — BẢNG, RÀNG BUỘC, INDEX, BẬT RLS, QUYỀN ĐỌC BẢNG/CỘT
--
-- Trạng thái cuối cùng của mọi bảng (đã gộp các cột / ràng buộc bổ sung qua nhiều lần sửa).
-- Tài khoản đăng nhập do Supabase quản lý trong auth.users; vai trò chuẩn nằm ở public.users.role.
-- Mọi thao tác GHI đi qua RPC (security definer) trong các file 05–11; client chỉ được ĐỌC
-- những bảng/cột được cấp quyền bên dưới, và RLS (04_policies.sql) lọc từng dòng.
-- Chạy lại nhiều lần vẫn an toàn (if not exists).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Người dùng và hồ sơ
-- ---------------------------------------------------------------------
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

-- academic_title / academic_degree: học hàm / học vị (admin duyệt qua approval_requests).
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

-- ---------------------------------------------------------------------
-- 2. Lớp học và thành viên
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 3. Bài tập, câu hỏi, rubric, barem
-- ---------------------------------------------------------------------
-- duration_minutes: thời lượng làm bài (null = không giới hạn ngoài hạn nộp).
-- show_reference_answer: cho sinh viên xem đáp án tham khảo sau khi nộp.
-- max_attempts: số lần làm lại cả bài (1–5); điểm chính thức là lượt cao nhất được duyệt.
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
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 600),
  show_reference_answer boolean not null default false,
  max_attempts integer not null default 1 constraint assignments_max_attempts_check check (max_attempts between 1 and 5),
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

-- Barem chấm chung của bài tập (sinh viên không đọc được — xem policy).
create table if not exists public.assignment_grading_guides (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  guide_text text not null check (char_length(guide_text) between 1 and 20000),
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Lượt làm bài và các câu trả lời ghi âm
-- ---------------------------------------------------------------------
-- Mỗi lượt làm là một dòng (attempt_no 1, 2, …); mỗi lúc tối đa một lượt đang làm.
-- deadline_at do trigger set_assignment_exam_deadline đặt khi bắt đầu lượt.
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
  deadline_at timestamptz,
  attempt_no integer not null default 1 constraint assignment_submissions_attempt_no_check check (attempt_no between 1 and 5),
  constraint assignment_submissions_attempt_key unique (assignment_id, student_id, attempt_no),
  check (total_score is null or total_score >= 0)
);

-- Mỗi câu hỏi có nhiều phiên bản ghi âm; đúng một bản is_final được nộp.
-- status: queued (chờ worker) → processing → ready (đã chấm) / failed (lỗi, có error_message).
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
  submitted_at timestamptz not null default now(),
  ai_processing_started_at timestamptz
);

-- Transcript: bản Whisper (engine faster-whisper-*), bản sinh viên sửa (student-edit), bản giảng viên sửa (lecturer-edit).
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

-- ---------------------------------------------------------------------
-- 5. Chấm AI và điểm chính thức của giảng viên
-- ---------------------------------------------------------------------
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  transcription_id uuid not null references public.transcriptions(id) on delete restrict,
  model_name text not null,
  suggested_score numeric(5,2) not null check (suggested_score >= 0),
  feedback_summary text,
  created_at timestamptz not null default now(),
  needs_teacher_review boolean not null default true
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

-- ---------------------------------------------------------------------
-- 6. Duyệt của admin và thông báo
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 7. Việc cá nhân của sinh viên
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  notes text constraint tasks_notes_length check (notes is null or char_length(notes) <= 1000),
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Index
-- ---------------------------------------------------------------------
create index if not exists idx_classes_lecturer_id on public.classes(lecturer_id);
create index if not exists idx_class_members_student_id on public.class_members(student_id);
create index if not exists idx_assignments_class_id on public.assignments(class_id);
create index if not exists idx_questions_assignment_id on public.questions(assignment_id);
create index if not exists idx_rubric_criteria_question_id on public.rubric_criteria(question_id);
create index if not exists idx_assignment_submissions_student_id on public.assignment_submissions(student_id);
create index if not exists idx_assignment_submissions_assignment_id on public.assignment_submissions(assignment_id);
create unique index if not exists uq_assignment_submissions_one_in_progress
  on public.assignment_submissions (assignment_id, student_id) where status = 'in_progress';
create index if not exists idx_submissions_parent_id on public.submissions(assignment_submission_id);
-- Tối đa một bản nộp chính thức cho mỗi câu hỏi trong một lượt làm.
create unique index if not exists uq_submissions_one_final_per_question
  on public.submissions (assignment_submission_id, question_id) where is_final = true;
create index if not exists idx_transcriptions_submission_id on public.transcriptions(submission_id);
create index if not exists idx_evaluations_submission_id on public.evaluations(submission_id);
create index if not exists idx_grade_reviews_submission_id on public.grade_reviews(submission_id);
create unique index if not exists uq_grade_reviews_submission_id on public.grade_reviews (submission_id);
create index if not exists idx_approval_requests_status on public.approval_requests(status);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read);
create index if not exists tasks_owner_created_idx on public.tasks(user_id, created_at desc);
create index if not exists tasks_owner_due_idx on public.tasks (user_id, is_done, due_date);

-- ---------------------------------------------------------------------
-- 9. Bật RLS cho mọi bảng
-- ---------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.lecturer_profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.questions enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.assignment_grading_guides enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.submissions enable row level security;
alter table public.transcriptions enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_criterion_scores enable row level security;
alter table public.grade_reviews enable row level security;
alter table public.approval_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.tasks enable row level security;

-- ---------------------------------------------------------------------
-- 10. Quyền đọc bảng / cột (ghi đi qua RPC)
-- ---------------------------------------------------------------------
revoke all on public.users, public.student_profiles, public.lecturer_profiles,
  public.classes, public.class_members, public.assignments, public.questions,
  public.rubric_criteria, public.assignment_grading_guides, public.assignment_submissions,
  public.submissions, public.transcriptions, public.evaluations, public.evaluation_criterion_scores,
  public.grade_reviews, public.approval_requests, public.notifications, public.tasks
from public, anon, authenticated;

grant select on public.users, public.student_profiles, public.lecturer_profiles,
  public.classes, public.class_members, public.assignments, public.assignment_grading_guides,
  public.submissions, public.transcriptions, public.evaluations, public.evaluation_criterion_scores,
  public.grade_reviews, public.approval_requests, public.notifications
to authenticated;

-- Câu hỏi: client không đọc được reference_answer trực tiếp (giảng viên đọc qua view lecturer_questions).
grant select (
  id, assignment_id, content, position, max_score, time_limit_seconds,
  created_at, updated_at
) on public.questions to authenticated;

-- Lượt làm: client không đọc total_score trực tiếp (dùng view lecturer_assignment_submissions / student_assignment_results).
grant select (
  id, assignment_id, student_id, status, started_at, submitted_at,
  graded_at, created_at, updated_at, deadline_at, attempt_no
) on public.assignment_submissions to authenticated;

-- rubric_criteria: không cấp trực tiếp (giảng viên đọc qua view lecturer_rubric_criteria).

-- Việc cá nhân: sinh viên tự quản lý (RLS chỉ cho dòng của chính mình).
grant select, insert, update, delete on public.tasks to authenticated;

commit;
