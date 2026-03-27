"use client";

import { useState } from "react";
import clsx from "clsx";
import { Link2 } from "lucide-react";
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
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Reset form when opened
  const handleOpen = () => {
    setName(initialName);
    setExerciseType("weight_reps");
    setUnilateral(false);
    setSelectedMuscles([]);
    setDescription("");
    setVideoUrl("");
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
      description: description.trim() || null,
      video_url: videoUrl.trim() || null,
      created_at: new Date().toISOString(),
    };

    await createExercise(supabase, exercise);
    onCreated();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Crear Ejercicio">
      <div className="space-y-6 px-4 py-5">

        {/* ── Sección: Info básica ── */}
        <div>
          <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--label-secondary)]">
            Info básica
          </p>
          <div className="ios-list">
            {/* Nombre */}
            <div className="ios-list-item px-4 py-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del ejercicio"
                className="w-full bg-transparent text-[16px] text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)]"
              />
            </div>
            {/* Descripción */}
            <div className="ios-list-item px-4 py-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción, forma y técnica…"
                rows={3}
                className="w-full resize-none bg-transparent text-[16px] text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)]"
              />
            </div>
            {/* Video */}
            <div className="ios-list-item flex items-center gap-3 px-4 py-3">
              <Link2 className="size-4 shrink-0 text-[var(--label-tertiary)]" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Video (opcional)"
                className="flex-1 bg-transparent text-[16px] text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)]"
              />
            </div>
          </div>
        </div>

        {/* ── Sección: Configuración ── */}
        <div>
          <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--label-secondary)]">
            Configuración
          </p>
          <div className="ios-list">
            {/* Tipo de ejercicio */}
            <div className="ios-list-item flex items-center justify-between px-4 py-3">
              <span className="text-[16px]">Tipo de ejercicio</span>
              <select
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
                className="max-w-[52%] bg-transparent text-right text-[16px] text-[var(--accent)] outline-none"
              >
                {EXERCISE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EXERCISE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            {/* Unilateral */}
            <div className="ios-list-item flex items-center justify-between px-4 py-3">
              <span className="text-[16px]">Unilateral</span>
              <button
                type="button"
                onClick={() => setUnilateral(!unilateral)}
                className={clsx(
                  "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors",
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
          </div>
        </div>

        {/* ── Sección: Grupos musculares ── */}
        <div>
          <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--label-secondary)]">
            Grupos musculares
          </p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => toggleMuscle(muscle)}
                className={clsx(
                  "rounded-full px-4 py-2 text-[14px] font-medium tap-highlight-transparent transition",
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

        {/* ── Guardar ── */}
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
