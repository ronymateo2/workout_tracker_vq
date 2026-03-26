"use client";

import { useState } from "react";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { Check } from "lucide-react";
import clsx from "clsx";
import type { WorkoutEntryWithDetails, WorkoutSet, ExerciseType } from "@/types/models";
import { useWorkout } from "@/lib/workout-context";
import { BAND_COLOR_LABELS } from "@/types/models";

interface ExerciseCardProps {
  entry: WorkoutEntryWithDetails;
  previousSets: WorkoutSet[];
}

function formatPrevious(set: WorkoutSet, type: ExerciseType): string {
  switch (type) {
    case "weight_reps":
      return set.weight_kg && set.reps ? `${set.weight_kg}kg x ${set.reps}` : "—";
    case "bodyweight_reps":
      return set.reps ? `x ${set.reps}` : "—";
    case "duration":
      return set.duration_seconds ? `${set.duration_seconds}s` : "—";
    case "duration_weight":
      return set.duration_seconds && set.weight_kg
        ? `${set.weight_kg}kg ${set.duration_seconds}s`
        : "—";
    case "distance_duration":
      return set.distance_m && set.duration_seconds
        ? `${set.distance_m}m ${set.duration_seconds}s`
        : "—";
    case "weight_distance":
      return set.weight_kg && set.distance_m
        ? `${set.weight_kg}kg ${set.distance_m}m`
        : "—";
    case "bands":
      return set.band_color
        ? `${BAND_COLOR_LABELS[set.band_color]} ${set.band_resistance ?? ""}kg`
        : "—";
    default:
      return "—";
  }
}

export function ExerciseCard({ entry, previousSets }: ExerciseCardProps) {
  const { addSet, updateSet, toggleSet, removeExercise } = useWorkout();
  const [showMenu, setShowMenu] = useState(false);
  const type = entry.exercise.exercise_type;

  const handleInputChange = (
    setId: string,
    field: keyof WorkoutSet,
    value: string,
  ) => {
    const num = value === "" ? null : Number(value);
    void updateSet(setId, { [field]: num });
  };

  // Determine which columns to show based on exercise type
  const columns = getColumns(type);

  return (
    <div className="rounded-[16px] bg-[var(--background-secondary)] p-4">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-[var(--accent)]">
          {entry.exercise.name}
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 tap-highlight-transparent"
          >
            <MoreVertical className="size-5 text-[var(--label-secondary)]" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-[12px] bg-[var(--background-tertiary)] py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    void removeExercise(entry.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-[14px] text-[var(--danger)] active:opacity-70"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sets table */}
      <div className="mt-2">
        {/* Header row */}
        <div className="mb-1 grid items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[var(--label-secondary)]"
          style={{ gridTemplateColumns: columns.template }}
        >
          <span className="text-center">SET</span>
          <span className="text-center">ANTERIOR</span>
          {columns.fields.map((f) => (
            <span key={f.key} className="text-center">{f.label}</span>
          ))}
          <span className="text-center" />
        </div>

        {/* Set rows */}
        {entry.sets.map((set, idx) => {
          const prev = previousSets[idx];
          return (
            <div
              key={set.id}
              className={clsx(
                "grid items-center gap-1 py-1.5 rounded-[8px] mb-0.5",
                set.completed && "bg-[var(--accent-soft)]",
              )}
              style={{ gridTemplateColumns: columns.template }}
            >
              {/* Set number */}
              <span className={clsx(
                "text-center text-[14px] font-bold",
                set.completed ? "text-[var(--accent)]" : "text-[var(--label-secondary)]"
              )}>
                {idx + 1}
              </span>

              {/* Previous */}
              <span className="text-center text-[12px] text-[var(--label-secondary)]">
                {prev ? formatPrevious(prev, type) : "—"}
              </span>

              {/* Dynamic inputs */}
              {columns.fields.map((f) => (
                <input
                  key={f.key}
                  type="number"
                  inputMode="decimal"
                  placeholder={f.placeholder}
                  value={(set[f.key as keyof WorkoutSet] as number | null) ?? ""}
                  onChange={(e) => handleInputChange(set.id, f.key as keyof WorkoutSet, e.target.value)}
                  className="w-full rounded-[8px] bg-[var(--fill-quaternary)] px-1 py-1.5 text-center text-[14px] font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--fill-tertiary)]"
                />
              ))}

              {/* Complete checkmark */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void toggleSet(set.id)}
                  className={clsx(
                    "flex size-7 items-center justify-center rounded-[6px] tap-highlight-transparent",
                    set.completed
                      ? "bg-[var(--success)] text-white"
                      : "bg-[var(--fill-tertiary)] text-[var(--label-secondary)]",
                  )}
                >
                  <Check className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Set */}
      <button
        type="button"
        onClick={() => void addSet(entry.id)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--fill-quaternary)] py-2.5 text-[13px] font-medium text-[var(--foreground)] tap-highlight-transparent active:opacity-80"
      >
        <Plus className="size-4" />
        Agregar Serie
      </button>
    </div>
  );
}

// ─── Column config by exercise type ──────────────────────────────────────────

interface ColumnField {
  key: string;
  label: string;
  placeholder: string;
}

interface ColumnConfig {
  template: string;
  fields: ColumnField[];
}

function getColumns(type: ExerciseType): ColumnConfig {
  switch (type) {
    case "weight_reps":
      return {
        template: "36px 1fr 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "REPS", placeholder: "0" },
        ],
      };
    case "bodyweight_reps":
      return {
        template: "36px 1fr 1fr 36px",
        fields: [{ key: "reps", label: "REPS", placeholder: "0" }],
      };
    case "duration":
      return {
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "duration_seconds", label: "SEG", placeholder: "0" },
        ],
      };
    case "duration_weight":
      return {
        template: "36px 1fr 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "duration_seconds", label: "SEG", placeholder: "0" },
        ],
      };
    case "distance_duration":
      return {
        template: "36px 1fr 1fr 1fr 36px",
        fields: [
          { key: "distance_m", label: "M", placeholder: "0" },
          { key: "duration_seconds", label: "SEG", placeholder: "0" },
        ],
      };
    case "weight_distance":
      return {
        template: "36px 1fr 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "distance_m", label: "M", placeholder: "0" },
        ],
      };
    case "bands":
      return {
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "band_resistance", label: "KG", placeholder: "0" },
        ],
      };
    default:
      return {
        template: "36px 1fr 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "REPS", placeholder: "0" },
        ],
      };
  }
}
