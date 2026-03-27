"use client";

import { useEffect, useState } from "react";
import { Plus, Dumbbell, X, Minus, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import { createRoutine, updateRoutine } from "@/lib/data";
import type {
  BandColor,
  Exercise,
  Routine,
  RoutineExercise,
  RoutineWithExercises,
} from "@/types/models";
import { BAND_COLOR_LABELS } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ExercisePicker } from "./exercise-picker";

interface CreateRoutineProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  routineToEdit?: RoutineWithExercises | null;
}

interface RoutineExerciseItem {
  uid: string;
  exercise: Exercise;
  defaultSets: number;
  defaultReps: number | null;
  defaultDurationSeconds: number | null;
  defaultBandColor: BandColor | null;
  defaultBandResistance: number | null;
}

function needsReps(type: Exercise["exercise_type"]) {
  return type === "weight_reps" || type === "bodyweight_reps" || type === "bands";
}

function needsDuration(type: Exercise["exercise_type"]) {
  return (
    type === "duration" ||
    type === "duration_weight" ||
    type === "distance_duration"
  );
}

function needsBand(type: Exercise["exercise_type"]) {
  return type === "bands";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function secondsToHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s };
}

function hmsToSeconds(h: number, m: number, s: number) {
  return h * 3600 + m * 60 + s;
}

// ─── Counter control ─────────────────────────────────────────────────────────

function Counter({
  value,
  label,
  onDelta,
  min = 0,
}: {
  value: number;
  label: string;
  onDelta: (d: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onDelta(-1)}
        disabled={value <= min}
        className="flex size-9 items-center justify-center rounded-full bg-[var(--fill-secondary)] tap-highlight-transparent disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-[15px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onDelta(1)}
        className="flex size-9 items-center justify-center rounded-full bg-[var(--fill-secondary)] tap-highlight-transparent"
      >
        <Plus className="size-4" />
      </button>
      <span className="text-[13px] text-[var(--label-secondary)]">{label}</span>
    </div>
  );
}

// ─── Duration picker: tap-to-type HH MM SS ───────────────────────────────────

function TimeSegment({
  value,
  max,
  label,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) onChange(Math.min(max, Math.max(0, n)));
        }}
        className="w-12 rounded-[8px] bg-[var(--fill-secondary)] px-1 py-1.5 text-center text-[16px] font-bold tabular-nums text-[var(--foreground)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-[12px] font-medium text-[var(--label-secondary)]">
        {label}
      </span>
    </div>
  );
}

function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (s: number) => void;
}) {
  const { h, m, s } = secondsToHMS(value);

  return (
    <div className="flex items-center gap-2">
      <TimeSegment value={h} max={23} label="h" onChange={(v) => onChange(hmsToSeconds(v, m, s))} />
      <TimeSegment value={m} max={59} label="m" onChange={(v) => onChange(hmsToSeconds(h, v, s))} />
      <TimeSegment value={s} max={59} label="s" onChange={(v) => onChange(hmsToSeconds(h, m, v))} />
    </div>
  );
}

// ─── Exercise card ────────────────────────────────────────────────────────────

const BAND_COLORS: { value: BandColor; hex: string }[] = [
  { value: "yellow", hex: "#FFD60A" },
  { value: "red", hex: "#FF453A" },
  { value: "black", hex: "#636366" },
  { value: "purple", hex: "#BF5AF2" },
  { value: "green", hex: "#30D158" },
  { value: "blue", hex: "#0A84FF" },
];

function ExerciseCard({
  item,
  onRemove,
  onUpdateSets,
  onUpdateReps,
  onUpdateDuration,
  onUpdateBandColor,
  onUpdateBandResistance,
}: {
  item: RoutineExerciseItem;
  onRemove: () => void;
  onUpdateSets: (delta: number) => void;
  onUpdateReps: (val: number) => void;
  onUpdateDuration: (val: number) => void;
  onUpdateBandColor: (color: BandColor) => void;
  onUpdateBandResistance: (val: number) => void;
}) {
  const controls = useDragControls();
  const type = item.exercise.exercise_type;
  const hasSecondary = needsReps(type) || needsDuration(type) || needsBand(type);

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="rounded-[14px] bg-[var(--background-tertiary)]"
    >
      {/* ── Name row ── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="touch-none shrink-0 cursor-grab active:cursor-grabbing p-0.5 text-[var(--label-tertiary)]"
        >
          <GripVertical className="size-4" />
        </button>

        <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
          {item.exercise.name}
        </p>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-0.5 text-[var(--danger)] tap-highlight-transparent"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ── Controls row ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-3 pl-9">
        {/* Sets — always shown */}
        <Counter
          value={item.defaultSets}
          label="series"
          onDelta={onUpdateSets}
          min={1}
        />

        {/* Reps */}
        {needsReps(type) && (
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={item.defaultReps ?? 10}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) onUpdateReps(Math.max(1, n));
              }}
              className="w-12 rounded-[8px] bg-[var(--fill-secondary)] px-1 py-1.5 text-center text-[16px] font-bold tabular-nums text-[var(--foreground)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[12px] font-medium text-[var(--label-secondary)]">
              reps
            </span>
          </div>
        )}

        {/* Duration h/m/s */}
        {needsDuration(type) && (
          <DurationPicker
            value={item.defaultDurationSeconds ?? 30}
            onChange={onUpdateDuration}
          />
        )}

        {/* Band color + resistance */}
        {needsBand(type) && (
          <>
            <div className="flex items-center gap-1.5">
              {BAND_COLORS.map((bc) => (
                <button
                  key={bc.value}
                  type="button"
                  onClick={() => onUpdateBandColor(bc.value)}
                  title={BAND_COLOR_LABELS[bc.value]}
                  className="size-5 rounded-full transition-transform tap-highlight-transparent"
                  style={{
                    backgroundColor: bc.hex,
                    transform:
                      item.defaultBandColor === bc.value
                        ? "scale(1.35)"
                        : "scale(1)",
                    outline:
                      item.defaultBandColor === bc.value
                        ? `2px solid ${bc.hex}`
                        : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={item.defaultBandResistance ?? ""}
                placeholder="—"
                onChange={(e) => onUpdateBandResistance(Number(e.target.value))}
                className="w-12 rounded-[8px] bg-[var(--fill-secondary)] px-2 py-1 text-center text-[13px] font-semibold tabular-nums text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)]"
              />
              <span className="text-[12px] text-[var(--label-secondary)]">
                kg
              </span>
            </div>
          </>
        )}
      </div>
    </Reorder.Item>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateRoutine({
  open,
  onClose,
  onSaved,
  routineToEdit,
}: CreateRoutineProps) {
  const { user } = useAuth();
  const { supabase } = useData();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (open) {
      if (routineToEdit) {
        setName(routineToEdit.name);
        setExercises(
          routineToEdit.exercises.map((re) => ({
            uid: re.id,
            exercise: re.exercise,
            defaultSets: re.default_sets,
            defaultReps: re.default_reps,
            defaultDurationSeconds: re.default_duration_seconds,
            defaultBandColor: re.default_band_color,
            defaultBandResistance: re.default_band_resistance
              ? Number(re.default_band_resistance)
              : null,
          })),
        );
      } else {
        setName("");
        setExercises([]);
      }
    }
  }, [open, routineToEdit]);

  const handlePickExercise = (exercise: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        exercise,
        defaultSets: 3,
        defaultReps: needsReps(exercise.exercise_type) ? 10 : null,
        defaultDurationSeconds: needsDuration(exercise.exercise_type) ? 30 : null,
        defaultBandColor: null,
        defaultBandResistance: null,
      },
    ]);
  };

  const removeExercise = (uid: string) => {
    setExercises((prev) => prev.filter((item) => item.uid !== uid));
  };

  const updateItem = (uid: string, patch: Partial<RoutineExerciseItem>) => {
    setExercises((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)),
    );
  };

  const handleSave = async () => {
    if (!user || !supabase || !name.trim()) return;

    const buildExercises = (routineId: string): RoutineExercise[] =>
      exercises.map((item, i) => ({
        id: crypto.randomUUID(),
        routine_id: routineId,
        exercise_id: item.exercise.id,
        position: i,
        default_sets: item.defaultSets,
        default_reps: item.defaultReps,
        default_duration_seconds: item.defaultDurationSeconds,
        default_band_color: item.defaultBandColor,
        default_band_resistance: item.defaultBandResistance,
      }));

    if (routineToEdit) {
      const updatedRoutine: Routine = {
        ...routineToEdit,
        name: name.trim(),
        updated_at: new Date().toISOString(),
      };
      await updateRoutine(supabase, updatedRoutine, buildExercises(routineToEdit.id));
    } else {
      const newId = crypto.randomUUID();
      const routine: Routine = {
        id: newId,
        user_id: user.id,
        name: name.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await createRoutine(supabase, routine, buildExercises(newId));
    }

    onSaved();
  };

  const isEditing = !!routineToEdit;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={isEditing ? "Editar Rutina" : "Crear Rutina"}
      >
        <div className="px-4 py-4">
          {/* Name input */}
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la rutina"
              className="w-full border-b border-[var(--line)] bg-transparent pb-2 text-[20px] font-bold text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)]"
            />
          </div>

          {/* Exercise list */}
          {exercises.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="size-10" />}
              message="Agrega ejercicios a tu rutina."
            />
          ) : (
            <Reorder.Group
              axis="y"
              values={exercises}
              onReorder={setExercises}
              className="mb-4 space-y-2"
            >
              {exercises.map((item) => (
                <ExerciseCard
                  key={item.uid}
                  item={item}
                  onRemove={() => removeExercise(item.uid)}
                  onUpdateSets={(delta) =>
                    updateItem(item.uid, {
                      defaultSets: Math.max(1, item.defaultSets + delta),
                    })
                  }
                  onUpdateReps={(val) =>
                    updateItem(item.uid, { defaultReps: val })
                  }
                  onUpdateDuration={(val) =>
                    updateItem(item.uid, { defaultDurationSeconds: Math.max(0, val) })
                  }
                  onUpdateBandColor={(color) =>
                    updateItem(item.uid, { defaultBandColor: color })
                  }
                  onUpdateBandResistance={(val) =>
                    updateItem(item.uid, { defaultBandResistance: val })
                  }
                />
              ))}
            </Reorder.Group>
          )}

          {/* Add exercise */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowPicker(true)}
            className="mb-3"
          >
            <Plus className="size-5" />
            Agregar Ejercicio
          </Button>

          {/* Save */}
          {(isEditing || exercises.length > 0) && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => void handleSave()}
              disabled={!name.trim()}
            >
              {isEditing ? "Guardar Cambios" : "Guardar Rutina"}
            </Button>
          )}
        </div>
      </Sheet>

      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onPick={handlePickExercise}
      />
    </>
  );
}
