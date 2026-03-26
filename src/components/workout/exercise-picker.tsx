"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import { useWorkout } from "@/lib/workout-context";
import { getExercises } from "@/lib/data";
import type { Exercise, MuscleGroup } from "@/types/models";
import { MUSCLE_GROUP_LABELS } from "@/types/models";
import { Sheet } from "@/components/ui/sheet";
import { CreateExercise } from "./create-exercise";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onPick?: (exercise: Exercise) => void; // optional override (used by create-routine)
}

export function ExercisePicker({ open, onClose, onPick }: ExercisePickerProps) {
  const { user } = useAuth();
  const { supabase } = useData();
  const { addExercise } = useWorkout();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadExercises = useCallback(async () => {
    if (!user || !supabase) return;
    const all = await getExercises(supabase, user.id);
    setExercises(all);
  }, [user, supabase]);

  useEffect(() => {
    if (open) {
      loadExercises();
      setQuery("");
    }
  }, [open, loadExercises]);

  const filtered = useMemo(() => {
    if (!query.trim()) return exercises;
    const q = query.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  // Group by muscle group (first one)
  const grouped = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const e of filtered) {
      const group = e.muscle_groups[0] ?? "full_body";
      if (!groups[group]) groups[group] = [];
      groups[group].push(e);
    }
    return groups;
  }, [filtered]);

  const handleSelect = async (exercise: Exercise) => {
    if (onPick) {
      onPick(exercise);
    } else {
      await addExercise(exercise);
    }
    onClose();
  };

  const handleCreated = () => {
    setShowCreate(false);
    loadExercises();
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Agregar Ejercicio">
        <div className="px-4 py-3">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--label-secondary)]" />
            <input
              type="text"
              placeholder="Buscar ejercicio..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ios-input pl-9"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-[50dvh] overflow-y-auto scrollbar-none">
            {Object.keys(grouped).length === 0 ? (
              <div className="py-8 text-center">
                <p className="mb-3 text-[14px] text-[var(--label-secondary)]">
                  No se encontró &quot;{query}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white"
                >
                  <Plus className="size-4" />
                  Crear Ejercicio
                </button>
              </div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-4">
                  <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                    {MUSCLE_GROUP_LABELS[group as MuscleGroup] ?? group}
                  </h3>
                  <div className="rounded-[12px] bg-[var(--background-tertiary)]">
                    {items.map((exercise, i) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => void handleSelect(exercise)}
                        className={`flex w-full items-center px-3 py-3 text-left text-[15px] tap-highlight-transparent active:bg-[var(--fill-quaternary)] ${
                          i > 0 ? "border-t border-[var(--line)]" : ""
                        }`}
                      >
                        {exercise.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Always show create button at bottom */}
          {Object.keys(grouped).length > 0 && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--fill-tertiary)] py-3 text-[14px] font-medium text-[var(--foreground)] tap-highlight-transparent active:opacity-80"
            >
              <Plus className="size-4" />
              Crear Ejercicio
            </button>
          )}
        </div>
      </Sheet>

      <CreateExercise
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        initialName={query}
      />
    </>
  );
}
