import { openDB, type IDBPDatabase } from "idb";
import type { WorkoutSessionWithEntries, Routine } from "@/types/models";

const DB_NAME = "rurana-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache");
        }
      },
    });
  }
  return dbPromise;
}

async function get<T>(key: string): Promise<T | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await getDB();
    return ((await db.get("cache", key)) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

async function set<T>(key: string, data: T): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await getDB();
    await db.put("cache", data, key);
  } catch {
    // IDB unavailable (e.g. private browsing on older iOS)
  }
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function getRoutinesCache(userId: string) {
  return get<(Routine & { exerciseNames: string[] })[]>(`routines:${userId}`);
}

export function setRoutinesCache(
  userId: string,
  data: (Routine & { exerciseNames: string[] })[],
) {
  return set(`routines:${userId}`, data);
}

export function getRecentWorkoutsCache(userId: string) {
  return get<WorkoutSessionWithEntries[]>(`recent_workouts:${userId}`);
}

export function setRecentWorkoutsCache(
  userId: string,
  data: WorkoutSessionWithEntries[],
) {
  return set(`recent_workouts:${userId}`, data);
}
