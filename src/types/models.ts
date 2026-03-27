// ─── Enums / Union Types ─────────────────────────────────────────────────────

export type ExerciseType =
  | "weight_reps"
  | "bodyweight_reps"
  | "duration"
  | "duration_weight"
  | "distance_duration"
  | "weight_distance"
  | "bands";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "traps"
  | "lats"
  | "full_body";

export type BandColor =
  | "yellow"
  | "red"
  | "black"
  | "purple"
  | "green"
  | "blue";

// ─── Domain Interfaces ───────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  user_id: string | null; // null = global seed exercise
  name: string;
  exercise_type: ExerciseType;
  unilateral: boolean;
  muscle_groups: MuscleGroup[];
  description: string | null;
  video_url: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  default_sets: number;
  default_reps: number | null;
  default_duration_seconds: number | null;
  default_band_color: BandColor | null;
  default_band_resistance: number | null;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface WorkoutEntry {
  id: string;
  session_id: string;
  exercise_id: string;
  position: number;
}

export interface WorkoutSet {
  id: string;
  entry_id: string;
  position: number;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  band_color: BandColor | null;
  band_resistance: number | null;
  completed: boolean;
}

// ─── Composite Types (for UI) ────────────────────────────────────────────────

export interface WorkoutEntryWithDetails extends WorkoutEntry {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutSessionWithEntries extends WorkoutSession {
  entries: WorkoutEntryWithDetails[];
}

export interface RoutineWithExercises extends Routine {
  exercises: (RoutineExercise & { exercise: Exercise })[];
}

// ─── Labels (español) ────────────────────────────────────────────────────────

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  weight_reps: "Peso y Reps",
  bodyweight_reps: "Bodyweight Reps",
  duration: "Duración",
  duration_weight: "Duración y Peso",
  distance_duration: "Distancia y Duración",
  weight_distance: "Peso y Distancia",
  bands: "Bandas",
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebrazos",
  quads: "Cuádriceps",
  hamstrings: "Isquiotibiales",
  glutes: "Glúteos",
  calves: "Pantorrillas",
  abs: "Abdominales",
  traps: "Trapecios",
  lats: "Dorsales",
  full_body: "Cuerpo Completo",
};

export const BAND_COLOR_LABELS: Record<BandColor, string> = {
  yellow: "Amarilla",
  red: "Roja",
  black: "Negra",
  purple: "Morada",
  green: "Verde",
  blue: "Azul",
};
