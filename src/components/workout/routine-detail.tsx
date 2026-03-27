"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Trash2, Pencil, Copy } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import {
  getRoutineWithExercises,
  deleteRoutine,
  createRoutine,
} from "@/lib/data";
import type { RoutineExercise, RoutineWithExercises } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";

interface RoutineDetailProps {
  routineId: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onStartWorkout: () => void;
  onEdit: (routine: RoutineWithExercises) => void;
  onDuplicated: () => void;
}

export function RoutineDetail({
  routineId,
  open,
  onClose,
  onDeleted,
  onStartWorkout,
  onEdit,
  onDuplicated,
}: RoutineDetailProps) {
  const { user } = useAuth();
  const { supabase } = useData();
  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

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
    setShowConfirm(false);
    onDeleted();
  };

  const handleDuplicate = async () => {
    if (!supabase || !routine || !user) return;
    setDuplicating(true);
    const newRoutineId = crypto.randomUUID();
    const newRoutine = {
      id: newRoutineId,
      user_id: user.id,
      name: `${routine.name} (copia)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newExercises: RoutineExercise[] = routine.exercises.map((re, i) => ({
      id: crypto.randomUUID(),
      routine_id: newRoutineId,
      exercise_id: re.exercise_id,
      position: i,
      default_sets: re.default_sets,
    }));
    await createRoutine(supabase, newRoutine, newExercises);
    setDuplicating(false);
    onDuplicated();
    onClose();
  };

  if (!routine) return null;

  return (
    <>
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
              variant="secondary"
              size="lg"
              onClick={() => onEdit(routine)}
            >
              <Pencil className="size-5" />
              Editar Rutina
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => void handleDuplicate()}
              disabled={duplicating}
            >
              <Copy className="size-5" />
              {duplicating ? "Duplicando…" : "Duplicar Rutina"}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="size-5" />
              Eliminar Rutina
            </Button>
          </div>
        </div>
      </Sheet>

      <AlertDialog
        open={showConfirm}
        title="Eliminar Rutina"
        description={`¿Seguro que quieres eliminar "${routine.name}"? Esta acción no se puede deshacer.`}
        actions={[
          {
            label: "Eliminar",
            variant: "danger",
            onClick: () => void handleDelete(),
          },
          {
            label: "Cancelar",
            variant: "cancel",
            onClick: () => setShowConfirm(false),
          },
        ]}
      />
    </>
  );
}
