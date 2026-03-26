import { getDB } from "./db";
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

export async function getExercises(userId: string): Promise<Exercise[]> {
  const db = await getDB();
  const all = await db.getAll("exercises");
  return all.filter((e) => e.user_id === null || e.user_id === userId);
}

export async function createExercise(exercise: Exercise): Promise<void> {
  const db = await getDB();
  await db.put("exercises", { ...exercise, _sync_status: "pending" });
}

export async function getExerciseById(id: string): Promise<Exercise | undefined> {
  const db = await getDB();
  return db.get("exercises", id);
}

// ─── Routines ────────────────────────────────────────────────────────────────

export async function getRoutines(userId: string): Promise<Routine[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("routines", "by-user", userId);
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function getRoutineWithExercises(
  routineId: string,
): Promise<RoutineWithExercises | null> {
  const db = await getDB();
  const routine = await db.get("routines", routineId);
  if (!routine) return null;

  const routineExercises = await db.getAllFromIndex(
    "routine_exercises",
    "by-routine",
    routineId,
  );
  routineExercises.sort((a, b) => a.position - b.position);

  const exercises: RoutineWithExercises["exercises"] = [];
  for (const re of routineExercises) {
    const exercise = await db.get("exercises", re.exercise_id);
    if (exercise) {
      exercises.push({ ...re, exercise });
    }
  }

  return { ...routine, exercises };
}

export async function createRoutine(
  routine: Routine,
  exercises: RoutineExercise[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["routines", "routine_exercises"], "readwrite");
  await tx.objectStore("routines").put({ ...routine, _sync_status: "pending" });
  for (const re of exercises) {
    await tx.objectStore("routine_exercises").put({ ...re, _sync_status: "pending" });
  }
  await tx.done;
}

export async function updateRoutine(
  routine: Routine,
  exercises: RoutineExercise[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["routines", "routine_exercises"], "readwrite");
  await tx.objectStore("routines").put({
    ...routine,
    updated_at: new Date().toISOString(),
    _sync_status: "pending",
  });

  // Remove old routine exercises
  const reStore = tx.objectStore("routine_exercises");
  const existing = await reStore.index("by-routine").getAll(routine.id);
  for (const re of existing) {
    await reStore.delete(re.id);
  }
  // Add new ones
  for (const re of exercises) {
    await reStore.put({ ...re, _sync_status: "pending" });
  }
  await tx.done;
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["routines", "routine_exercises"], "readwrite");
  await tx.objectStore("routines").delete(routineId);
  const reStore = tx.objectStore("routine_exercises");
  const existing = await reStore.index("by-routine").getAll(routineId);
  for (const re of existing) {
    await reStore.delete(re.id);
  }
  await tx.done;
}

// ─── Workout Sessions ────────────────────────────────────────────────────────

export async function startWorkoutSession(session: WorkoutSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", { ...session, _sync_status: "pending" });
}

export async function finishWorkoutSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const session = await db.get("sessions", sessionId);
  if (!session) return;
  await db.put("sessions", {
    ...session,
    finished_at: new Date().toISOString(),
    _sync_status: "pending",
  });
}

export async function updateSessionNotes(
  sessionId: string,
  notes: string,
): Promise<void> {
  const db = await getDB();
  const session = await db.get("sessions", sessionId);
  if (!session) return;
  await db.put("sessions", { ...session, notes, _sync_status: "pending" });
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["sessions", "entries", "sets"], "readwrite");

  // Delete sets for each entry
  const entryStore = tx.objectStore("entries");
  const setStore = tx.objectStore("sets");
  const entries = await entryStore.index("by-session").getAll(sessionId);
  for (const entry of entries) {
    const sets = await setStore.index("by-entry").getAll(entry.id);
    for (const set of sets) {
      await setStore.delete(set.id);
    }
    await entryStore.delete(entry.id);
  }

  await tx.objectStore("sessions").delete(sessionId);
  await tx.done;
}

// ─── Workout Entries ─────────────────────────────────────────────────────────

export async function addWorkoutEntry(entry: WorkoutEntry): Promise<void> {
  const db = await getDB();
  await db.put("entries", { ...entry, _sync_status: "pending" });
}

export async function removeWorkoutEntry(entryId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["entries", "sets"], "readwrite");

  // Delete sets for entry
  const setStore = tx.objectStore("sets");
  const sets = await setStore.index("by-entry").getAll(entryId);
  for (const set of sets) {
    await setStore.delete(set.id);
  }

  await tx.objectStore("entries").delete(entryId);
  await tx.done;
}

export async function getEntriesForSession(
  sessionId: string,
): Promise<WorkoutEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("entries", "by-session", sessionId);
  return entries.sort((a, b) => a.position - b.position);
}

// ─── Workout Sets ────────────────────────────────────────────────────────────

export async function addWorkoutSet(set: WorkoutSet): Promise<void> {
  const db = await getDB();
  await db.put("sets", { ...set, _sync_status: "pending" });
}

export async function updateWorkoutSet(
  setId: string,
  data: Partial<WorkoutSet>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("sets", setId);
  if (!existing) return;
  await db.put("sets", { ...existing, ...data, _sync_status: "pending" });
}

export async function deleteWorkoutSet(setId: string): Promise<void> {
  const db = await getDB();
  await db.delete("sets", setId);
}

export async function getSetsForEntry(entryId: string): Promise<WorkoutSet[]> {
  const db = await getDB();
  const sets = await db.getAllFromIndex("sets", "by-entry", entryId);
  return sets.sort((a, b) => a.position - b.position);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getRecentWorkouts(
  userId: string,
  limit = 20,
): Promise<WorkoutSessionWithEntries[]> {
  const db = await getDB();
  const allSessions = await db.getAllFromIndex("sessions", "by-user", userId);

  // Only finished sessions, sorted newest first
  const finished = allSessions
    .filter((s) => s.finished_at !== null)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )
    .slice(0, limit);

  const result: WorkoutSessionWithEntries[] = [];
  for (const session of finished) {
    const entries = await db.getAllFromIndex("entries", "by-session", session.id);
    entries.sort((a, b) => a.position - b.position);

    const entriesWithDetails = await Promise.all(
      entries.map(async (entry) => {
        const exercise = await db.get("exercises", entry.exercise_id);
        const sets = await db.getAllFromIndex("sets", "by-entry", entry.id);
        sets.sort((a, b) => a.position - b.position);
        return {
          ...entry,
          exercise: exercise!,
          sets,
        };
      }),
    );

    result.push({ ...session, entries: entriesWithDetails });
  }

  return result;
}

export async function getActiveSession(
  userId: string,
): Promise<WorkoutSession | null> {
  const db = await getDB();
  const allSessions = await db.getAllFromIndex("sessions", "by-user", userId);
  return allSessions.find((s) => s.finished_at === null) ?? null;
}

export async function getWorkoutCount(userId: string): Promise<number> {
  const db = await getDB();
  const allSessions = await db.getAllFromIndex("sessions", "by-user", userId);
  return allSessions.filter((s) => s.finished_at !== null).length;
}

export async function getTrainingDays(
  userId: string,
  year: number,
  month: number,
): Promise<Set<number>> {
  const db = await getDB();
  const allSessions = await db.getAllFromIndex("sessions", "by-user", userId);
  const days = new Set<number>();

  for (const s of allSessions) {
    if (!s.finished_at) continue;
    const d = new Date(s.started_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      days.add(d.getDate());
    }
  }

  return days;
}

// ─── Previous Sets (for ANTERIOR column) ─────────────────────────────────────

export async function getPreviousSetsForExercise(
  userId: string,
  exerciseId: string,
): Promise<WorkoutSet[]> {
  const db = await getDB();
  const allSessions = await db.getAllFromIndex("sessions", "by-user", userId);

  // Find the most recent finished session that includes this exercise
  const finished = allSessions
    .filter((s) => s.finished_at !== null)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

  for (const session of finished) {
    const entries = await db.getAllFromIndex("entries", "by-session", session.id);
    const matchingEntry = entries.find((e) => e.exercise_id === exerciseId);
    if (matchingEntry) {
      const sets = await db.getAllFromIndex("sets", "by-entry", matchingEntry.id);
      return sets.sort((a, b) => a.position - b.position);
    }
  }

  return [];
}
