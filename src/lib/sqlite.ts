import type { WorkoutSessionWithEntries } from "@/types/models";

let worker: Worker | null = null;
let msgId = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolvers = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

/**
 * Gets or initializes the SQLite Web Worker.
 */
async function getWorker() {
  if (typeof window === "undefined") {
    throw new Error("SQLite WASM is only supported in the browser.");
  }

  if (!worker) {
    worker = new Worker(new URL("./sqlite.worker.ts", import.meta.url));
    worker.onmessage = (e) => {
      const { id, type, payload, error } = e.data;
      const promise = resolvers.get(id);
      if (promise) {
        resolvers.delete(id);
        if (type === "ERROR") {
          promise.reject(new Error(error));
        } else {
          promise.resolve(payload);
        }
      }
    };
    
    // Initialize the DB inside the worker
    await sendMsg("INIT", {});
  }

  return worker;
}

/**
 * Sends a message to the worker and returns a Promise that resolves when the worker replies.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendMsg(type: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    resolvers.set(id, { resolve, reject });
    worker?.postMessage({ id, type, payload });
  });
}

/**
 * Synchronize fetched Supabase data into the local SQLite database via Worker.
 */
export async function syncWorkoutsToSqlite(
  sessions: WorkoutSessionWithEntries[]
) {
  await getWorker();
  await sendMsg("EXEC_SYNC", { sessions });
}

/**
 * Executes a simple test query to verify data was correctly inserted
 */
export async function runSQLiteTestQuery() {
  await getWorker();
  const rows = await sendMsg("EXEC_QUERY", { 
    sql: "SELECT COUNT(*) as total_sets FROM workout_sets;" 
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[])[0]?.total_sets ?? 0;
}

/**
 * Prints a sample of the data to the browser console for debugging.
 */
export async function debugSqliteData() {
  await getWorker();
  
  const tables = ["workout_sessions", "workout_entries", "workout_sets", "exercise_library"];
  
  console.group("SQLite WASM Web Worker Database");
  for (const table of tables) {
    try {
      const rows = await sendMsg("EXEC_QUERY", {
        sql: `SELECT * FROM ${table} LIMIT 5;`
      });
      console.log(`Tabla: ${table} (hasta 5 registros)`);
      if (rows && rows.length > 0) {
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
