"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { WorkoutSessionWithEntries } from "@/types/models";

interface WorkoutCardProps {
  workout: WorkoutSessionWithEntries;
  routineMap?: Record<string, string>;
  isLatest?: boolean;
}

export function WorkoutCard({ workout, routineMap, isLatest = false }: WorkoutCardProps) {
  const timeAgo = formatDistanceToNow(new Date(workout.started_at), {
    addSuffix: true,
    locale: es,
  }).toUpperCase();

  const durationMs = workout.finished_at
    ? new Date(workout.finished_at).getTime() -
      new Date(workout.started_at).getTime()
    : 0;
  const durationMin = Math.round(durationMs / 60000);

  let totalVolume = 0;
  let totalSets = 0;
  for (const entry of workout.entries) {
    for (const set of entry.sets) {
      if (set.completed) {
        totalSets++;
        if (set.weight_kg && set.reps) {
          totalVolume += set.weight_kg * set.reps;
        }
      }
    }
  }

  const title =
    (workout.routine_id && routineMap?.[workout.routine_id]) ||
    workout.notes ||
    "Entreno libre";

  return (
    <div 
      className={`overflow-hidden rounded-[20px] bg-[var(--background-secondary)] transition-all ${
        isLatest 
          ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--background)] shadow-sm" 
          : "shadow-xs"
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-[12px] font-semibold tracking-widest ${
            isLatest ? "text-[var(--accent)]" : "text-[var(--label-secondary)]"
          }`}>
            {timeAgo}
          </p>
          {isLatest && (
            <span className="flex h-5 items-center rounded-full bg-[var(--accent-soft)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
              Último
            </span>
          )}
        </div>
        <p className="text-[19px] font-bold text-[var(--foreground)]">
          {title}
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-0 border-t border-[var(--line)]">
        <div className="flex-1 px-4 py-3">
          <p className="text-[28px] font-bold leading-none text-[var(--accent)]">
            {durationMin}
          </p>
          <p className="mt-1 text-[12px] text-[var(--label-secondary)]">min</p>
        </div>
        <div className="w-px bg-[var(--line)]" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[28px] font-bold leading-none text-[var(--foreground)]">
            {totalSets}
          </p>
          <p className="mt-1 text-[12px] text-[var(--label-secondary)]">
            series
          </p>
        </div>
        <div className="w-px bg-[var(--line)]" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[28px] font-bold leading-none text-[var(--foreground)]">
            {Math.round(totalVolume > 0 ? totalVolume : 0)}
          </p>
          <p className="mt-1 text-[12px] text-[var(--label-secondary)]">kg</p>
        </div>
      </div>

      {/* Exercise list */}
      {workout.entries.length > 0 && (
        <div className="border-t border-[var(--line)]">
          {workout.entries.map((entry, i) => {
            const completed = entry.sets.filter((s) => s.completed).length;
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-4 py-2.5 ${
                  i > 0 ? "border-t border-[var(--line)]" : ""
                }`}
              >
                <span className="text-[15px] text-[var(--foreground)]">
                  {entry.exercise.name}
                </span>
                <span className="text-[14px] text-[var(--label-secondary)]">
                  {completed} {completed === 1 ? "serie" : "series"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
