"use client";

import { useState } from "react";
import { Plus, Dumbbell, X, Minus } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import { createRoutine } from "@/lib/data";
import type { Exercise, Routine, RoutineExercise } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ExercisePicker } from "./exercise-picker";

interface CreateRoutineProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface RoutineExerciseItem {
  exercise: Exercise;
  defaultSets: number;
}

export function CreateRoutine({ open, onClose, onSaved }: CreateRoutineProps) {
  const { user } = useAuth();
  const { supabase } = useData();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const handlePickExercise = (exercise: Exercise) => {
    setExercises((prev) => [...prev, { exercise, defaultSets: 3 }]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSets = (index: number, delta: number) => {
    setExercises((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, defaultSets: Math.max(1, item.defaultSets + delta) }
          : item,
      ),
    );
  };

  const handleSave = async () => {
    if (!user || !supabase || !name.trim()) return;

    const routine: Routine = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const routineExercises: RoutineExercise[] = exercises.map((item, i) => ({
      id: crypto.randomUUID(),
      routine_id: routine.id,
      exercise_id: item.exercise.id,
      position: i,
      default_sets: item.defaultSets,
    }));

    await createRoutine(supabase, routine, routineExercises);
    setName("");
    setExercises([]);
    onSaved();
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Crear Rutina">
        <div className="px-4 py-4">
          {/* Name input */}
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la rutina"
              className="w-full border-b border-[var(--line)] bg-transparent pb-2 text-[20px] font-bold text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)]"

            />
          </div>

          {/* Exercise list */}
          {exercises.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="size-10" />}
              message="Agrega ejercicios a tu rutina."
            />
          ) : (
            <div className="mb-4 space-y-2">
              {exercises.map((item, i) => (
                <div
                  key={`${item.exercise.id}-${i}`}
                  className="flex items-center gap-3 rounded-[14px] bg-[var(--background-tertiary)] px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {item.exercise.name}
                    </p>
                  </div>

                  {/* Sets counter */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateSets(i, -1)}
                      className="flex size-7 items-center justify-center rounded-full bg-[var(--fill-tertiary)] tap-highlight-transparent"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-[14px] font-semibold">
                      {item.defaultSets}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateSets(i, 1)}
                      className="flex size-7 items-center justify-center rounded-full bg-[var(--fill-tertiary)] tap-highlight-transparent"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeExercise(i)}
                    className="p-1 text-[var(--danger)] tap-highlight-transparent"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add exercise */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowPicker(true)}
            className="mb-3"
          >
            <Plus className="size-5" />
            Agregar Ejercicio
          </Button>

          {/* Save */}
          {exercises.length > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => void handleSave()}
              disabled={!name.trim()}
            >
              Guardar Rutina
            </Button>
          )}
        </div>
      </Sheet>

      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onPick={handlePickExercise}
      />
    </>
  );
}
