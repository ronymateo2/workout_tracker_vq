"use client";

import { useCallback, useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import { getRecentWorkouts } from "@/lib/data";
import type { WorkoutSessionWithEntries } from "@/types/models";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkoutCard } from "@/components/home/workout-card";

export function HomeTab() {
  const { user } = useAuth();
  const { supabase } = useData();
  const [workouts, setWorkouts] = useState<WorkoutSessionWithEntries[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkouts = useCallback(async () => {
    if (!user || !supabase) return;
    const recent = await getRecentWorkouts(supabase, user.id, 5);
    setWorkouts(recent);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  return (
    <div className="safe-top px-4">
      <h1 className="pt-2 pb-4 text-[34px] font-bold tracking-tight">Inicio</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="size-12" />}
          message="Aún no tienes entrenamientos. ¡Empieza uno desde la pestaña Entreno!"
        />
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}
