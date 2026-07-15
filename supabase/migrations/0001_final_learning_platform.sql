-- Final learning platform core. Apply with Supabase CLI or SQL migration runner.
create extension if not exists pgcrypto;

create type public.exercise_kind as enum ('single_pitch', 'interval', 'rhythm', 'melody_dictation', 'sight_singing', 'piano');
create type public.attempt_state as enum ('started', 'completed', 'abandoned', 'deleted');
create type public.asset_kind as enum ('score_image', 'score_pdf', 'musicxml', 'audio', 'recording');
create type public.asset_state as enum ('ready', 'deleted', 'failed');
create type public.analysis_state as enum ('queued', 'running', 'completed', 'failed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  timezone text not null default 'Asia/Shanghai',
  locale text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null check (position >= 0),
  title text not null,
  description text not null default '',
  is_published boolean not null default false,
  unique (course_id, position)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  kind public.exercise_kind not null,
  title text not null,
  instructions text not null default '',
  target jsonb not null,
  target_version integer not null default 1 check (target_version > 0),
  difficulty smallint not null default 1 check (difficulty between 1 and 10),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_id is null) <> (lesson_id is null))
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  source text not null default 'web',
  check (ended_at is null or ended_at >= started_at)
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.practice_sessions(id) on delete set null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  state public.attempt_state not null default 'started',
  target_version integer not null check (target_version > 0),
  client_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at)
);

create table public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  evaluator_version text not null,
  feedback_kind text not null,
  confidence numeric check (confidence is null or confidence between 0 and 1),
  metrics jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  is_formal boolean not null default false,
  created_at timestamptz not null default now(),
  unique (attempt_id, evaluator_version, feedback_kind)
);

create table public.skill_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_key text not null,
  level numeric not null default 0 check (level between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_key)
);

create table public.review_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  due_at timestamptz not null,
  reason text not null,
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create table public.private_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.asset_kind not null,
  state public.asset_state not null default 'ready',
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket, storage_path)
);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.private_assets(id) on delete cascade,
  state public.analysis_state not null default 'queued',
  pipeline_version text not null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  result jsonb,
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create table public.notation_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid references public.private_assets(id) on delete set null,
  source_kind text not null,
  draft jsonb not null,
  draft_version integer not null default 1 check (draft_version > 0),
  reviewed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confirmed_at is null or reviewed_at is not null)
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_key text not null,
  policy_version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'failed')),
  failure_reason text
);

create index practice_attempts_user_started_idx on public.practice_attempts (user_id, started_at desc);
create index evaluation_results_attempt_idx on public.evaluation_results (attempt_id, created_at desc);
create index review_queue_user_due_idx on public.review_queue (user_id, due_at);
create index private_assets_user_created_idx on public.private_assets (user_id, created_at desc);
create index analysis_jobs_user_state_idx on public.analysis_jobs (user_id, state, requested_at);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.evaluation_results enable row level security;
alter table public.skill_progress enable row level security;
alter table public.review_queue enable row level security;
alter table public.private_assets enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.notation_drafts enable row level security;
alter table public.consent_records enable row level security;
alter table public.deletion_requests enable row level security;

create policy "profiles are private" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "sessions are private" on public.practice_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "attempts are private" on public.practice_attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress is private" on public.skill_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "queue is private" on public.review_queue for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assets are private" on public.private_assets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "jobs are private" on public.analysis_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "drafts are private" on public.notation_drafts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "consent is private" on public.consent_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "deletions are private" on public.deletion_requests for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "published courses readable" on public.courses for select using (is_published = true);
create policy "published lessons readable" on public.lessons for select using (is_published = true);
create policy "published or owned exercises readable" on public.exercises for select using (is_published = true or owner_id = auth.uid());
create policy "evaluation follows attempt ownership" on public.evaluation_results for select using (
  exists (select 1 from public.practice_attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

-- The auth trigger creates the ownership row required by the app immediately after signup.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', '学习者'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
