create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  institutional_id text not null unique
    check (char_length(btrim(institutional_id)) between 1 and 32),
  full_name text not null
    check (char_length(btrim(full_name)) between 1 and 120),
  faculty text not null
    check (char_length(btrim(faculty)) between 1 and 120),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- app_metadata is admin-managed; public signup must not assign its own role.
  profile_role text := coalesce(new.raw_app_meta_data ->> 'role', 'student');
  institutional_id text := btrim(new.raw_user_meta_data ->> 'institutional_id');
  full_name text := btrim(new.raw_user_meta_data ->> 'full_name');
  faculty text := btrim(new.raw_user_meta_data ->> 'faculty');
begin
  if new.raw_app_meta_data ->> 'role' is null
     and institutional_id is null
     and full_name is null
     and faculty is null then
    return new;
  end if;

  if profile_role not in ('student', 'teacher')
     or coalesce(char_length(institutional_id), 0) not between 1 and 32
     or coalesce(char_length(full_name), 0) not between 1 and 120
     or coalesce(char_length(faculty), 0) not between 1 and 120 then
    raise exception 'Invalid signup profile metadata';
  end if;

  insert into public.profiles (id, role, institutional_id, full_name, faculty)
  values (new.id, profile_role, institutional_id, full_name, faculty);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the existing UI profile table aligned with the canonical OralCheck users table.
insert into public.users (id, full_name, role, account_status)
select
  p.id,
  p.full_name,
  case when p.role = 'teacher' then 'lecturer' else 'student' end,
  'active'
from public.profiles p
on conflict (id) do nothing;

insert into public.student_profiles (user_id, student_code, department)
select p.id, p.institutional_id, p.faculty
from public.profiles p
where p.role = 'student'
  and char_length(p.institutional_id) between 1 and 30
on conflict do nothing;

insert into public.lecturer_profiles (user_id, lecturer_code, department)
select p.id, p.institutional_id, p.faculty
from public.profiles p
where p.role = 'teacher'
  and char_length(p.institutional_id) between 1 and 30
on conflict do nothing;
