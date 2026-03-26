"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useWorkout } from "@/lib/workout-context";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { WorkoutTimer } from "./workout-timer";
import { ExerciseCard } from "./exercise-card";
import { ExercisePicker } from "./exercise-picker";

export function ActiveWorkout() {
  const { activeSession, entries, finishWorkout, discardWorkout } = useWorkout();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  if (!activeSession) return null;

  // Calculate stats
  let totalVolume = 0;
  let totalCompletedSets = 0;
  for (const entry of entries) {
    for (const set of entry.sets) {
      if (set.completed) {
        totalCompletedSets++;
        if (set.weight_kg && set.reps) {
          totalVolume += set.weight_kg * set.reps;
        }
      }
    }
  }

  return (
    <div className="safe-top flex min-h-screen flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--background)] px-4 pb-3 pt-2">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDiscardConfirm(true)}
            className="flex items-center gap-1 text-[15px] text-[var(--label-secondary)] tap-highlight-transparent"
          >
            <ChevronDown className="size-5" />
            Log Workout
          </button>
          <Button
            variant="primary"
            size="sm"
            className="!w-auto"
            onClick={() => void finishWorkout()}
          >
            Finalizar
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-6 text-[12px]">
          <div>
            <span className="text-[var(--label-secondary)]">Duración </span>
            <WorkoutTimer startedAt={activeSession.started_at} />
          </div>
          <div>
            <span className="text-[var(--label-secondary)]">Volumen </span>
            <span className="font-semibold text-[var(--accent)]">
              {totalVolume > 0 ? `${Math.round(totalVolume)} kg` : "0 kg"}
            </span>
          </div>
          <div>
            <span className="text-[var(--label-secondary)]">Series </span>
            <span className="font-semibold text-[var(--accent)]">
              {totalCompletedSets}
            </span>
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 space-y-3 px-4 py-4">
        {entries.map((entry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
          />
        ))}

        {/* Add Exercise button */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowExercisePicker(true)}
        >
          <Plus className="size-5" />
          Agregar Ejercicio
        </Button>
      </div>

      {/* Exercise Picker */}
      <ExercisePicker
        open={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
      />

      {/* Discard confirmation */}
      <AlertDialog
        open={showDiscardConfirm}
        title="¿Descartar rutina?"
        description="Se perderán todos los datos de esta sesión."
        actions={[
          {
            label: "Descartar",
            variant: "danger",
            onClick: () => {
              setShowDiscardConfirm(false);
              void discardWorkout();
            },
          },
          {
            label: "Cancelar",
            variant: "cancel",
            onClick: () => setShowDiscardConfirm(false),
          },
        ]}
      />
    </div>
  );
}
