import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let initialized = false;

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;

  try {
    if (type === "INIT") {
      if (!initialized) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sqlite3: any = await (sqlite3InitModule as any)({
          print: console.log,
          printErr: console.error,
          locateFile: (file: string) => `/${file}`,
        });
        
        // OPFS SAHPool does not require COOP/COEP or SharedArrayBuffer!
        if (sqlite3.installOpfsSAHPoolVfs) {
          try {
             const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
                // Default options are usually fine, it pre-allocates file handles
                name: "rurana_sahpool"
             });
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             db = new (poolUtil as any).OpfsSAHPoolDb("/rurana_v1.sqlite3");
             console.log("OPFS SAHPool database initialized:", db.filename);
          } catch (err) {
             console.warn("OPFS-SAHPool verification failed, fallback to memory", err);
             db = new sqlite3.oo1.DB();
          }
        } else {
           console.warn("installOpfsSAHPoolVfs not available, fallback to memory");
           db = new sqlite3.oo1.DB();
        }

        // Initialize schemas
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
        initialized = true;
      }
      self.postMessage({ id, type: "SUCCESS" });
    }

    if (type === "EXEC_SYNC") {
      const { sessions } = payload;
      const insertedExercises = new Set<string>();

      db.exec("BEGIN TRANSACTION;");
      try {
        db.exec("DELETE FROM workout_sets;");
        db.exec("DELETE FROM workout_entries;");
        db.exec("DELETE FROM workout_sessions;");
        
        for (const session of sessions) {
          db.exec({
            sql: "INSERT OR REPLACE INTO workout_sessions (id, user_id, started_at, finished_at, notes) VALUES (?, ?, ?, ?, ?)",
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
              sql: "INSERT OR REPLACE INTO workout_entries (id, session_id, exercise_id, position) VALUES (?, ?, ?, ?)",
              bind: [entry.id, entry.session_id, entry.exercise_id, entry.position],
            });

            if (entry.exercise && !insertedExercises.has(entry.exercise.id)) {
              db.exec({
                sql: "INSERT OR IGNORE INTO exercise_library (id, name, muscle_groups) VALUES (?, ?, ?)",
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
                sql: "INSERT OR REPLACE INTO workout_sets (id, entry_id, position, weight_kg, reps, duration_seconds, distance_m, band_resistance, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        self.postMessage({ id, type: "SUCCESS" });
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        db.exec("ROLLBACK;");
        throw err;
      }
    }

    if (type === "EXEC_QUERY") {
      const { sql, bind = [] } = payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = [];
      db.exec({
        sql,
        bind,
        rowMode: "object",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: (row: any) => result.push(row),
      });
      self.postMessage({ id, type: "SUCCESS", payload: result });
    }

  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    self.postMessage({ id, type: "ERROR", error: err.message });
  }
};
