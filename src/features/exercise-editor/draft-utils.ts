import type {
  ExerciseLibraryItem,
  WorkoutEntry,
  WorkoutSet,
} from "@/lib/workout-types";
import { normalizeExerciseName } from "@/lib/workout-types";

export interface DraftSet {
  id: string;
  reps: string;
  durationSeconds: string;
  weightKg: string;
  bandColor: string;
  bandResistance: string;
}

export interface ExerciseDraft {
  id: string;
  exerciseName: string;
  canonicalExerciseId: string | null;
  exerciseMode: WorkoutEntry["exerciseMode"];
  loadMode: WorkoutEntry["loadMode"];
  unilateral: boolean;
  defaultWeightKg: string;
  defaultBandColor: string;
  defaultBandResistance: string;
  notes: string;
  sets: DraftSet[];
}

export function createDraftSet(base?: Partial<DraftSet>): DraftSet {
  return {
    id: base?.id ?? crypto.randomUUID(),
    reps: base?.reps ?? "",
    durationSeconds: base?.durationSeconds ?? "",
    weightKg: base?.weightKg ?? "",
    bandColor: base?.bandColor ?? "",
    bandResistance: base?.bandResistance ?? "",
  };
}

export function createExerciseDraft(
  name = "",
  linkedExercise?: ExerciseLibraryItem,
): ExerciseDraft {
  return {
    id: crypto.randomUUID(),
    exerciseName: linkedExercise?.canonicalName ?? name,
    canonicalExerciseId: linkedExercise?.id ?? null,
    exerciseMode: "reps",
    loadMode: "bodyweight",
    unilateral: false,
    defaultWeightKg: "",
    defaultBandColor: "",
    defaultBandResistance: "",
    notes: "",
    sets: [createDraftSet()],
  };
}

export function exerciseToDraft(entry: WorkoutEntry): ExerciseDraft {
  return {
    id: entry.id,
    exerciseName: entry.exerciseName,
    canonicalExerciseId: entry.canonicalExerciseId,
    exerciseMode: entry.exerciseMode,
    loadMode: entry.loadMode,
    unilateral: entry.unilateral,
    defaultWeightKg: entry.defaultWeightKg?.toString() ?? "",
    defaultBandColor: entry.defaultBandColor ?? "",
    defaultBandResistance: entry.defaultBandResistance ?? "",
    notes: entry.notes,
    sets: entry.sets.map((set) =>
      createDraftSet({
        id: set.id,
        reps: set.reps?.toString() ?? "",
        durationSeconds: set.durationSeconds?.toString() ?? "",
        weightKg: set.weightKg?.toString() ?? "",
        bandColor: set.bandColor ?? "",
        bandResistance: set.bandResistance ?? "",
      }),
    ),
  };
}

function parseOptionalNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildEntryFromDraft(
  draft: ExerciseDraft,
  userId: string,
  sessionId: string | undefined,
  linkedExercise: ExerciseLibraryItem | null,
) {
  const typedName = draft.exerciseName.trim();
  const exerciseName = linkedExercise?.canonicalName ?? typedName;
  const sets = draft.sets
    .map(
      (set, position): WorkoutSet => ({
        id: set.id,
        position,
        reps: parseOptionalInteger(set.reps),
        durationSeconds: parseOptionalInteger(set.durationSeconds),
        weightKg: parseOptionalNumber(set.weightKg),
        bandColor: set.bandColor.trim() || null,
        bandResistance: set.bandResistance.trim() || null,
      }),
    )
    .filter((set) =>
      draft.exerciseMode === "isometric"
        ? set.durationSeconds !== null
        : set.reps !== null,
    );

  const entry: WorkoutEntry = {
    id: draft.id,
    sessionId: sessionId ?? "pending-session",
    userId,
    position: 0,
    exerciseName,
    normalizedName: normalizeExerciseName(exerciseName),
    canonicalExerciseId: linkedExercise?.id ?? draft.canonicalExerciseId,
    exerciseMode: draft.exerciseMode,
    loadMode: draft.loadMode,
    unilateral: draft.unilateral,
    defaultWeightKg: parseOptionalNumber(draft.defaultWeightKg),
    defaultBandColor: draft.defaultBandColor.trim() || null,
    defaultBandResistance: draft.defaultBandResistance.trim() || null,
    notes: draft.notes.trim(),
    sets,
  };

  return { entry, typedName };
}
