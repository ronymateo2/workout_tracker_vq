import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutEntry,
  WorkoutSet,
} from "@/types/models";

// ─── Schema ──────────────────────────────────────────────────────────────────

interface RuranaDB extends DBSchema {
  exercises: {
    key: string;
    value: Exercise;
    indexes: { "by-user": string | null };
  };
  routines: {
    key: string;
    value: Routine;
    indexes: { "by-user": string };
  };
  routine_exercises: {
    key: string;
    value: RoutineExercise;
    indexes: { "by-routine": string };
  };
  sessions: {
    key: string;
    value: WorkoutSession;
    indexes: { "by-user": string; "by-started": string };
  };
  entries: {
    key: string;
    value: WorkoutEntry;
    indexes: { "by-session": string };
  };
  sets: {
    key: string;
    value: WorkoutSet;
    indexes: { "by-entry": string };
  };
}

// ─── Database singleton ──────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<RuranaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<RuranaDB>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<RuranaDB>("rurana-db", 1, {
    upgrade(db) {
      // exercises
      const exerciseStore = db.createObjectStore("exercises", { keyPath: "id" });
      exerciseStore.createIndex("by-user", "user_id");

      // routines
      const routineStore = db.createObjectStore("routines", { keyPath: "id" });
      routineStore.createIndex("by-user", "user_id");

      // routine_exercises
      const reStore = db.createObjectStore("routine_exercises", { keyPath: "id" });
      reStore.createIndex("by-routine", "routine_id");

      // sessions
      const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
      sessionStore.createIndex("by-user", "user_id");
      sessionStore.createIndex("by-started", "started_at");

      // entries
      const entryStore = db.createObjectStore("entries", { keyPath: "id" });
      entryStore.createIndex("by-session", "session_id");

      // sets
      const setStore = db.createObjectStore("sets", { keyPath: "id" });
      setStore.createIndex("by-entry", "entry_id");
    },
  });

  return dbPromise;
}
