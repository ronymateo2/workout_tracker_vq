"use client";

import { useCallback, useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useData } from "@/lib/data-context";
import { useWorkoutSession } from "@/lib/workout-context";
import { getRecentWorkouts } from "@/lib/data";
import { getRecentWorkoutsCache, setRecentWorkoutsCache, getRoutinesCache } from "@/lib/db";
import type { WorkoutSessionWithEntries } from "@/types/models";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkoutCard } from "@/components/home/workout-card";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function HomeTab() {
  const { user } = useAuth();
  const { supabase } = useData();
  const { syncState, setSyncState } = useWorkoutSession();
  const [workouts, setWorkouts] = useState<WorkoutSessionWithEntries[]>([]);
  const [routineMap, setRoutineMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const displayName = user?.fullName ?? user?.email ?? "";
  const initials = displayName.charAt(0).toUpperCase();

  // Load routine name map from cache
  useEffect(() => {
    if (!user) return;
    getRoutinesCache(user.id).then((cached) => {
      if (cached) {
        const map: Record<string, string> = {};
        for (const r of cached) map[r.id] = r.name;
        setRoutineMap(map);
      }
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFromSupabase = useCallback(async () => {
    if (!user || !supabase) return;
    const recent = await getRecentWorkouts(supabase, user.id, 5);
    setWorkouts(recent);
    setLoading(false);
    void setRecentWorkoutsCache(user.id, recent);
  }, [user, supabase]);

  useEffect(() => {
    if (!user) return;

    // Helper to fetch data and update UI/Cache
    const refreshData = async () => {
      await fetchFromSupabase();
      if (syncState === 'pending_sync') {
        setSyncState('synced');
      }
    };

    const loadData = async () => {
      // 1. If we know there's new data pending on Server, fetch it immediately
      if (syncState === 'pending_sync') {
        await refreshData();
        return;
      }

      // 2. Otherwise, check our local cache first for instant loading
      const cached = await getRecentWorkoutsCache(user.id);
      if (cached) {
        setWorkouts(cached);
        setLoading(false);
      } else {
        // 3. First time app is loaded ever (no cache), fetch from Server
        await refreshData();
      }
    };

    void loadData();
  }, [user?.id, syncState, setSyncState, fetchFromSupabase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="safe-top px-4">
      {/* Header with user info */}
      <div className="flex items-center gap-3 pt-4 pb-6">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="size-12 rounded-full shrink-0"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[18px] font-bold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[14px] text-[var(--label-secondary)]">{getGreeting()}</p>
          <h1 className="truncate text-[22px] font-bold tracking-tight leading-tight">
            {displayName}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="size-12" />}
          message="Aún no tienes entrenamientos. ¡Empieza uno desde la pestaña Entreno!"
        />
      ) : (
        <>
          <p className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-widest text-[var(--label-secondary)]">
            Recientes
          </p>
          <div className="flex flex-col gap-3 pb-4">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                routineMap={routineMap}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
