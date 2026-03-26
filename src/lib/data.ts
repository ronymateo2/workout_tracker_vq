import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutEntry,
  WorkoutSet,
  WorkoutSessionWithEntries,
  RoutineWithExercises,
} from "@/types/models";

// ─── Exercises ───────────────────────────────────────────────────────────────

export async function getExercises(
  supabase: SupabaseClient,
  userId: string,
): Promise<Exercise[]> {
  const { data } = await supabase
    .from("exercise_library")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`);
  return (data ?? []) as Exercise[];
}

export async function createExercise(
  supabase: SupabaseClient,
  exercise: Exercise,
): Promise<void> {
  await supabase.from("exercise_library").insert(exercise);
}

export async function getExerciseById(
  supabase: SupabaseClient,
  id: string,
): Promise<Exercise | undefined> {
  const { data } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? undefined;
}

// ─── Routines ────────────────────────────────────────────────────────────────

export async function getRoutines(
  supabase: SupabaseClient,
  userId: string,
): Promise<Routine[]> {
  const { data } = await supabase
    .from("routines")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Routine[];
}

export async function getRoutineWithExercises(
  supabase: SupabaseClient,
  routineId: string,
): Promise<RoutineWithExercises | null> {
  const { data: routine } = await supabase
    .from("routines")
    .select("*")
    .eq("id", routineId)
    .maybeSingle();
  if (!routine) return null;

  const { data: routineExercises } = await supabase
    .from("routine_exercises")
    .select("*")
    .eq("routine_id", routineId)
    .order("position");

  const exercises: RoutineWithExercises["exercises"] = [];
  for (const re of routineExercises ?? []) {
    const { data: exercise } = await supabase
      .from("exercise_library")
      .select("*")
      .eq("id", re.exercise_id)
      .maybeSingle();
    if (exercise) {
      exercises.push({ ...re, exercise } as RoutineExercise & { exercise: Exercise });
    }
  }

  return { ...routine, exercises } as RoutineWithExercises;
}

export async function createRoutine(
  supabase: SupabaseClient,
  routine: Routine,
  exercises: RoutineExercise[],
): Promise<void> {
  await supabase.from("routines").insert(routine);
  if (exercises.length > 0) {
    await supabase.from("routine_exercises").insert(exercises);
  }
}

export async function updateRoutine(
  supabase: SupabaseClient,
  routine: Routine,
  exercises: RoutineExercise[],
): Promise<void> {
  await supabase
    .from("routines")
    .update({ name: routine.name, updated_at: new Date().toISOString() })
    .eq("id", routine.id);

  await supabase.from("routine_exercises").delete().eq("routine_id", routine.id);
  if (exercises.length > 0) {
    await supabase.from("routine_exercises").insert(exercises);
  }
}

export async function deleteRoutine(
  supabase: SupabaseClient,
  routineId: string,
): Promise<void> {
  await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  await supabase.from("routines").delete().eq("id", routineId);
}

// ─── Workout Sessions ────────────────────────────────────────────────────────

export async function startWorkoutSession(
  supabase: SupabaseClient,
  session: WorkoutSession,
): Promise<void> {
  await supabase.from("workout_sessions").insert(session);
}

export async function finishWorkoutSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function updateSessionNotes(
  supabase: SupabaseClient,
  sessionId: string,
  notes: string,
): Promise<void> {
  await supabase
    .from("workout_sessions")
    .update({ notes })
    .eq("id", sessionId);
}

export async function deleteWorkoutSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { data: entries } = await supabase
    .from("workout_entries")
    .select("id")
    .eq("session_id", sessionId);

  for (const entry of entries ?? []) {
    await supabase.from("workout_sets").delete().eq("entry_id", entry.id);
  }
  await supabase.from("workout_entries").delete().eq("session_id", sessionId);
  await supabase.from("workout_sessions").delete().eq("id", sessionId);
}

// ─── Workout Entries ─────────────────────────────────────────────────────────

export async function addWorkoutEntry(
  supabase: SupabaseClient,
  entry: WorkoutEntry,
): Promise<void> {
  await supabase.from("workout_entries").insert(entry);
}

export async function removeWorkoutEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<void> {
  await supabase.from("workout_sets").delete().eq("entry_id", entryId);
  await supabase.from("workout_entries").delete().eq("id", entryId);
}

export async function getEntriesForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<WorkoutEntry[]> {
  const { data } = await supabase
    .from("workout_entries")
    .select("*")
    .eq("session_id", sessionId)
    .order("position");
  return (data ?? []) as WorkoutEntry[];
}

// ─── Workout Sets ────────────────────────────────────────────────────────────

export async function addWorkoutSet(
  supabase: SupabaseClient,
  set: WorkoutSet,
): Promise<void> {
  await supabase.from("workout_sets").insert(set);
}

export async function updateWorkoutSet(
  supabase: SupabaseClient,
  setId: string,
  data: Partial<WorkoutSet>,
): Promise<void> {
  await supabase.from("workout_sets").update(data).eq("id", setId);
}

export async function deleteWorkoutSet(
  supabase: SupabaseClient,
  setId: string,
): Promise<void> {
  await supabase.from("workout_sets").delete().eq("id", setId);
}

export async function getSetsForEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<WorkoutSet[]> {
  const { data } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("entry_id", entryId)
    .order("position");
  return (data ?? []) as WorkoutSet[];
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getRecentWorkouts(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<WorkoutSessionWithEntries[]> {
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  const result: WorkoutSessionWithEntries[] = [];
  for (const session of sessions ?? []) {
    const { data: entries } = await supabase
      .from("workout_entries")
      .select("*")
      .eq("session_id", session.id)
      .order("position");

    const entriesWithDetails = await Promise.all(
      (entries ?? []).map(async (entry) => {
        const { data: exercise } = await supabase
          .from("exercise_library")
          .select("*")
          .eq("id", entry.exercise_id)
          .maybeSingle();
        const { data: sets } = await supabase
          .from("workout_sets")
          .select("*")
          .eq("entry_id", entry.id)
          .order("position");
        return { ...entry, exercise: exercise!, sets: (sets ?? []) as WorkoutSet[] };
      }),
    );

    result.push({ ...session, entries: entriesWithDetails });
  }

  return result;
}

export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkoutSession | null> {
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("finished_at", null)
    .limit(1)
    .maybeSingle();
  return (data ?? null) as WorkoutSession | null;
}

export async function getWorkoutCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("finished_at", "is", null);
  return count ?? 0;
}

export async function getTrainingDays(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number,
): Promise<Set<number>> {
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .gte("started_at", startDate)
    .lte("started_at", endDate);

  const days = new Set<number>();
  for (const s of data ?? []) {
    days.add(new Date(s.started_at).getDate());
  }
  return days;
}

// ─── Previous Sets (for ANTERIOR column) ─────────────────────────────────────

export async function getPreviousSetsForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
): Promise<WorkoutSet[]> {
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false });

  for (const session of sessions ?? []) {
    const { data: entries } = await supabase
      .from("workout_entries")
      .select("*")
      .eq("session_id", session.id)
      .eq("exercise_id", exerciseId)
      .limit(1);

    if (entries && entries.length > 0) {
      const { data: sets } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("entry_id", entries[0].id)
        .order("position");
      return (sets ?? []) as WorkoutSet[];
    }
  }

  return [];
}
