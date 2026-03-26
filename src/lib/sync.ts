/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDB } from "./db";
import type {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutEntry,
  WorkoutSet,
} from "@/types/models";

// ─── Pull from Supabase → IndexedDB ─────────────────────────────────────────

export async function pullFromSupabase(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const db = await getDB();

  // Pull exercises (global + user's)
  const { data: exercises } = await supabase
    .from("exercise_library")
    .select("*");

  if (exercises) {
    const tx = db.transaction("exercises", "readwrite");
    for (const e of exercises) {
      const existing = await tx.store.get(e.id);
      // Don't overwrite local pending changes
      if (!existing || existing._sync_status !== "pending") {
        await tx.store.put({
          id: e.id,
          user_id: e.user_id,
          name: e.name,
          exercise_type: e.exercise_type,
          unilateral: e.unilateral,
          muscle_groups: e.muscle_groups,
          created_at: e.created_at,
          _sync_status: "synced",
        });
      }
    }
    await tx.done;
  }

  // Pull routines
  const { data: routines } = await supabase
    .from("routines")
    .select("*")
    .eq("user_id", userId);

  if (routines) {
    const tx = db.transaction("routines", "readwrite");
    for (const r of routines) {
      const existing = await tx.store.get(r.id);
      if (!existing || existing._sync_status !== "pending") {
        await tx.store.put({
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          created_at: r.created_at,
          updated_at: r.updated_at,
          _sync_status: "synced",
        });
      }
    }
    await tx.done;
  }

  // Pull routine exercises
  if (routines && routines.length > 0) {
    const routineIds = routines.map((r) => r.id);
    const { data: routineExercises } = await supabase
      .from("routine_exercises")
      .select("*")
      .in("routine_id", routineIds);

    if (routineExercises) {
      const tx = db.transaction("routine_exercises", "readwrite");
      for (const re of routineExercises) {
        const existing = await tx.store.get(re.id);
        if (!existing || existing._sync_status !== "pending") {
          await tx.store.put({
            id: re.id,
            routine_id: re.routine_id,
            exercise_id: re.exercise_id,
            position: re.position,
            default_sets: re.default_sets,
            _sync_status: "synced",
          });
        }
      }
      await tx.done;
    }
  }

  // Pull sessions
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId);

  if (sessions) {
    const tx = db.transaction("sessions", "readwrite");
    for (const s of sessions) {
      const existing = await tx.store.get(s.id);
      if (!existing || existing._sync_status !== "pending") {
        await tx.store.put({
          id: s.id,
          user_id: s.user_id,
          routine_id: s.routine_id,
          started_at: s.started_at,
          finished_at: s.finished_at,
          notes: s.notes,
          _sync_status: "synced",
        });
      }
    }
    await tx.done;
  }

  // Pull entries and sets
  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    const { data: entries } = await supabase
      .from("workout_entries")
      .select("*")
      .in("session_id", sessionIds);

    if (entries) {
      const tx = db.transaction("entries", "readwrite");
      for (const e of entries) {
        const existing = await tx.store.get(e.id);
        if (!existing || existing._sync_status !== "pending") {
          await tx.store.put({
            id: e.id,
            session_id: e.session_id,
            exercise_id: e.exercise_id,
            position: e.position,
            _sync_status: "synced",
          });
        }
      }
      await tx.done;

      const entryIds = entries.map((e) => e.id);
      const { data: sets } = await supabase
        .from("workout_sets")
        .select("*")
        .in("entry_id", entryIds);

      if (sets) {
        const tx2 = db.transaction("sets", "readwrite");
        for (const s of sets) {
          const existing = await tx2.store.get(s.id);
          if (!existing || existing._sync_status !== "pending") {
            await tx2.store.put({
              id: s.id,
              entry_id: s.entry_id,
              position: s.position,
              weight_kg: s.weight_kg,
              reps: s.reps,
              duration_seconds: s.duration_seconds,
              distance_m: s.distance_m,
              band_color: s.band_color,
              band_resistance: s.band_resistance,
              completed: s.completed,
              _sync_status: "synced",
            });
          }
        }
        await tx2.done;
      }
    }
  }
}

// ─── Push pending from IndexedDB → Supabase ─────────────────────────────────

async function pushStore<T extends { id: string; _sync_status?: string }>(
  supabase: SupabaseClient,
  storeName:
    | "exercises"
    | "routines"
    | "routine_exercises"
    | "sessions"
    | "entries"
    | "sets",
  tableName: string,
): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(storeName);
  const pending = all.filter((item) => item._sync_status === "pending");

  for (const item of pending) {
    // Strip _sync_status before sending to Supabase
    const { _sync_status, ...data } = item as unknown as T & {
      _sync_status?: string;
    };
    const { error } = await supabase.from(tableName).upsert(data);

    if (!error) {
      await db.put(storeName, { ...item, _sync_status: "synced" });
    } else {
      console.error(`Sync error for ${tableName}:`, error);
    }
  }
}

export async function pushToSupabase(supabase: SupabaseClient): Promise<void> {
  // Order matters: parent tables first
  await pushStore(supabase, "exercises", "exercise_library");
  await pushStore(supabase, "routines", "routines");
  await pushStore(supabase, "routine_exercises", "routine_exercises");
  await pushStore(supabase, "sessions", "workout_sessions");
  await pushStore(supabase, "entries", "workout_entries");
  await pushStore(supabase, "sets", "workout_sets");
}

// ─── Full sync ───────────────────────────────────────────────────────────────

export async function syncAll(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    await pushToSupabase(supabase);
    await pullFromSupabase(supabase, userId);
  } catch (err) {
    console.error("Sync failed:", err);
  }
}
