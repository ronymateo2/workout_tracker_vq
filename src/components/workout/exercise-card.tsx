"use client";

import { useState, useRef } from "react";
import { Plus, MoreVertical, Trash2, Check } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import clsx from "clsx";
import type { WorkoutEntryWithDetails, WorkoutSet, ExerciseType, BandColor, Exercise } from "@/types/models";
import { useWorkoutEntries } from "@/lib/workout-context";
import { BAND_COLOR_LABELS } from "@/types/models";
import { ExerciseInfoSheet } from "./exercise-info-sheet";

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
            <Trash2 className="size-5 text-white" />
            <span className="text-[13px] font-semibold text-white">Borrar</span>
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
            "relative grid items-center gap-x-2 py-2",
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
  prevSets?: WorkoutSet[];
}

export function ExerciseCard({ entry, prevSets }: ExerciseCardProps) {
  const { addSet, updateSet, toggleSet, removeSet, removeExercise } = useWorkoutEntries();
  const [showMenu, setShowMenu] = useState(false);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);
  const type = entry.exercise.exercise_type;

  const handleInputChange = (
    setId: string,
    field: keyof WorkoutSet,
    value: string,
  ) => {
    if (value === "") { void updateSet(setId, { [field]: null }); return; }
    const num = Math.max(0, Number(value));
    void updateSet(setId, { [field]: num });
  };

  const REPS_TYPES: ExerciseType[] = ["weight_reps", "bodyweight_reps", "bands"];
  const DURATION_TYPES: ExerciseType[] = ["duration", "duration_weight", "distance_duration"];
  const requiresReps = REPS_TYPES.includes(type);
  const requiresDuration = DURATION_TYPES.includes(type);

  const handleToggle = (set: WorkoutSet) => {
    if (!set.completed && requiresReps && !(set.reps && set.reps > 0)) {
      setShakingId(set.id);
      setTimeout(() => setShakingId(null), 500);
      return;
    }
    if (!set.completed && requiresDuration && !(set.duration_seconds && set.duration_seconds > 0)) {
      setShakingId(set.id);
      setTimeout(() => setShakingId(null), 500);
      return;
    }
    void toggleSet(set.id);
  };

  const columns = getColumns(type);

  return (
    <>
    <div className="overflow-hidden rounded-[16px] bg-[var(--background-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <button
          type="button"
          onClick={() => setInfoExercise(entry.exercise)}
          className="text-left text-[17px] font-semibold text-[var(--foreground)] tap-highlight-transparent active:opacity-60"
        >
          {entry.exercise.name}
        </button>
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
          className="mb-1 grid items-center gap-x-2 text-[13px] font-medium text-[var(--label-secondary)]"
          style={{ gridTemplateColumns: columns.template }}
        >
          <span className="text-center">Set</span>
          <span className="text-center">Prev</span>
          {type === "bands" ? (
            <>
              <span className="text-center">Banda</span>
              <span className="text-center">KG</span>
              <span className="text-center">Reps</span>
            </>
          ) : (
            columns.fields.map((f) =>
              f.key === "duration_seconds" ? (
                <div key={f.key} className="flex">
                  <span className="flex-1 text-center">Hr</span>
                  <span className="w-3" />
                  <span className="flex-1 text-center">Min</span>
                  <span className="w-3" />
                  <span className="flex-1 text-center">Seg</span>
                </div>
              ) : (
                <span key={f.key} className="text-center">{f.label}</span>
              )
            )
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
                "flex size-7 items-center justify-center rounded-full text-[13px] font-bold",
                set.completed
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--fill-tertiary)] text-[var(--label-secondary)]",
              )}>
                {idx + 1}
              </span>
            </div>

            {/* Prev set cell */}
            <div className="flex items-center justify-center px-1">
              {type === "bands" ? (
                prevSets?.[idx] ? (
                  <div className="flex items-center gap-1">
                    {prevSets[idx].band_color && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: BAND_COLOR_HEX[prevSets[idx].band_color!] }}
                      />
                    )}
                    <span className="text-[13px] text-[var(--label-secondary)]">
                      {prevSets[idx].reps != null ? `× ${prevSets[idx].reps}` : "—"}
                    </span>
                  </div>
                ) : (
                  <span className="text-[13px] text-[var(--label-secondary)]">—</span>
                )
              ) : (
                <span className="text-[13px] text-[var(--label-secondary)]">
                  {prevSets?.[idx] ? formatPrevCell(prevSets[idx], type) : "—"}
                </span>
              )}
            </div>

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
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={set.band_resistance ?? ""}
                  onChange={(e) => handleInputChange(set.id, "band_resistance", e.target.value)}
                  className={clsx(
                    "w-full rounded-[8px] px-1 py-2 text-center text-[16px] font-semibold text-[var(--foreground)] outline-none",
                    set.completed
                      ? "bg-transparent text-[var(--label-secondary)]"
                      : "bg-[var(--fill-quaternary)] focus:bg-[var(--fill-tertiary)]",
                  )}
                />
                <motion.input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={set.reps ?? ""}
                  onChange={(e) => handleInputChange(set.id, "reps", e.target.value)}
                  animate={shakingId === set.id
                    ? { x: [0, -7, 7, -5, 5, -3, 3, 0] }
                    : { x: 0 }}
                  transition={{ duration: 0.42 }}
                  className={clsx(
                    "w-full rounded-[8px] px-1 py-2 text-center text-[16px] font-semibold text-[var(--foreground)] outline-none transition-[box-shadow] duration-300",
                    set.completed
                      ? "bg-transparent text-[var(--label-secondary)]"
                      : shakingId === set.id
                        ? "bg-[var(--fill-quaternary)] shadow-[inset_0_0_0_2px_var(--danger)]"
                        : "bg-[var(--fill-quaternary)] focus:bg-[var(--fill-tertiary)]",
                  )}
                />
              </>
            ) : (
              columns.fields.map((f) => {
                if (f.key === "duration_seconds") {
                  return (
                    <DurationInput
                      key={f.key}
                      totalSeconds={set.duration_seconds}
                      completed={set.completed}
                      shaking={shakingId === set.id}
                      onChange={(seconds) => void updateSet(set.id, { duration_seconds: seconds })}
                    />
                  );
                }
                const isReps = f.key === "reps";
                const shaking = isReps && shakingId === set.id;
                return (
                  <motion.input
                    key={f.key}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder={f.placeholder}
                    value={(set[f.key as keyof WorkoutSet] as number | null) ?? ""}
                    onChange={(e) => handleInputChange(set.id, f.key as keyof WorkoutSet, e.target.value)}
                    animate={shaking ? { x: [0, -7, 7, -5, 5, -3, 3, 0] } : { x: 0 }}
                    transition={{ duration: 0.42 }}
                    className={clsx(
                      "w-full rounded-[8px] px-1 py-2 text-center text-[16px] font-semibold outline-none transition-[box-shadow] duration-300",
                      set.completed
                        ? "bg-transparent text-[var(--label-secondary)]"
                        : shaking
                          ? "bg-[var(--fill-quaternary)] text-[var(--foreground)] shadow-[inset_0_0_0_2px_var(--danger)]"
                          : "bg-[var(--fill-quaternary)] text-[var(--foreground)] focus:bg-[var(--fill-tertiary)]",
                    )}
                  />
                );
              })
            )}

            {/* Complete toggle */}
            <div className="flex justify-center">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleToggle(set)}
                className="flex size-11 items-center justify-center tap-highlight-transparent"
              >
                <span
                  className={clsx(
                    "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
                    set.completed
                      ? "border-[var(--success)] bg-[var(--success)]"
                      : (requiresReps && !(set.reps && set.reps > 0)) || (requiresDuration && !(set.duration_seconds && set.duration_seconds > 0))
                        ? "border-[var(--separator)] bg-transparent opacity-30"
                        : "border-[var(--separator)] bg-transparent",
                  )}
                >
                  <Check
                    className={clsx("size-4", set.completed ? "text-white" : "text-transparent")}
                    strokeWidth={2.5}
                  />
                </span>
              </button>
            </div>
          </SwipeableSetRow>
        ))}
      </div>

      {/* Add Set */}
      <button
        type="button"
        onClick={() => void addSet(entry.id)}
        className="flex w-full items-center justify-center gap-1.5 py-4 text-[15px] font-semibold text-[var(--accent)] tap-highlight-transparent active:opacity-60"
      >
        <Plus className="size-5" />
        Agregar Serie
      </button>
    </div>
    <ExerciseInfoSheet
      exercise={infoExercise}
      onClose={() => setInfoExercise(null)}
    />
    </>
  );
}

// ─── Duration Input ───────────────────────────────────────────────────────────

function DurationInput({
  totalSeconds,
  completed,
  shaking,
  onChange,
}: {
  totalSeconds: number | null;
  completed: boolean;
  shaking?: boolean;
  onChange: (seconds: number | null) => void;
}) {
  const total = totalSeconds ?? 0;
  const h = total > 0 ? Math.floor(total / 3600) : 0;
  const m = total > 0 ? Math.floor((total % 3600) / 60) : 0;
  const s = total > 0 ? total % 60 : 0;

  const update = (part: "h" | "m" | "s", raw: string) => {
    const n = raw === "" ? 0 : Math.max(0, parseInt(raw) || 0);
    const newH = part === "h" ? n : h;
    const newM = part === "m" ? Math.min(59, n) : m;
    const newS = part === "s" ? Math.min(59, n) : s;
    const newTotal = newH * 3600 + newM * 60 + newS;
    onChange(newTotal > 0 ? newTotal : null);
  };

  const inputCls = clsx(
    "w-full rounded-[8px] py-2 text-center text-[16px] font-semibold outline-none transition-[box-shadow] duration-300",
    completed
      ? "bg-transparent text-[var(--label-secondary)]"
      : shaking
        ? "bg-[var(--fill-quaternary)] text-[var(--foreground)] shadow-[inset_0_0_0_2px_var(--danger)]"
        : "bg-[var(--fill-quaternary)] text-[var(--foreground)] focus:bg-[var(--fill-tertiary)]",
  );

  return (
    <motion.div
      className="flex items-center gap-0.5"
      animate={shaking ? { x: [0, -7, 7, -5, 5, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.42 }}
    >
      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="0"
        value={h > 0 ? h : ""}
        onChange={(e) => update("h", e.target.value)}
        className={inputCls}
      />
      <span className="shrink-0 text-[12px] text-[var(--label-secondary)]">:</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        placeholder="00"
        value={m > 0 ? m : ""}
        onChange={(e) => update("m", e.target.value)}
        className={inputCls}
      />
      <span className="shrink-0 text-[12px] text-[var(--label-secondary)]">:</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        placeholder="00"
        value={s > 0 ? s : ""}
        onChange={(e) => update("s", e.target.value)}
        className={inputCls}
      />
    </motion.div>
  );
}

// ─── Previous set cell ────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}

function formatPrevCell(set: WorkoutSet, type: ExerciseType): string {
  switch (type) {
    case "weight_reps":
      if (set.weight_kg != null && set.reps != null) return `${set.weight_kg}kg × ${set.reps}`;
      if (set.weight_kg != null) return `${set.weight_kg}kg`;
      if (set.reps != null) return `${set.reps} reps`;
      return "—";
    case "bodyweight_reps":
      return set.reps != null ? `${set.reps} reps` : "—";
    case "duration":
      return set.duration_seconds != null ? formatDuration(set.duration_seconds) : "—";
    case "duration_weight":
      if (set.weight_kg != null && set.duration_seconds != null) return `${set.weight_kg}kg × ${formatDuration(set.duration_seconds)}`;
      return "—";
    case "distance_duration":
      if (set.distance_m != null && set.duration_seconds != null) return `${set.distance_m}m × ${formatDuration(set.duration_seconds)}`;
      return "—";
    case "weight_distance":
      if (set.weight_kg != null && set.distance_m != null) return `${set.weight_kg}kg × ${set.distance_m}m`;
      return "—";
    case "bands":
      if (set.reps != null) return `${set.band_resistance != null ? `${set.band_resistance}kg × ` : ""}${set.reps} reps`;
      return "—";
    default:
      return "—";
  }
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
        template: "32px minmax(0,1fr) 1fr 1fr 44px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "Reps", placeholder: "0" },
        ],
      };
    case "bodyweight_reps":
      return {
        template: "32px minmax(0,1fr) 1fr 44px",
        fields: [{ key: "reps", label: "Reps", placeholder: "0" }],
      };
    case "duration":
      return {
        template: "32px minmax(0,1fr) 1fr 44px",
        fields: [{ key: "duration_seconds", label: "Seg", placeholder: "0" }],
      };
    case "duration_weight":
      return {
        template: "32px minmax(0,1fr) 1fr 1fr 44px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "duration_seconds", label: "Seg", placeholder: "0" },
        ],
      };
    case "distance_duration":
      return {
        template: "32px minmax(0,1fr) 1fr 1fr 44px",
        fields: [
          { key: "distance_m", label: "M", placeholder: "0" },
          { key: "duration_seconds", label: "Seg", placeholder: "0" },
        ],
      };
    case "weight_distance":
      return {
        template: "32px minmax(0,1fr) 1fr 1fr 44px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "distance_m", label: "M", placeholder: "0" },
        ],
      };
    case "bands":
      return {
        template: "32px minmax(0,1fr) 1fr 1fr 1fr 44px",
        fields: [],
      };
    default:
      return {
        template: "32px minmax(0,1fr) 1fr 1fr 44px",
        fields: [
          { key: "weight_kg", label: "KG", placeholder: "0" },
          { key: "reps", label: "Reps", placeholder: "0" },
        ],
      };
  }
}
