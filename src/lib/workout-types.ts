export type ExerciseMode = "reps" | "isometric";
export type LoadMode = "bodyweight" | "weight" | "band" | "mixed";
export type SyncState = "synced" | "pending" | "error";
export type QueueKind = "upsert-session" | "delete-session";

export interface ExerciseLibraryItem {
  id: string;
  userId: string;
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  position: number;
  reps: number | null;
  durationSeconds: number | null;
  weightKg: number | null;
  bandColor: string | null;
  bandResistance: string | null;
}

export interface WorkoutEntry {
  id: string;
  sessionId: string;
  userId: string;
  position: number;
  exerciseName: string;
  normalizedName: string;
  canonicalExerciseId: string | null;
  exerciseMode: ExerciseMode;
  loadMode: LoadMode;
  unilateral: boolean;
  defaultWeightKg: number | null;
  defaultBandColor: string | null;
  defaultBandResistance: string | null;
  notes: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  userId: string;
  date: string;
  notes: string;
  entries: WorkoutEntry[];
  syncState: SyncState;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  sessionId: string;
  kind: QueueKind;
  createdAt: string;
}

export function normalizeExerciseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sortSessions(sessions: WorkoutSession[]) {
  return [...sessions].sort((left, right) => right.date.localeCompare(left.date));
}

export function sortLibrary(items: ExerciseLibraryItem[]) {
  return [...items].sort((left, right) => {
    if (left.lastUsedAt && right.lastUsedAt) {
      return right.lastUsedAt.localeCompare(left.lastUsedAt);
    }

    if (left.lastUsedAt) {
      return -1;
    }

    if (right.lastUsedAt) {
      return 1;
    }

    return left.canonicalName.localeCompare(right.canonicalName);
  });
}

export function getSessionSummary(session: WorkoutSession | null) {
  if (!session) {
    return {
      exercises: 0,
      sets: 0,
      reps: 0,
      durationSeconds: 0,
    };
  }

  return session.entries.reduce(
    (accumulator, entry) => {
      accumulator.exercises += 1;
      accumulator.sets += entry.sets.length;
      accumulator.reps += entry.sets.reduce(
        (total, set) => total + (set.reps ?? 0),
        0,
      );
      accumulator.durationSeconds += entry.sets.reduce(
        (total, set) => total + (set.durationSeconds ?? 0),
        0,
      );
      return accumulator;
    },
    {
      exercises: 0,
      sets: 0,
      reps: 0,
      durationSeconds: 0,
    },
  );
}

export function scoreExerciseSuggestion(
  input: string,
  exercise: ExerciseLibraryItem,
) {
  const normalizedInput = normalizeExerciseName(input);
  const candidates = [
    exercise.normalizedName,
    ...exercise.aliases.map((alias) => normalizeExerciseName(alias)),
  ].filter(Boolean);

  let bestScore = 0;

  for (const candidate of candidates) {
    if (candidate === normalizedInput) {
      return 1;
    }

    if (candidate.startsWith(normalizedInput) || normalizedInput.startsWith(candidate)) {
      bestScore = Math.max(bestScore, 0.92);
      continue;
    }

    if (candidate.includes(normalizedInput) || normalizedInput.includes(candidate)) {
      bestScore = Math.max(bestScore, 0.82);
    }

    const inputTokens = new Set(normalizedInput.split(" "));
    const candidateTokens = new Set(candidate.split(" "));
    const intersection = [...inputTokens].filter((token) => candidateTokens.has(token)).length;
    const union = new Set([...inputTokens, ...candidateTokens]).size;

    if (union > 0) {
      bestScore = Math.max(bestScore, intersection / union);
    }
  }

  return bestScore;
}

export function findExerciseSuggestions(
  input: string,
  exercises: ExerciseLibraryItem[],
  limit = 3,
) {
  const normalizedInput = normalizeExerciseName(input);

  if (!normalizedInput) {
    return [];
  }

  return exercises
    .map((exercise) => ({
      exercise,
      score: scoreExerciseSuggestion(normalizedInput, exercise),
    }))
    .filter((candidate) => candidate.score >= 0.45)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((candidate) => candidate.exercise);
}
