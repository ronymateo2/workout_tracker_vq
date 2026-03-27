"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ClipboardList, Search, Dumbbell, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useWorkout } from "@/lib/workout-context";
import { useData } from "@/lib/data-context";
import { getRoutinesWithExerciseNames } from "@/lib/data";
import type { Routine } from "@/types/models";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { CreateRoutine } from "@/components/workout/create-routine";
import { RoutineDetail } from "@/components/workout/routine-detail";

interface WorkoutTabProps {
  onResumeWorkout: () => void;
}

export function WorkoutTab({ onResumeWorkout }: WorkoutTabProps) {
  const { user } = useAuth();
  const { supabase } = useData();
  const { activeSession, startWorkout, discardWorkout } = useWorkout();
  const [routines, setRoutines] = useState<(Routine & { exerciseNames: string[] })[]>([]);
  const [showCreateRoutine, setShowCreateRoutine] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  // undefined = no pending action, null = empty workout, string = routineId
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null | undefined>(undefined);

  const loadRoutines = useCallback(async () => {
    if (!user || !supabase) return;
    const r = await getRoutinesWithExerciseNames(supabase, user.id);
    setRoutines(r);
  }, [user, supabase]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  function handleStartWorkout(routineId?: string) {
    if (activeSession) {
      setPendingRoutineId(routineId ?? null);
    } else {
      void startWorkout(routineId);
    }
  }

  async function confirmNewSession() {
    await discardWorkout();
    await startWorkout(pendingRoutineId ?? undefined);
    setPendingRoutineId(undefined);
  }

  return (
    <div className="safe-top px-4">
      <h1 className="pt-2 pb-4 text-[34px] font-bold tracking-tight">Entreno</h1>

      {/* Start Empty Workout */}
      <Button
        variant="secondary"
        size="lg"
        onClick={() => handleStartWorkout()}
        className="mb-6"
      >
        <Plus className="size-5" />
        Empezar Entreno Vacío
      </Button>

      {/* Routines section */}
      <h2 className="mb-3 text-[20px] font-bold">Rutinas</h2>

      {/* Grid: New Routine + Explore */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setShowCreateRoutine(true)}
          className="flex flex-col items-center gap-2 rounded-[16px] bg-[var(--background-secondary)] p-5 tap-highlight-transparent active:opacity-80"
        >
          <ClipboardList className="size-7 text-[var(--label-secondary)]" />
          <span className="text-[14px] font-semibold">Nueva Rutina</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-2 rounded-[16px] bg-[var(--background-secondary)] p-5 tap-highlight-transparent active:opacity-80"
        >
          <Search className="size-7 text-[var(--label-secondary)]" />
          <span className="text-[14px] font-semibold">Explorar Rutinas</span>
        </button>
      </div>

      {/* Routine List */}
      {routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="size-10" />}
          message="Crea tu primera rutina para empezar a entrenar."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="rounded-[16px] bg-[var(--background-secondary)] p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[17px] font-bold">{routine.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedRoutineId(routine.id)}
                  className="rounded-full p-1 tap-highlight-transparent active:opacity-60"
                >
                  <MoreHorizontal className="size-5 text-[var(--label-secondary)]" />
                </button>
              </div>
              {routine.exerciseNames.length > 0 && (
                <p className="mb-3 text-[13px] text-[var(--label-secondary)] leading-snug">
                  {routine.exerciseNames.join(", ")}
                </p>
              )}
              <button
                type="button"
                onClick={() => handleStartWorkout(routine.id)}
                className="w-full rounded-[12px] bg-[var(--accent)] py-3 text-[15px] font-semibold text-white tap-highlight-transparent active:opacity-80"
              >
                Iniciar Rutina
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Routine Sheet */}
      <CreateRoutine
        open={showCreateRoutine}
        onClose={() => setShowCreateRoutine(false)}
        onSaved={() => {
          setShowCreateRoutine(false);
          loadRoutines();
        }}
      />

      {/* Routine Detail Sheet */}
      {selectedRoutineId && (
        <RoutineDetail
          routineId={selectedRoutineId}
          open={!!selectedRoutineId}
          onClose={() => setSelectedRoutineId(null)}
          onDeleted={() => {
            setSelectedRoutineId(null);
            loadRoutines();
          }}
          onStartWorkout={() => {
            setSelectedRoutineId(null);
            handleStartWorkout(selectedRoutineId);
          }}
        />
      )}

      {/* Conflict dialog: active session exists */}
      <AlertDialog
        open={pendingRoutineId !== undefined}
        title="Sesión activa en curso"
        description="¿Qué deseas hacer con la sesión actual?"
        actions={[
          {
            label: "Resumir sesión",
            variant: "cancel",
            onClick: () => {
              setPendingRoutineId(undefined);
              onResumeWorkout();
            },
          },
          {
            label: "Nueva sesión",
            variant: "danger",
            onClick: () => void confirmNewSession(),
          },
          {
            label: "Cancelar",
            variant: "cancel",
            onClick: () => setPendingRoutineId(undefined),
          },
        ]}
      />
    </div>
  );
}
