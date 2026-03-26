"use client";

import { useState, useRef } from "react";
import { Plus, MoreVertical, Trash2, Check } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import clsx from "clsx";
import type { WorkoutEntryWithDetails, WorkoutSet, ExerciseType, BandColor } from "@/types/models";
import { useWorkout } from "@/lib/workout-context";
import { BAND_COLOR_LABELS } from "@/types/models";

const BAND_COLOR_HEX: Record<BandColor, string> = {
  yellow: "#FFCC00",
  red: "#FF3B30",
  black: "#636366",
  purple: "#BF5AF2",
  green: "#34C759",
  blue: "#007AFF",
};

const BAND_COLORS = Object.entries(BAND_COLOR_HEX) as [BandColor, string][];
const DELETE_WIDTH = 72;
const SPRING = { type: "spring" as const, stiffness: 500, damping: 42 };

// ─── Previous performance formatter ──────────────────────────────────────────

function formatPrevious(set: WorkoutSet | undefined, type: ExerciseType): string {
  if (!set) return "—";
  switch (type) {
    case "weight_reps":
      return set.weight_kg && set.reps ? `${set.weight_kg}kg × ${set.reps}` : "—";
    case "bodyweight_reps":
      return set.reps ? `${set.reps} reps` : "—";
    case "duration":
      return set.duration_seconds ? `${set.duration_seconds}s` : "—";
    case "duration_weight":
      return set.weight_kg && set.duration_seconds ? `${set.weight_kg}kg × ${set.duration_seconds}s` : "—";
    case "distance_duration":
      return set.distance_m && set.duration_seconds ? `${set.distance_m}m × ${set.duration_seconds}s` : "—";
    case "weight_distance":
      return set.weight_kg && set.distance_m ? `${set.weight_kg}kg × ${set.distance_m}m` : "—";
    case "bands":
      return set.band_color && set.reps ? `${BAND_COLOR_LABELS[set.band_color]} × ${set.reps}` : "—";
    default:
      return "—";
  }
}

// ─── Swipeable set row ────────────────────────────────────────────────────────

function SwipeableSetRow({
  children,
  onDelete,
  completed,
  template,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  completed: boolean;
  template: string;
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-DELETE_WIDTH, -DELETE_WIDTH / 2], [1, 0]);
  const deleteScale = useTransform(x, [-DELETE_WIDTH, 0], [1, 0.7]);
  const dragControls = useDragControls();
  const [isOpen, setIsOpen] = useState(false);
  const isDragging = useRef(false);

  function handleDragStart() {
    isDragging.current = true;
  }

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    isDragging.current = false;
    const shouldOpen = info.offset.x < -(DELETE_WIDTH / 2) || info.velocity.x < -300;
    setIsOpen(shouldOpen);
    void animate(x, shouldOpen ? -DELETE_WIDTH : 0, SPRING);
  }

  function close() {
    setIsOpen(false);
    void animate(x, 0, SPRING);
  }

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("input, button, select")) return;
    dragControls.start(e);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete action */}
      <motion.div
        style={{ opacity: deleteOpacity, pointerEvents: isOpen ? "auto" : "none" }}
        className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-[var(--danger)]"
      >
        <button
          type="button"
          onClick={() => { close(); onDelete(); }}
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 tap-highlight-transparent"
        >
          <motion.span style={{ scale: deleteScale }} className="flex flex-col items-center gap-0.5">
            <Trash2 className="size-4 text-white" />
            <span className="text-[11px] font-semibold text-white">Borrar</span>
          </motion.span>
        </button>
      </motion.div>

      {/* Row content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={{ left: 0.12, right: 0.25 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          onPointerDown={startDrag}
          className={clsx(
            "relative grid items-center gap-x-2 py-1.5",
            completed && "bg-[var(--accent-soft)]",
          )}
          style={{ gridTemplateColumns: template }}
        >
          {children}
          {isOpen && (
            <div className="absolute inset-0" onClick={close} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  entry: WorkoutEntryWithDetails;
}

export function ExerciseCard({ entry }: ExerciseCardProps) {
  const { addSet, updateSet, toggleSet, removeSet, removeExercise, previousSets } = useWorkout();
  const [showMenu, setShowMenu] = useState(false);
  const type = entry.exercise.exercise_type;
  const prevSets = previousSets[entry.exercise_id] ?? [];

  const handleInputChange = (
    setId: string,
    field: keyof WorkoutSet,
    value: string,
  ) => {
    const num = value === "" ? null : Number(value);
    void updateSet(setId, { [field]: num });
  };

  const columns = getColumns(type);

  return (
    <div className="overflow-hidden rounded-[16px] bg-[var(--background-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)]">
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
      <div className="px-4 pb-0">
        {/* Header row */}
        <div
          className="mb-0.5 grid items-center gap-x-2 text-[11px] font-medium text-[var(--label-secondary)]"
          style={{ gridTemplateColumns: columns.template }}
        >
          <span className="text-center">Set</span>
          <span>Anterior</span>
          {type === "bands" ? (
            <>
              <span className="text-center">Banda</span>
              <span className="text-center">Reps</span>
            </>
          ) : (
            columns.fields.map((f) => (
              <span key={f.key} className="text-center">{f.label}</span>
            ))
          )}
          <div className="flex justify-center">
            <Check className="size-3.5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Set rows */}
        {entry.sets.map((set, idx) => (
          <SwipeableSetRow
            key={set.id}
            completed={set.completed}
            template={columns.template}
            onDelete={() => void removeSet(set.id)}
          >
            {/* Set number badge */}
            <div className="flex justify-center">
              <span className={clsx(
                "flex size-6 items-center justify-center rounded-full text-[12px] font-bold",
                set.completed
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--fill-tertiary)] text-[var(--label-secondary)]",
              )}>
                {idx + 1}
              </span>
            </div>

            {/* Previous performance */}
            <span className="truncate text-[12px] text-[var(--label-secondary)]">
              {formatPrevious(prevSets[idx], type)}
            </span>

            {/* Dynamic inputs */}
            {type === "bands" ? (
              <>
                <div className="flex items-center justify-center">
                  <div className={clsx(
                    "flex items-center gap-1.5 rounded-[8px] px-2 py-1.5",
                    set.completed
                      ? "bg-transparent"
                      : "bg-[var(--fill-quaternary)]",
                  )}>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: BAND_COLOR_HEX[set.band_color ?? "yellow"] }}
                    />
                    <select
                      value={set.band_color ?? "yellow"}
                      onChange={(e) => void updateSet(set.id, { band_color: e.target.value as BandColor })}
                      className="appearance-none bg-transparent text-[12px] font-semibold text-[var(--foreground)] outline-none"
                    >
                      {BAND_COLORS.map(([color]) => (
                        <option key={color} value={color}>
                          {BAND_COLOR_LABELS[color]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={set.reps ?? ""}
                  onChange={(e) => handleInputChange(set.id, "reps", e.target.value)}
                  className={clsx(
                    "w-full rounded-[8px] px-1 py-1.5 text-center text-[14px] font-semibold text-[var(--foreground)] outline-none",
                    set.completed
                      ? "bg-transparent text-[var(--label-secondary)]"
                      : "bg-[var(--fill-quaternary)]",
                  )}
                />
              </>
            ) : (
              columns.fields.map((f) => (
                <input
                  key={f.key}
                  type="number"
                  inputMode="decimal"
                  placeholder={f.placeholder}
                  value={(set[f.key as keyof WorkoutSet] as number | null) ?? ""}
                  onChange={(e) => handleInputChange(set.id, f.key as keyof WorkoutSet, e.target.value)}
                  className={clsx(
                    "w-full rounded-[8px] px-1 py-1.5 text-center text-[14px] font-semibold outline-none",
                    set.completed
                      ? "bg-transparent text-[var(--label-secondary)]"
                      : "bg-[var(--fill-quaternary)] text-[var(--foreground)] focus:bg-[var(--fill-tertiary)]",
                  )}
                />
              ))
            )}

            {/* Complete toggle */}
            <div className="flex justify-center">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => void toggleSet(set.id)}
                className={clsx(
                  "flex size-7 items-center justify-center rounded-full border-2 tap-highlight-transparent transition-colors",
                  set.completed
                    ? "border-[var(--success)] bg-[var(--success)]"
                    : "border-[var(--separator)] bg-transparent",
                )}
              >
                <Check
                  className={clsx("size-4", set.completed ? "text-white" : "text-transparent")}
                  strokeWidth={2.5}
                />
              </button>
            </div>
          </SwipeableSetRow>
        ))}
      </div>

      {/* Add Set */}
      <button
        type="button"
        onClick={() => void addSet(entry.id)}
        className="flex w-full items-center justify-center gap-1.5 py-3 text-[13px] font-medium text-[var(--accent)] tap-highlight-transparent active:opacity-60"
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
        template: "28px 1fr 56px 56px 32px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "Reps", placeholder: "0" },
        ],
      };
    case "bodyweight_reps":
      return {
        template: "28px 1fr 64px 32px",
        fields: [{ key: "reps", label: "Reps", placeholder: "0" }],
      };
    case "duration":
      return {
        template: "28px 1fr 64px 32px",
        fields: [{ key: "duration_seconds", label: "Seg", placeholder: "0" }],
      };
    case "duration_weight":
      return {
        template: "28px 1fr 56px 56px 32px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "duration_seconds", label: "Seg", placeholder: "0" },
        ],
      };
    case "distance_duration":
      return {
        template: "28px 1fr 56px 56px 32px",
        fields: [
          { key: "distance_m", label: "M", placeholder: "0" },
          { key: "duration_seconds", label: "Seg", placeholder: "0" },
        ],
      };
    case "weight_distance":
      return {
        template: "28px 1fr 56px 56px 32px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "distance_m", label: "M", placeholder: "0" },
        ],
      };
    case "bands":
      return {
        template: "28px 1fr 110px 56px 32px",
        fields: [],
      };
    default:
      return {
        template: "28px 1fr 56px 56px 32px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "Reps", placeholder: "0" },
        ],
      };
  }
}
