"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Trash2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { getRoutineWithExercises, deleteRoutine } from "@/lib/data";
import type { RoutineWithExercises } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface RoutineDetailProps {
  routineId: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onStartWorkout: () => void;
}

export function RoutineDetail({
  routineId,
  open,
  onClose,
  onDeleted,
  onStartWorkout,
}: RoutineDetailProps) {
  const { supabase } = useData();
  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const r = await getRoutineWithExercises(supabase, routineId);
    setRoutine(r);
  }, [routineId, supabase]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDelete = async () => {
    if (!supabase) return;
    await deleteRoutine(supabase, routineId);
    onDeleted();
  };

  if (!routine) return null;

  return (
    <Sheet open={open} onClose={onClose} title={routine.name}>
      <div className="px-4 py-4">
        {/* Exercise list */}
        <div className="mb-6 space-y-1">
          {routine.exercises.map((re) => (
            <div
              key={re.id}
              className="flex items-center justify-between rounded-[12px] bg-[var(--background-tertiary)] px-3 py-3"
            >
              <span className="text-[15px]">{re.exercise.name}</span>
              <span className="text-[13px] text-[var(--label-secondary)]">
                {re.default_sets} series
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="primary" size="lg" onClick={onStartWorkout}>
            <Play className="size-5" />
            Empezar Entreno
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="size-5" />
            Eliminar Rutina
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
