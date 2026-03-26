"use client";

import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import { createExercise } from "@/lib/data";
import type { Exercise, ExerciseType, MuscleGroup } from "@/types/models";
import { EXERCISE_TYPE_LABELS, MUSCLE_GROUP_LABELS } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface CreateExerciseProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialName?: string;
}

const EXERCISE_TYPES: ExerciseType[] = [
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "duration_weight",
  "distance_duration",
  "weight_distance",
  "bands",
];

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "traps",
  "lats",
  "full_body",
];

export function CreateExercise({
  open,
  onClose,
  onCreated,
  initialName = "",
}: CreateExerciseProps) {
  const { user } = useAuth();
  const { supabase } = useData();
  const [name, setName] = useState(initialName);
  const [exerciseType, setExerciseType] = useState<ExerciseType>("weight_reps");
  const [unilateral, setUnilateral] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);

  // Reset form when opened
  const handleOpen = () => {
    setName(initialName);
    setExerciseType("weight_reps");
    setUnilateral(false);
    setSelectedMuscles([]);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  if (open && name === "" && initialName) {
    handleOpen();
  }

  const toggleMuscle = (muscle: MuscleGroup) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    );
  };

  const handleSave = async () => {
    if (!user || !supabase || !name.trim()) return;

    const exercise: Exercise = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name: name.trim(),
      exercise_type: exerciseType,
      unilateral,
      muscle_groups: selectedMuscles.length > 0 ? selectedMuscles : ["full_body"],
      created_at: new Date().toISOString(),
    };

    await createExercise(supabase, exercise);
    onCreated();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Crear Ejercicio">
      <div className="space-y-5 px-4 py-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--label-secondary)]">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio"
            className="ios-input"

          />
        </div>

        {/* Exercise Type */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--label-secondary)]">
            Tipo de Ejercicio
          </label>
          <div className="flex flex-wrap gap-2">
            {EXERCISE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setExerciseType(type)}
                className={clsx(
                  "rounded-[10px] px-3 py-2 text-[13px] font-medium tap-highlight-transparent transition",
                  exerciseType === type
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--fill-tertiary)] text-[var(--foreground)]",
                )}
              >
                {EXERCISE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Unilateral */}
        <div className="flex items-center justify-between rounded-[14px] bg-[var(--background-tertiary)] px-4 py-3">
          <span className="text-[15px]">Unilateral</span>
          <button
            type="button"
            onClick={() => setUnilateral(!unilateral)}
            className={clsx(
              "relative h-[31px] w-[51px] rounded-full transition-colors",
              unilateral ? "bg-[var(--success)]" : "bg-[var(--fill)]",
            )}
          >
            <span
              className={clsx(
                "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow transition-transform",
                unilateral && "translate-x-[20px]",
              )}
            />
          </button>
        </div>

        {/* Muscle Groups */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--label-secondary)]">
            Grupos Musculares
          </label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => toggleMuscle(muscle)}
                className={clsx(
                  "rounded-[10px] px-3 py-2 text-[13px] font-medium tap-highlight-transparent transition",
                  selectedMuscles.includes(muscle)
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--fill-tertiary)] text-[var(--foreground)]",
                )}
              >
                {MUSCLE_GROUP_LABELS[muscle]}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => void handleSave()}
          disabled={!name.trim()}
        >
          Guardar
        </Button>
      </div>
    </Sheet>
  );
}
