"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Exercise,
  WorkoutSession,
  WorkoutEntry,
  WorkoutSet,
  WorkoutEntryWithDetails,
} from "@/types/models";
import {
  startWorkoutSession,
  finishWorkoutSession,
  deleteWorkoutSession,
  addWorkoutEntry,
  removeWorkoutEntry,
  addWorkoutSet,
  updateWorkoutSet,
  deleteWorkoutSet,
  getActiveSession,
  getEntriesForSession,
  getSetsForEntry,
  getExerciseById,
  getRoutineWithExercises,
} from "./data";
import { useData } from "./data-context";

interface WorkoutContextValue {
  activeSession: WorkoutSession | null;
  entries: WorkoutEntryWithDetails[];
  loading: boolean;
  startWorkout: (routineId?: string) => Promise<void>;
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (entryId: string) => Promise<void>;
  addSet: (entryId: string) => Promise<void>;
  updateSet: (setId: string, data: Partial<WorkoutSet>) => Promise<void>;
  removeSet: (setId: string) => Promise<void>;
  toggleSet: (setId: string) => Promise<void>;
  finishWorkout: () => Promise<void>;
  discardWorkout: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextValue>({
  activeSession: null,
  entries: [],
  loading: true,
  startWorkout: async () => {},
  addExercise: async () => {},
  removeExercise: async () => {},
  addSet: async () => {},
  updateSet: async () => {},
  removeSet: async () => {},
  toggleSet: async () => {},
  finishWorkout: async () => {},
  discardWorkout: async () => {},
});

export function useWorkout() {
  return useContext(WorkoutContext);
}

export function WorkoutProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const { supabase } = useData();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [entries, setEntries] = useState<WorkoutEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEntries = useCallback(
    async (sessionId: string) => {
      if (!supabase) return;
      const rawEntries = await getEntriesForSession(supabase, sessionId);
      const detailed: WorkoutEntryWithDetails[] = [];
      for (const entry of rawEntries) {
        const exercise = await getExerciseById(supabase, entry.exercise_id);
        if (!exercise) continue;
        const sets = await getSetsForEntry(supabase, entry.id);
        detailed.push({ ...entry, exercise, sets });
      }
      setEntries(detailed);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const session = await getActiveSession(supabase, userId);
      if (session) {
        setActiveSession(session);
        await refreshEntries(session.id);
      }
      setLoading(false);
    })();
  }, [userId, supabase, refreshEntries]);

  const startWorkout = useCallback(
    async (routineId?: string) => {
      if (!supabase) return;
      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        user_id: userId,
        routine_id: routineId ?? null,
        started_at: new Date().toISOString(),
        finished_at: null,
        notes: null,
      };
      await startWorkoutSession(supabase, session);
      setActiveSession(session);

      if (routineId) {
        const routine = await getRoutineWithExercises(supabase, routineId);
        if (routine) {
          for (const re of routine.exercises) {
            const entry: WorkoutEntry = {
              id: crypto.randomUUID(),
              session_id: session.id,
              exercise_id: re.exercise_id,
              position: re.position,
            };
            await addWorkoutEntry(supabase, entry);

            for (let i = 0; i < re.default_sets; i++) {
              const set: WorkoutSet = {
                id: crypto.randomUUID(),
                entry_id: entry.id,
                position: i,
                weight_kg: null,
                reps: null,
                duration_seconds: null,
                distance_m: null,
                band_color: null,
                band_resistance: null,
                completed: false,
              };
              await addWorkoutSet(supabase, set);
            }
          }
          await refreshEntries(session.id);
        }
      } else {
        setEntries([]);
      }
    },
    [userId, supabase, refreshEntries],
  );

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!activeSession || !supabase) return;
      const entry: WorkoutEntry = {
        id: crypto.randomUUID(),
        session_id: activeSession.id,
        exercise_id: exercise.id,
        position: entries.length,
      };
      await addWorkoutEntry(supabase, entry);

      const set: WorkoutSet = {
        id: crypto.randomUUID(),
        entry_id: entry.id,
        position: 0,
        weight_kg: null,
        reps: null,
        duration_seconds: null,
        distance_m: null,
        band_color: null,
        band_resistance: null,
        completed: false,
      };
      await addWorkoutSet(supabase, set);
      await refreshEntries(activeSession.id);
    },
    [activeSession, entries.length, supabase, refreshEntries],
  );

  const removeExercise = useCallback(
    async (entryId: string) => {
      if (!activeSession || !supabase) return;
      await removeWorkoutEntry(supabase, entryId);
      await refreshEntries(activeSession.id);
    },
    [activeSession, supabase, refreshEntries],
  );

  const addSet = useCallback(
    async (entryId: string) => {
      if (!activeSession || !supabase) return;
      const currentSets = await getSetsForEntry(supabase, entryId);
      const set: WorkoutSet = {
        id: crypto.randomUUID(),
        entry_id: entryId,
        position: currentSets.length,
        weight_kg: null,
        reps: null,
        duration_seconds: null,
        distance_m: null,
        band_color: null,
        band_resistance: null,
        completed: false,
      };
      await addWorkoutSet(supabase, set);
      await refreshEntries(activeSession.id);
    },
    [activeSession, supabase, refreshEntries],
  );

  const updateSetFn = useCallback(
    async (setId: string, data: Partial<WorkoutSet>) => {
      if (!activeSession || !supabase) return;
      await updateWorkoutSet(supabase, setId, data);
      await refreshEntries(activeSession.id);
    },
    [activeSession, supabase, refreshEntries],
  );

  const removeSet = useCallback(
    async (setId: string) => {
      if (!activeSession || !supabase) return;
      await deleteWorkoutSet(supabase, setId);
      await refreshEntries(activeSession.id);
    },
    [activeSession, supabase, refreshEntries],
  );

  const toggleSet = useCallback(
    async (setId: string) => {
      if (!activeSession || !supabase) return;
      const entry = entries.find((e) => e.sets.some((s) => s.id === setId));
      const set = entry?.sets.find((s) => s.id === setId);
      if (!set) return;
      await updateWorkoutSet(supabase, setId, { completed: !set.completed });
      await refreshEntries(activeSession.id);
    },
    [activeSession, entries, supabase, refreshEntries],
  );

  const finishWorkout = useCallback(async () => {
    if (!activeSession || !supabase) return;
    await finishWorkoutSession(supabase, activeSession.id);
    setActiveSession(null);
    setEntries([]);
  }, [activeSession, supabase]);

  const discardWorkout = useCallback(async () => {
    if (!activeSession || !supabase) return;
    await deleteWorkoutSession(supabase, activeSession.id);
    setActiveSession(null);
    setEntries([]);
  }, [activeSession, supabase]);

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        entries,
        loading,
        startWorkout,
        addExercise,
        removeExercise,
        addSet,
        updateSet: updateSetFn,
        removeSet,
        toggleSet,
        finishWorkout,
        discardWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}
