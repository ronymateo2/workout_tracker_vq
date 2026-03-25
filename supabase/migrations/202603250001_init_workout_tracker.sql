create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  canonical_name text not null,
  normalized_name text not null,
  aliases text[] not null default '{}',
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, normalized_name)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  notes text not null default '',
  sync_state text not null default 'synced',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, session_date)
);

create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null,
  exercise_name text not null,
  normalized_name text not null,
  canonical_exercise_id uuid references public.exercise_library (id) on delete set null,
  exercise_mode text not null,
  load_mode text not null,
  unilateral boolean not null default false,
  default_weight_kg numeric(6, 2),
  default_band_color text,
  default_band_resistance text,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_entries_exercise_mode_check check (exercise_mode in ('reps', 'isometric')),
  constraint workout_entries_load_mode_check check (load_mode in ('bodyweight', 'weight', 'band', 'mixed'))
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.workout_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null,
  reps integer,
  duration_seconds integer,
  weight_kg numeric(6, 2),
  band_color text,
  band_resistance text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists exercise_library_user_id_idx
  on public.exercise_library (user_id);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, session_date desc);

create index if not exists workout_entries_user_session_idx
  on public.workout_entries (user_id, session_id, position);

create index if not exists workout_sets_user_entry_idx
  on public.workout_sets (user_id, entry_id, position);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists exercise_library_set_updated_at on public.exercise_library;
create trigger exercise_library_set_updated_at
before update on public.exercise_library
for each row
execute function public.set_updated_at();

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists workout_entries_set_updated_at on public.workout_entries;
create trigger workout_entries_set_updated_at
before update on public.workout_entries
for each row
execute function public.set_updated_at();

drop trigger if exists workout_sets_set_updated_at on public.workout_sets;
create trigger workout_sets_set_updated_at
before update on public.workout_sets
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_entries enable row level security;
alter table public.workout_sets enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "exercise_library_own" on public.exercise_library;
create policy "exercise_library_own"
  on public.exercise_library for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_own" on public.workout_sessions;
create policy "workout_sessions_own"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_entries_own" on public.workout_entries;
create policy "workout_entries_own"
  on public.workout_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_sets_own" on public.workout_sets;
create policy "workout_sets_own"
  on public.workout_sets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
