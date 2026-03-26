"use client";

import { useState, useRef } from "react";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { Check } from "lucide-react";
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
    if ((e.target as HTMLElement).closest("input, button")) return;
    dragControls.start(e);
  }

  return (
    <div className="relative mb-0.5 overflow-hidden rounded-[8px]">
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
            "relative grid items-center gap-1 py-1.5",
            completed ? "bg-[var(--accent-soft)]" : "bg-[var(--background-secondary)]",
          )}
          style={{ gridTemplateColumns: template }}
        >
          {children}
          {/* Overlay: captura toques para cerrar el panel cuando está abierto */}
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
  const { addSet, updateSet, toggleSet, removeSet, removeExercise } = useWorkout();
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
        <div
          className="mb-1 grid items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[var(--label-secondary)]"
          style={{ gridTemplateColumns: columns.template }}
        >
          <span className="text-center">SET</span>
          {type === "bands" ? (
            <>
              <span className="text-center">COLOR</span>
              <span className="text-center">KG</span>
              <span className="text-center">REPS</span>
            </>
          ) : (
            columns.fields.map((f) => (
              <span key={f.key} className="text-center">{f.label}</span>
            ))
          )}
          <span className="text-center" />
        </div>

        {/* Set rows */}
        {entry.sets.map((set, idx) => (
          <SwipeableSetRow
            key={set.id}
            completed={set.completed}
            template={columns.template}
            onDelete={() => void removeSet(set.id)}
          >
            {/* Set number */}
            <span className={clsx(
              "text-center text-[14px] font-bold",
              set.completed ? "text-[var(--accent)]" : "text-[var(--label-secondary)]"
            )}>
              {idx + 1}
            </span>

            {/* Dynamic inputs */}
            {type === "bands" ? (
              <>
                <div className="flex items-center justify-center gap-0.5">
                  {BAND_COLORS.map(([color, hex]) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={BAND_COLOR_LABELS[color]}
                      onClick={() => void updateSet(set.id, { band_color: color })}
                      className={clsx(
                        "size-4 rounded-full tap-highlight-transparent transition-transform active:scale-90",
                        set.band_color === color && "ring-2 ring-white ring-offset-1 ring-offset-[var(--background-secondary)]",
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={set.band_resistance ?? ""}

                  onChange={(e) => handleInputChange(set.id, "band_resistance", e.target.value)}
                  className="w-full rounded-[8px] bg-[var(--fill-quaternary)] px-1 py-1.5 text-center text-[14px] font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--fill-tertiary)]"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={set.reps ?? ""}

                  onChange={(e) => handleInputChange(set.id, "reps", e.target.value)}
                  className="w-full rounded-[8px] bg-[var(--fill-quaternary)] px-1 py-1.5 text-center text-[14px] font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--fill-tertiary)]"
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
                  className="w-full rounded-[8px] bg-[var(--fill-quaternary)] px-1 py-1.5 text-center text-[14px] font-semibold text-[var(--foreground)] outline-none focus:bg-[var(--fill-tertiary)]"
                />
              ))
            )}

            {/* Complete checkmark */}
            <div className="flex justify-center">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
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
          </SwipeableSetRow>
        ))}
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
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "REPS", placeholder: "0" },
        ],
      };
    case "bodyweight_reps":
      return {
        template: "36px 1fr 36px",
        fields: [{ key: "reps", label: "REPS", placeholder: "0" }],
      };
    case "duration":
      return {
        template: "36px 1fr 36px",
        fields: [{ key: "duration_seconds", label: "SEG", placeholder: "0" }],
      };
    case "duration_weight":
      return {
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "duration_seconds", label: "SEG", placeholder: "0" },
        ],
      };
    case "distance_duration":
      return {
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "distance_m", label: "M", placeholder: "0" },
          { key: "duration_seconds", label: "SEG", placeholder: "0" },
        ],
      };
    case "weight_distance":
      return {
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "distance_m", label: "M", placeholder: "0" },
        ],
      };
    case "bands":
      return {
        template: "36px 1fr 1fr 1fr 36px",
        fields: [],
      };
    default:
      return {
        template: "36px 1fr 1fr 36px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "REPS", placeholder: "0" },
        ],
      };
  }
}
