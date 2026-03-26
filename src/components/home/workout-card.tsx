"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { WorkoutSessionWithEntries } from "@/types/models";

interface WorkoutCardProps {
  workout: WorkoutSessionWithEntries;
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const timeAgo = formatDistanceToNow(new Date(workout.started_at), {
    addSuffix: true,
    locale: es,
  });

  // Calculate duration
  const durationMs = workout.finished_at
    ? new Date(workout.finished_at).getTime() - new Date(workout.started_at).getTime()
    : 0;
  const durationMin = Math.round(durationMs / 60000);

  // Calculate total volume
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

  return (
    <div className="rounded-[16px] bg-[var(--background-secondary)] p-4">
      {/* Header */}
      <div className="mb-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--label-secondary)]">
          {timeAgo}
        </p>
        <h3 className="text-[17px] font-semibold">
          {workout.notes || "Entreno"}
        </h3>
      </div>

      {/* Stats */}
      <div className="mb-3 flex gap-4">
        <div>
          <p className="text-[11px] text-[var(--label-secondary)]">Duración</p>
          <p className="text-[15px] font-semibold text-[var(--accent)]">
            {durationMin}min
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--label-secondary)]">Volumen</p>
          <p className="text-[15px] font-semibold text-[var(--accent)]">
            {totalVolume > 0 ? `${Math.round(totalVolume)} kg` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--label-secondary)]">Series</p>
          <p className="text-[15px] font-semibold text-[var(--accent)]">
            {totalSets}
          </p>
        </div>
      </div>

      {/* Exercise list */}
      {workout.entries.length > 0 && (
        <div className="border-t border-[var(--line)] pt-2">
          {workout.entries.map((entry) => {
            const completedSets = entry.sets.filter((s) => s.completed).length;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-2 py-1 text-[14px]"
              >
                <span className="text-[var(--label-secondary)]">
                  {completedSets} series
                </span>
                <span className="text-[var(--foreground)]">
                  {entry.exercise.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
