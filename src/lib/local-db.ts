import { openDB, type DBSchema } from "idb";
import type {
  ExerciseLibraryItem,
  SyncQueueItem,
  WorkoutSession,
} from "@/lib/workout-types";

interface WorkoutDbSchema extends DBSchema {
  sessions: {
    key: string;
    value: WorkoutSession;
  };
  library: {
    key: string;
    value: ExerciseLibraryItem;
  };
  queue: {
    key: string;
    value: SyncQueueItem;
  };
}

const DB_NAME = "rurana-workout-tracker";
const DB_VERSION = 1;

function getDb() {
  return openDB<WorkoutDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("sessions")) {
        database.createObjectStore("sessions", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("library")) {
        database.createObjectStore("library", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("queue")) {
        database.createObjectStore("queue", { keyPath: "id" });
      }
    },
  });
}

export async function getLocalSessions(userId: string) {
  const database = await getDb();
  const sessions = await database.getAll("sessions");
  return sessions.filter((session) => session.userId === userId);
}

export async function getLocalLibrary(userId: string) {
  const database = await getDb();
  const items = await database.getAll("library");
  return items.filter((item) => item.userId === userId);
}

export async function getPendingQueueItems(userId: string) {
  const database = await getDb();
  const items = await database.getAll("queue");
  return items
    .filter((item) => item.userId === userId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function putSessions(sessions: WorkoutSession[]) {
  const database = await getDb();
  const transaction = database.transaction("sessions", "readwrite");

  for (const session of sessions) {
    transaction.store.put(session);
  }

  await transaction.done;
}

export async function saveSessionToLocal(
  session: WorkoutSession,
  shouldQueue = true,
) {
  const database = await getDb();
  const transaction = database.transaction(["sessions", "queue"], "readwrite");
  transaction.objectStore("sessions").put(session);

  if (shouldQueue) {
    transaction.objectStore("queue").put({
      id: session.id,
      userId: session.userId,
      sessionId: session.id,
      kind: "upsert-session",
      createdAt: new Date().toISOString(),
    });
  }

  await transaction.done;
}

export async function deleteSessionFromLocal(
  sessionId: string,
  userId: string,
  shouldQueue = true,
) {
  const database = await getDb();
  const transaction = database.transaction(["sessions", "queue"], "readwrite");
  transaction.objectStore("sessions").delete(sessionId);

  if (shouldQueue) {
    transaction.objectStore("queue").put({
      id: sessionId,
      userId,
      sessionId,
      kind: "delete-session",
      createdAt: new Date().toISOString(),
    });
  } else {
    transaction.objectStore("queue").delete(sessionId);
  }

  await transaction.done;
}

export async function putLibraryItems(items: ExerciseLibraryItem[]) {
  const database = await getDb();
  const transaction = database.transaction("library", "readwrite");

  for (const item of items) {
    transaction.store.put(item);
  }

  await transaction.done;
}

export async function deleteQueueItem(id: string) {
  const database = await getDb();
  await database.delete("queue", id);
}
