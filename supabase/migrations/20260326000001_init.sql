-- ═══════════════════════════════════════════════════════════════════════════
-- Rurana Workout Tracker — Initial Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helper: auto-update updated_at ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── Custom types ────────────────────────────────────────────────────────
create type exercise_type as enum (
  'weight_reps',
  'bodyweight_reps',
  'duration',
  'duration_weight',
  'distance_duration',
  'weight_distance',
  'bands'
);

create type band_color as enum (
  'yellow', 'red', 'black', 'purple', 'green', 'blue'
);

-- ─── profiles ────────────────────────────────────────────────────────────
create table profiles (
  user_id    uuid primary key,
  email      text not null,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (user_id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert with check (user_id = auth.uid());

create policy "Users can update own profile"
  on profiles for update using (user_id = auth.uid());

-- ─── exercise_library ────────────────────────────────────────────────────
create table exercise_library (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,  -- NULL = global seed exercise
  name           text not null,
  exercise_type  exercise_type not null default 'weight_reps',
  unilateral     boolean not null default false,
  muscle_groups  text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index exercise_library_user_id_idx on exercise_library (user_id);
create index exercise_library_name_idx on exercise_library (name);

alter table exercise_library enable row level security;

-- Users can read global exercises (user_id IS NULL) + their own
create policy "Users can read exercises"
  on exercise_library for select
  using (user_id is null or user_id = auth.uid());

create policy "Users can insert own exercises"
  on exercise_library for insert
  with check (user_id = auth.uid());

create policy "Users can update own exercises"
  on exercise_library for update
  using (user_id = auth.uid());

create policy "Users can delete own exercises"
  on exercise_library for delete
  using (user_id = auth.uid());

-- ─── routines ────────────────────────────────────────────────────────────
create table routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routines_user_id_idx on routines (user_id);

create trigger routines_updated_at
  before update on routines
  for each row execute function set_updated_at();

alter table routines enable row level security;

create policy "Users can read own routines"
  on routines for select using (user_id = auth.uid());

create policy "Users can insert own routines"
  on routines for insert with check (user_id = auth.uid());

create policy "Users can update own routines"
  on routines for update using (user_id = auth.uid());

create policy "Users can delete own routines"
  on routines for delete using (user_id = auth.uid());

-- ─── routine_exercises ───────────────────────────────────────────────────
create table routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references routines (id) on delete cascade,
  exercise_id  uuid not null references exercise_library (id) on delete cascade,
  position     int not null default 0,
  default_sets int not null default 3
);

create index routine_exercises_routine_id_idx on routine_exercises (routine_id);

alter table routine_exercises enable row level security;

create policy "Users can read own routine exercises"
  on routine_exercises for select
  using (exists (select 1 from routines where routines.id = routine_id and routines.user_id = auth.uid()));

create policy "Users can insert own routine exercises"
  on routine_exercises for insert
  with check (exists (select 1 from routines where routines.id = routine_id and routines.user_id = auth.uid()));

create policy "Users can update own routine exercises"
  on routine_exercises for update
  using (exists (select 1 from routines where routines.id = routine_id and routines.user_id = auth.uid()));

create policy "Users can delete own routine exercises"
  on routine_exercises for delete
  using (exists (select 1 from routines where routines.id = routine_id and routines.user_id = auth.uid()));

-- ─── workout_sessions ────────────────────────────────────────────────────
create table workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  routine_id  uuid references routines (id) on delete set null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);

create index workout_sessions_user_id_started_at_idx
  on workout_sessions (user_id, started_at desc);

alter table workout_sessions enable row level security;

create policy "Users can read own sessions"
  on workout_sessions for select using (user_id = auth.uid());

create policy "Users can insert own sessions"
  on workout_sessions for insert with check (user_id = auth.uid());

create policy "Users can update own sessions"
  on workout_sessions for update using (user_id = auth.uid());

create policy "Users can delete own sessions"
  on workout_sessions for delete using (user_id = auth.uid());

-- ─── workout_entries ─────────────────────────────────────────────────────
create table workout_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references workout_sessions (id) on delete cascade,
  exercise_id uuid not null references exercise_library (id) on delete cascade,
  position    int not null default 0
);

create index workout_entries_session_id_idx on workout_entries (session_id);

alter table workout_entries enable row level security;

create policy "Users can read own entries"
  on workout_entries for select
  using (exists (select 1 from workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid()));

create policy "Users can insert own entries"
  on workout_entries for insert
  with check (exists (select 1 from workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid()));

create policy "Users can update own entries"
  on workout_entries for update
  using (exists (select 1 from workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid()));

create policy "Users can delete own entries"
  on workout_entries for delete
  using (exists (select 1 from workout_sessions where workout_sessions.id = session_id and workout_sessions.user_id = auth.uid()));

-- ─── workout_sets ────────────────────────────────────────────────────────
create table workout_sets (
  id               uuid primary key default gen_random_uuid(),
  entry_id         uuid not null references workout_entries (id) on delete cascade,
  position         int not null default 0,
  weight_kg        numeric(7,2),
  reps             int,
  duration_seconds int,
  distance_m       numeric(10,2),
  band_color       band_color,
  band_resistance  numeric(5,1),
  completed        boolean not null default false
);

create index workout_sets_entry_id_idx on workout_sets (entry_id);

alter table workout_sets enable row level security;

create policy "Users can read own sets"
  on workout_sets for select
  using (exists (
    select 1 from workout_entries e
    join workout_sessions s on s.id = e.session_id
    where e.id = entry_id and s.user_id = auth.uid()
  ));

create policy "Users can insert own sets"
  on workout_sets for insert
  with check (exists (
    select 1 from workout_entries e
    join workout_sessions s on s.id = e.session_id
    where e.id = entry_id and s.user_id = auth.uid()
  ));

create policy "Users can update own sets"
  on workout_sets for update
  using (exists (
    select 1 from workout_entries e
    join workout_sessions s on s.id = e.session_id
    where e.id = entry_id and s.user_id = auth.uid()
  ));

create policy "Users can delete own sets"
  on workout_sets for delete
  using (exists (
    select 1 from workout_entries e
    join workout_sessions s on s.id = e.session_id
    where e.id = entry_id and s.user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: Common exercises (global, user_id = NULL)
-- ═══════════════════════════════════════════════════════════════════════════

insert into exercise_library (user_id, name, exercise_type, unilateral, muscle_groups) values
-- Pecho
(null, 'Press Banca', 'weight_reps', false, '{"chest","triceps","shoulders"}'),
(null, 'Press Banca Inclinado', 'weight_reps', false, '{"chest","shoulders","triceps"}'),
(null, 'Press Banca Declinado', 'weight_reps', false, '{"chest","triceps"}'),
(null, 'Aperturas con Mancuerna', 'weight_reps', false, '{"chest"}'),
(null, 'Fondos en Paralelas', 'bodyweight_reps', false, '{"chest","triceps","shoulders"}'),
(null, 'Flexiones', 'bodyweight_reps', false, '{"chest","triceps","shoulders"}'),
(null, 'Chest Fly (Banda)', 'bands', false, '{"chest"}'),
-- Espalda
(null, 'Peso Muerto', 'weight_reps', false, '{"back","hamstrings","glutes"}'),
(null, 'Remo con Barra', 'weight_reps', false, '{"back","biceps"}'),
(null, 'Remo con Mancuerna', 'weight_reps', true, '{"back","biceps"}'),
(null, 'Jalón al Pecho', 'weight_reps', false, '{"lats","biceps"}'),
(null, 'Dominadas', 'bodyweight_reps', false, '{"lats","biceps","back"}'),
(null, 'Remo en Máquina', 'weight_reps', false, '{"back","biceps"}'),
(null, 'Band Pull Aparts', 'bands', false, '{"back","shoulders"}'),
-- Hombros
(null, 'Press Militar', 'weight_reps', false, '{"shoulders","triceps"}'),
(null, 'Elevaciones Laterales', 'weight_reps', false, '{"shoulders"}'),
(null, 'Elevaciones Frontales', 'weight_reps', false, '{"shoulders"}'),
(null, 'Face Pulls', 'weight_reps', false, '{"shoulders","back"}'),
(null, 'Press Arnold', 'weight_reps', false, '{"shoulders","triceps"}'),
-- Bíceps
(null, 'Curl con Barra', 'weight_reps', false, '{"biceps"}'),
(null, 'Curl con Mancuerna', 'weight_reps', true, '{"biceps"}'),
(null, 'Curl Martillo', 'weight_reps', true, '{"biceps","forearms"}'),
(null, 'Curl Concentrado', 'weight_reps', true, '{"biceps"}'),
(null, 'Curl con Banda', 'bands', false, '{"biceps"}'),
-- Tríceps
(null, 'Extensión de Tríceps', 'weight_reps', false, '{"triceps"}'),
(null, 'Press Francés', 'weight_reps', false, '{"triceps"}'),
(null, 'Fondos en Banco', 'bodyweight_reps', false, '{"triceps","chest"}'),
(null, 'Extensión de Tríceps con Banda', 'bands', false, '{"triceps"}'),
-- Piernas
(null, 'Sentadilla', 'weight_reps', false, '{"quads","glutes","hamstrings"}'),
(null, 'Sentadilla Búlgara', 'weight_reps', true, '{"quads","glutes"}'),
(null, 'Prensa de Piernas', 'weight_reps', false, '{"quads","glutes"}'),
(null, 'Extensión de Piernas', 'weight_reps', false, '{"quads"}'),
(null, 'Curl de Piernas', 'weight_reps', false, '{"hamstrings"}'),
(null, 'Peso Muerto Rumano', 'weight_reps', false, '{"hamstrings","glutes","back"}'),
(null, 'Zancadas', 'weight_reps', true, '{"quads","glutes"}'),
(null, 'Hip Thrust', 'weight_reps', false, '{"glutes","hamstrings"}'),
(null, 'Elevación de Talones', 'weight_reps', false, '{"calves"}'),
(null, 'Sentadilla con Banda', 'bands', false, '{"quads","glutes"}'),
-- Abdominales
(null, 'Crunch', 'bodyweight_reps', false, '{"abs"}'),
(null, 'Plancha', 'duration', false, '{"abs","full_body"}'),
(null, 'Plancha Lateral', 'duration', true, '{"abs"}'),
(null, 'Elevación de Piernas', 'bodyweight_reps', false, '{"abs"}'),
(null, 'Russian Twist', 'weight_reps', false, '{"abs"}'),
(null, 'Ab Wheel Rollout', 'bodyweight_reps', false, '{"abs"}'),
-- Cuerpo completo / Cardio
(null, 'Burpees', 'bodyweight_reps', false, '{"full_body"}'),
(null, 'Caminata en Cinta', 'distance_duration', false, '{"full_body"}'),
(null, 'Correr', 'distance_duration', false, '{"full_body"}'),
(null, 'Remo en Ergómetro', 'distance_duration', false, '{"full_body","back"}'),
(null, 'Farmer Walk', 'weight_distance', false, '{"forearms","traps","full_body"}');
