import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import type { WorkoutSessionWithEntries } from "@/types/models";

// Define a type for the DB to avoid explicit 'any' where possible, 
// though the official wasm package's TS support is limited.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sqlite3DB = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exec: (options: string | { sql: string; bind?: any[]; returnValue?: string; rowMode?: string; callback?: (row: any) => void }) => void;
  close: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbPromise: Promise<{ db: Sqlite3DB; sqlite3: any }> | null = null;

export async function getSqliteDb() {
  if (typeof window === "undefined") {
    throw new Error("SQLite WASM is only supported in the browser.");
  }

  if (!dbPromise) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbPromise = (sqlite3InitModule as any)({
      print: console.log,
      printErr: console.error,
      locateFile: (file: string) => `/${file}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).then((sqlite3: any) => {
      // Create an in-memory database
      const db = new sqlite3.oo1.DB();

      // Initialize schemas needed for future charts
      db.exec(`
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          started_at TEXT,
          finished_at TEXT,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS workout_entries (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          exercise_id TEXT,
          position INTEGER
        );

        CREATE TABLE IF NOT EXISTS workout_sets (
          id TEXT PRIMARY KEY,
          entry_id TEXT,
          position INTEGER,
          weight_kg REAL,
          reps INTEGER,
          duration_seconds REAL,
          distance_m REAL,
          band_resistance REAL,
          completed INTEGER
        );

        CREATE TABLE IF NOT EXISTS exercise_library (
          id TEXT PRIMARY KEY,
          name TEXT,
          muscle_groups TEXT
        );
      `);

      return { db, sqlite3 };
    });
  }

  return dbPromise!;
}

/**
 * Synchronize fetched Supabase data into the local in-memory SQLite database.
 */
export async function syncWorkoutsToSqlite(
  sessions: WorkoutSessionWithEntries[]
) {
  const { db } = await getSqliteDb();

  // Simple sync: clear existing and re-insert 
  // (since it's an in-memory db, it's mostly empty initially, but good practice if called multiple times)
  db.exec("DELETE FROM workout_sets;");
  db.exec("DELETE FROM workout_entries;");
  db.exec("DELETE FROM workout_sessions;");
  db.exec("DELETE FROM exercise_library;"); // Optional, may want to sync exercises separately

  const insertedExercises = new Set<string>();

  // Transaction for batch insert performance
  db.exec("BEGIN TRANSACTION;");

  try {
    for (const session of sessions) {
      db.exec({
        sql: "INSERT INTO workout_sessions (id, user_id, started_at, finished_at, notes) VALUES (?, ?, ?, ?, ?)",
        bind: [
          session.id,
          session.user_id,
          session.started_at,
          session.finished_at ?? null,
          session.notes ?? null,
        ],
      });

      for (const entry of session.entries) {
        db.exec({
          sql: "INSERT INTO workout_entries (id, session_id, exercise_id, position) VALUES (?, ?, ?, ?)",
          bind: [
            entry.id,
            entry.session_id,
            entry.exercise_id,
            entry.position,
          ],
        });

        if (entry.exercise && !insertedExercises.has(entry.exercise.id)) {
          db.exec({
            sql: "INSERT INTO exercise_library (id, name, muscle_groups) VALUES (?, ?, ?)",
            bind: [
              entry.exercise.id,
              entry.exercise.name,
              JSON.stringify(entry.exercise.muscle_groups || []),
            ],
          });
          insertedExercises.add(entry.exercise.id);
        }

        for (const set of entry.sets) {
          db.exec({
            sql: "INSERT INTO workout_sets (id, entry_id, position, weight_kg, reps, duration_seconds, distance_m, band_resistance, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            bind: [
              set.id,
              set.entry_id,
              set.position,
              set.weight_kg ?? null,
              set.reps ?? null,
              set.duration_seconds ?? null,
              set.distance_m ?? null,
              set.band_resistance ?? null,
              set.completed ? 1 : 0,
            ],
          });
        }
      }
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    console.error("Failed to sync data to SQLite:", error);
    throw error;
  }
}

/**
 * Executes a simple test query to verify data was correctly inserted
 */
export async function runSQLiteTestQuery() {
  const { db } = await getSqliteDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  
  db.exec({
    sql: "SELECT COUNT(*) as total_sets FROM workout_sets;",
    returnValue: "resultRows"
  });
  
  // Actually, returnValue doesn't just return it like that without a rowMode
  // Let's use a standard array push to get the rows
  db.exec({
    sql: "SELECT COUNT(*) as total_sets FROM workout_sets;",
    rowMode: "object",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: function (row: any) {
      result.push(row);
    }
  });

  return result[0]?.total_sets ?? 0;
}

/**
 * Prints a sample of the data to the browser console for debugging.
 */
export async function debugSqliteData() {
  const { db } = await getSqliteDb();
  
  const tables = ["workout_sessions", "workout_entries", "workout_sets", "exercise_library"];
  
  console.group("SQLite WASM In-Memory Database");
  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = [];
    try {
      db.exec({
        sql: `SELECT * FROM ${table} LIMIT 5;`,
        rowMode: "object",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: (row: any) => rows.push(row)
      });
      console.log(`Tabla: ${table} (hasta 5 registros)`);
      if (rows.length > 0) {
        console.table(rows);
      } else {
        console.log("(vacía)");
      }
    } catch (e) {
      console.error(`Error leyendo ${table}`, e);
    }
  }
  console.groupEnd();
}
