-- Auth is now handled by a custom Google OAuth + Supabase-compatible JWT system.
-- User IDs are deterministic UUIDs derived from Google sub (SHA-256 of "google:{sub}"),
-- not rows in auth.users. These FK constraints blocked all writes.
-- RLS policies (auth.uid() = user_id) continue to work because PostgREST reads
-- auth.uid() from the JWT sub claim when a Supabase-compatible JWT is passed.

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.exercise_library
  drop constraint if exists exercise_library_user_id_fkey;

alter table public.workout_sessions
  drop constraint if exists workout_sessions_user_id_fkey;

alter table public.workout_entries
  drop constraint if exists workout_entries_user_id_fkey;

alter table public.workout_sets
  drop constraint if exists workout_sets_user_id_fkey;
