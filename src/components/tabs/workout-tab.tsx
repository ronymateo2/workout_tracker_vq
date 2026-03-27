"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Play, Dumbbell, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useWorkoutSession } from "@/lib/workout-context";
import { useData } from "@/lib/data-context";
import { getRoutinesWithExerciseNames } from "@/lib/data";
import { getRoutinesCache, setRoutinesCache } from "@/lib/db";
import type { Routine, RoutineWithExercises } from "@/types/models";
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
  const { activeSession, startWorkout, discardWorkout } = useWorkoutSession();
  const [routines, setRoutines] = useState<(Routine & { exerciseNames: string[] })[]>([]);
  const [showCreateRoutine, setShowCreateRoutine] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [routineToEdit, setRoutineToEdit] = useState<RoutineWithExercises | null>(null);
  // undefined = no pending action, null = empty workout, string = routineId
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null | undefined>(undefined);

  const fetchRoutines = useCallback(async () => {
    if (!user || !supabase) return;
    const r = await getRoutinesWithExerciseNames(supabase, user.id);
    setRoutines(r);
    void setRoutinesCache(user.id, r);
  }, [user, supabase]);

  const loadRoutines = fetchRoutines;

  useEffect(() => {
    if (!user) return;
    getRoutinesCache(user.id).then((cached) => {
      if (cached) setRoutines(cached);
      void fetchRoutines();
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartWorkout = useCallback(
    (routineId?: string) => {
      if (activeSession) {
        setPendingRoutineId(routineId ?? null);
      } else {
        void startWorkout(routineId);
      }
    },
    [activeSession, startWorkout],
  );

  const confirmNewSession = useCallback(async () => {
    await discardWorkout();
    await startWorkout(pendingRoutineId ?? undefined);
    setPendingRoutineId(undefined);
  }, [discardWorkout, startWorkout, pendingRoutineId]);

  return (
    <div className="safe-top px-4">
      {/* Header */}
      <div className="flex items-end justify-between pt-2 pb-6">
        <h1 className="text-[34px] font-bold tracking-tight">Entreno</h1>
        <button
          type="button"
          onClick={() => setShowCreateRoutine(true)}
          className="mb-1 flex items-center gap-1 text-[var(--accent)] text-[17px] font-medium tap-highlight-transparent active:opacity-60"
        >
          <Plus className="size-5" />
          Nueva
        </button>
      </div>

      {/* Start empty workout */}
      <button
        type="button"
        onClick={() => handleStartWorkout()}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--fill-tertiary)] py-4 text-[16px] font-medium text-[var(--label-secondary)] tap-highlight-transparent active:opacity-70"
      >
        <Plus className="size-5" />
        Entreno vacío
      </button>

      {/* Routine list */}
      {routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="size-10" />}
          message="Crea tu primera rutina para empezar a entrenar."
        />
      ) : (
        <>
          <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-widest text-[var(--label-secondary)]">
            Rutinas
          </p>
          <div className="ios-list">
            {routines.map((routine) => (
              <div key={routine.id} className="ios-list-item">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-[var(--foreground)]">
                      {routine.name}
                    </p>
                    {routine.exerciseNames.length > 0 && (
                      <p className="mt-0.5 truncate text-[14px] leading-snug text-[var(--label-secondary)]">
                        {routine.exerciseNames.join(" · ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartWorkout(routine.id)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] tap-highlight-transparent active:opacity-80"
                  >
                    <Play className="size-4 translate-x-px fill-white text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRoutineId(routine.id)}
                    className="-mr-2 p-2 tap-highlight-transparent active:opacity-60"
                  >
                    <MoreHorizontal className="size-5 text-[var(--label-tertiary)]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create / Edit Routine Sheet */}
      <CreateRoutine
        open={showCreateRoutine || !!routineToEdit}
        onClose={() => {
          setShowCreateRoutine(false);
          setRoutineToEdit(null);
        }}
        onSaved={() => {
          setShowCreateRoutine(false);
          setRoutineToEdit(null);
          loadRoutines();
        }}
        routineToEdit={routineToEdit}
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
          onEdit={(routine) => {
            setSelectedRoutineId(null);
            setRoutineToEdit(routine);
          }}
          onDuplicated={loadRoutines}
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
