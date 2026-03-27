"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Trash2, Pencil, Copy, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import {
  getRoutineWithExercises,
  deleteRoutine,
  createRoutine,
} from "@/lib/data";
import type { RoutineExercise, RoutineWithExercises } from "@/types/models";
import { BAND_COLOR_LABELS } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
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
    if (open) load(); // eslint-disable-line react-hooks/set-state-in-effect
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
      default_reps: re.default_reps,
      default_duration_seconds: re.default_duration_seconds,
      default_band_color: re.default_band_color,
      default_band_resistance: re.default_band_resistance,
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
        <div className="flex flex-col gap-6 px-4 py-4 pb-8">
          {/* Exercise list */}
          {routine.exercises.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-widest text-[var(--label-secondary)]">
                Ejercicios
              </p>
              <div className="ios-list">
                {routine.exercises.map((re) => {
                  const details: string[] = [`${re.default_sets} series`];
                  if (re.default_reps) details.push(`${re.default_reps} reps`);
                  if (re.default_duration_seconds)
                    details.push(`${re.default_duration_seconds} seg.`);
                  if (re.default_band_color)
                    details.push(BAND_COLOR_LABELS[re.default_band_color]);
                  if (re.default_band_resistance)
                    details.push(`${re.default_band_resistance} kg`);
                  return (
                    <div key={re.id} className="ios-list-item">
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <span className="text-[16px] text-[var(--foreground)]">
                          {re.exercise.name}
                        </span>
                        <span className="text-[14px] text-[var(--label-secondary)]">
                          {details.join(" · ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onStartWorkout}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--accent)] py-4 text-[17px] font-semibold text-white min-h-[50px] tap-highlight-transparent active:opacity-80"
          >
            <Play className="size-5 translate-x-px fill-white" />
            Empezar Entreno
          </button>

          {/* Secondary actions — iOS Settings-style rows */}
          <div className="ios-list">
            <div className="ios-list-item">
              <button
                type="button"
                onClick={() => onEdit(routine)}
                className="flex w-full items-center gap-3 px-4 py-3.5 tap-highlight-transparent active:opacity-60"
              >
                <Pencil className="size-[18px] shrink-0 text-[var(--accent)]" />
                <span className="flex-1 text-left text-[16px] text-[var(--foreground)]">
                  Editar Rutina
                </span>
                <ChevronRight className="size-4 text-[var(--label-tertiary)]" />
              </button>
            </div>
            <div className="ios-list-item">
              <button
                type="button"
                onClick={() => void handleDuplicate()}
                disabled={duplicating}
                className="flex w-full items-center gap-3 px-4 py-3.5 tap-highlight-transparent active:opacity-60 disabled:opacity-40"
              >
                <Copy className="size-[18px] shrink-0 text-[var(--accent)]" />
                <span className="flex-1 text-left text-[16px] text-[var(--foreground)]">
                  {duplicating ? "Duplicando…" : "Duplicar Rutina"}
                </span>
                <ChevronRight className="size-4 text-[var(--label-tertiary)]" />
              </button>
            </div>
          </div>

          {/* Destructive action — subtle text button */}
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-[15px] font-medium text-[#FF453A] tap-highlight-transparent active:opacity-60"
          >
            <Trash2 className="size-4" />
            Eliminar Rutina
          </button>
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
