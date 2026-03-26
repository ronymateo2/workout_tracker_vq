"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ClipboardList, Search, Dumbbell } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useWorkout } from "@/lib/workout-context";
import { useData } from "@/lib/data-context";
import { getRoutines } from "@/lib/data";
import type { Routine } from "@/types/models";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { CreateRoutine } from "@/components/workout/create-routine";
import { RoutineDetail } from "@/components/workout/routine-detail";

export function WorkoutTab() {
  const { user } = useAuth();
  const { supabase } = useData();
  const { activeSession, startWorkout } = useWorkout();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showCreateRoutine, setShowCreateRoutine] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);

  const loadRoutines = useCallback(async () => {
    if (!user || !supabase) return;
    const r = await getRoutines(supabase, user.id);
    setRoutines(r);
  }, [user, supabase]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  // If there's an active workout, show it fullscreen
  if (activeSession) {
    return <ActiveWorkout />;
  }

  return (
    <div className="safe-top px-4">
      <h1 className="pt-2 pb-4 text-[34px] font-bold tracking-tight">Entreno</h1>

      {/* Start Empty Workout */}
      <Button
        variant="secondary"
        size="lg"
        onClick={() => void startWorkout()}
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
        <div className="flex flex-col gap-2">
          {routines.map((routine) => (
            <button
              key={routine.id}
              type="button"
              onClick={() => setSelectedRoutineId(routine.id)}
              className="flex items-center justify-between rounded-[14px] bg-[var(--background-secondary)] px-4 py-3.5 text-left tap-highlight-transparent active:opacity-80"
            >
              <span className="text-[15px] font-medium">{routine.name}</span>
              <span className="text-[13px] text-[var(--label-secondary)]">
                Ver
              </span>
            </button>
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
          onStartWorkout={async () => {
            await startWorkout(selectedRoutineId);
            setSelectedRoutineId(null);
          }}
        />
      )}
    </div>
  );
}
