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
  WorkoutEntryWithDetails,
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

export async function getExercisesByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("exercise_library")
    .select("*")
    .in("id", ids);
  return (data ?? []) as Exercise[];
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

export async function getRoutinesWithExerciseNames(
  supabase: SupabaseClient,
  userId: string,
): Promise<(Routine & { exerciseNames: string[] })[]> {
  const { data: routines } = await supabase
    .from("routines")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (!routines?.length) return [];

  const routineIds = routines.map((r) => r.id as string);
  const { data: reRows } = await supabase
    .from("routine_exercises")
    .select("routine_id, position, exercise_library(name)")
    .in("routine_id", routineIds)
    .order("position");

  const namesByRoutine: Record<string, string[]> = {};
  for (const row of reRows ?? []) {
    const name = (row.exercise_library as unknown as { name: string } | null)
      ?.name;
    if (!name) continue;
    if (!namesByRoutine[row.routine_id]) namesByRoutine[row.routine_id] = [];
    namesByRoutine[row.routine_id].push(name);
  }

  return routines.map((r) => ({
    ...(r as Routine),
    exerciseNames: namesByRoutine[r.id] ?? [],
  }));
}

export async function getRoutineWithExercises(
  supabase: SupabaseClient,
  routineId: string,
): Promise<RoutineWithExercises | null> {
  const { data } = await supabase
    .from("routines")
    .select(
      `
      *,
      exercises:routine_exercises(
        *,
        exercise:exercise_library(*)
      )
    `,
    )
    .eq("id", routineId)
    .maybeSingle();

  if (!data) return null;

  type RawExerciseRow = RoutineExercise & { exercise: Exercise | null };
  const exercises = ((data.exercises ?? []) as RawExerciseRow[])
    .filter((re) => re.exercise !== null)
    .sort(
      (a, b) => a.position - b.position,
    ) as RoutineWithExercises["exercises"];

  return { ...data, exercises } as RoutineWithExercises;
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

  await supabase
    .from("routine_exercises")
    .delete()
    .eq("routine_id", routine.id);
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
  await supabase.from("workout_sessions").update({ notes }).eq("id", sessionId);
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

export async function getEntriesWithDetailsForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<WorkoutEntryWithDetails[]> {
  const { data } = await supabase
    .from("workout_entries")
    .select(
      `
      *,
      exercise:exercise_library(*),
      sets:workout_sets(*)
    `,
    )
    .eq("session_id", sessionId)
    .order("position");

  return (data ?? []).flatMap((entry) => {
    if (!entry.exercise) return [];
    return [
      {
        ...entry,
        sets: ((entry.sets ?? []) as WorkoutSet[]).sort(
          (a, b) => a.position - b.position,
        ),
      } as WorkoutEntryWithDetails,
    ];
  });
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

export async function getSetsForEntries(
  supabase: SupabaseClient,
  entryIds: string[],
): Promise<WorkoutSet[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase
    .from("workout_sets")
    .select("*")
    .in("entry_id", entryIds)
    .order("position");
  return (data ?? []) as WorkoutSet[];
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getRecentWorkouts(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<WorkoutSessionWithEntries[]> {
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      `
      *,
      entries:workout_entries(
        *,
        exercise:exercise_library(*),
        sets:workout_sets(*)
      )
    `,
    )
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .order("position", { referencedTable: "workout_entries" })
    .order("position", { referencedTable: "workout_entries.workout_sets" })
    .limit(limit);

  return (data ?? []).map((session) => ({
    ...session,
    entries: ((session.entries ?? []) as WorkoutEntryWithDetails[])
      .filter((e) => e.exercise)
      .map((e) => ({
        ...e,
        sets: ((e.sets ?? []) as WorkoutSet[]).sort(
          (a, b) => a.position - b.position,
        ),
      }))
      .sort((a, b) => a.position - b.position),
  })) as WorkoutSessionWithEntries[];
}

// For each exercise, fetch the most recent finished session that included it
// and return its sets. One query per exercise (run in parallel) with limit(1)
// on the session level — guarantees exactly 1 result per exercise regardless
// of history size, routine, muscle group, or sessionless workouts.
export async function getPrevSetsForExercises(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
  currentSessionId: string,
): Promise<Record<string, WorkoutSet[]>> {
  if (exerciseIds.length === 0) return {};

  const results = await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const { data } = await supabase
        .from("workout_sessions")
        .select(
          `entries:workout_entries!inner(
             exercise_id,
             sets:workout_sets(*)
           )`,
        )
        .eq("user_id", userId)
        .not("finished_at", "is", null)
        .neq("id", currentSessionId)
        .eq("workout_entries.exercise_id", exerciseId)
        .order("started_at", { ascending: false })
        .order("position", { referencedTable: "workout_entries.workout_sets" })
        .limit(1);

      const sets = (data?.[0]?.entries?.[0]?.sets ?? []) as WorkoutSet[];
      return { exerciseId, sets };
    }),
  );

  const map: Record<string, WorkoutSet[]> = {};
  for (const { exerciseId, sets } of results) {
    if (sets.length > 0) map[exerciseId] = sets;
  }
  return map;
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
