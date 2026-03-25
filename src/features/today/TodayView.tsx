"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import type { WorkoutEntry, WorkoutSession } from "@/lib/workout-types";
import { describeEntry, formatShortDate } from "@/shared/lib/formatters";

export function TodayView({
  selectedDate,
  session,
  onEdit,
  onDelete,
}: {
  selectedDate: string;
  session: WorkoutSession | null;
  onEdit: (entry: WorkoutEntry) => void;
  onDelete: (entryId: string) => void;
}) {
  if (!session || session.entries.length === 0) {
    return (
      <div className="ios-card px-5 py-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--fill-tertiary)]">
          <span className="text-2xl">🏋️</span>
        </div>
        <p className="text-[15px] font-semibold text-[var(--foreground)]">
          Sin ejercicios
        </p>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          {formatShortDate(selectedDate)} — Toca &ldquo;+ Ejercicio&rdquo; para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="ios-card">
      {session.entries.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.2 }}
          className="ios-list-item flex items-center gap-3 px-4 py-[14px]"
        >
          {/* Order badge */}
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--fill-tertiary)]">
            <span className="text-[11px] font-semibold text-[var(--muted)]">
              {index + 1}
            </span>
          </div>

          {/* Content — tappable to edit */}
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-[15px] font-semibold leading-snug text-[var(--foreground)]">
              {entry.exerciseName}
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--muted)]">
              {describeEntry(entry)}
            </p>
            {entry.notes ? (
              <p className="mt-0.5 text-[12px] italic text-[var(--label-tertiary)]">
                {entry.notes}
              </p>
            ) : null}
          </button>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="flex size-8 items-center justify-center rounded-full text-[var(--muted)] transition active:bg-[var(--fill)]"
              aria-label={`Editar ${entry.exerciseName}`}
            >
              <Pencil className="size-[15px]" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="flex size-8 items-center justify-center rounded-full text-[var(--muted)] transition active:bg-[var(--fill)] active:text-[var(--danger)]"
              aria-label={`Eliminar ${entry.exerciseName}`}
            >
              <Trash2 className="size-[15px]" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
