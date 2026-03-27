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
  const [showNoSetsAlert, setShowNoSetsAlert] = useState(false);
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);

  if (!activeSession) return null;

  // Calculate stats
  let totalVolume = 0;
  let totalCompletedSets = 0;
  const incompleteExercises: string[] = [];
  for (const entry of entries) {
    const completedInEntry = entry.sets.filter((s) => s.completed).length;
    if (completedInEntry === 0) {
      incompleteExercises.push(entry.exercise.name);
    }
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="safe-top shrink-0 border-b border-[var(--line)] px-4 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDiscardConfirm(true)}
            className="flex items-center gap-1 text-[15px] text-[var(--label-secondary)] tap-highlight-transparent"
          >
            <ChevronDown className="size-5" />
            Entrenando
          </button>
          <Button
            variant="primary"
            size="sm"
            className="!w-auto"
            onClick={() => {
              if (totalCompletedSets === 0) {
                setShowNoSetsAlert(true);
              } else if (incompleteExercises.length > 0) {
                setShowIncompleteAlert(true);
              } else {
                void finishWorkout();
              }
            }}
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
      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4 pb-24">
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

      {/* Incomplete exercises confirmation */}
      <AlertDialog
        open={showIncompleteAlert}
        title="Ejercicios sin completar"
        description={`${incompleteExercises.join(", ")} no ${incompleteExercises.length === 1 ? "tiene" : "tienen"} series completadas. ¿Guardar de todas formas?`}
        actions={[
          {
            label: "Guardar de todas formas",
            variant: "default",
            onClick: () => {
              setShowIncompleteAlert(false);
              void finishWorkout();
            },
          },
          {
            label: "Continuar entrenando",
            variant: "cancel",
            onClick: () => setShowIncompleteAlert(false),
          },
        ]}
      />

      {/* No sets alert */}
      <AlertDialog
        open={showNoSetsAlert}
        title="Sin series completadas"
        description="Completa al menos una serie antes de finalizar el entrenamiento."
        actions={[
          {
            label: "Entendido",
            variant: "cancel",
            onClick: () => setShowNoSetsAlert(false),
          },
        ]}
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
