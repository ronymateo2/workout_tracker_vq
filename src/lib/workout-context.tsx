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
  const { triggerSync } = useData();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [entries, setEntries] = useState<WorkoutEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh entries from IndexedDB
  const refreshEntries = useCallback(async (sessionId: string) => {
    const rawEntries = await getEntriesForSession(sessionId);
    const detailed: WorkoutEntryWithDetails[] = [];
    for (const entry of rawEntries) {
      const exercise = await getExerciseById(entry.exercise_id);
      if (!exercise) continue;
      const sets = await getSetsForEntry(entry.id);
      detailed.push({ ...entry, exercise, sets });
    }
    setEntries(detailed);
  }, []);

  // Load active session on mount
  useEffect(() => {
    (async () => {
      const session = await getActiveSession(userId);
      if (session) {
        setActiveSession(session);
        await refreshEntries(session.id);
      }
      setLoading(false);
    })();
  }, [userId, refreshEntries]);

  const startWorkout = useCallback(
    async (routineId?: string) => {
      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        user_id: userId,
        routine_id: routineId ?? null,
        started_at: new Date().toISOString(),
        finished_at: null,
        notes: null,
      };
      await startWorkoutSession(session);
      setActiveSession(session);

      // If from routine, pre-populate entries with default sets
      if (routineId) {
        const routine = await getRoutineWithExercises(routineId);
        if (routine) {
          for (const re of routine.exercises) {
            const entry: WorkoutEntry = {
              id: crypto.randomUUID(),
              session_id: session.id,
              exercise_id: re.exercise_id,
              position: re.position,
            };
            await addWorkoutEntry(entry);

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
              await addWorkoutSet(set);
            }
          }
          await refreshEntries(session.id);
        }
      } else {
        setEntries([]);
      }
    },
    [userId, refreshEntries],
  );

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!activeSession) return;
      const entry: WorkoutEntry = {
        id: crypto.randomUUID(),
        session_id: activeSession.id,
        exercise_id: exercise.id,
        position: entries.length,
      };
      await addWorkoutEntry(entry);

      // Add one empty set by default
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
      await addWorkoutSet(set);
      await refreshEntries(activeSession.id);
    },
    [activeSession, entries.length, refreshEntries],
  );

  const removeExercise = useCallback(
    async (entryId: string) => {
      if (!activeSession) return;
      await removeWorkoutEntry(entryId);
      await refreshEntries(activeSession.id);
    },
    [activeSession, refreshEntries],
  );

  const addSet = useCallback(
    async (entryId: string) => {
      if (!activeSession) return;
      const currentSets = await getSetsForEntry(entryId);
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
      await addWorkoutSet(set);
      await refreshEntries(activeSession.id);
    },
    [activeSession, refreshEntries],
  );

  const updateSetFn = useCallback(
    async (setId: string, data: Partial<WorkoutSet>) => {
      if (!activeSession) return;
      await updateWorkoutSet(setId, data);
      await refreshEntries(activeSession.id);
    },
    [activeSession, refreshEntries],
  );

  const removeSet = useCallback(
    async (setId: string) => {
      if (!activeSession) return;
      await deleteWorkoutSet(setId);
      await refreshEntries(activeSession.id);
    },
    [activeSession, refreshEntries],
  );

  const toggleSet = useCallback(
    async (setId: string) => {
      if (!activeSession) return;
      const entry = entries.find((e) => e.sets.some((s) => s.id === setId));
      const set = entry?.sets.find((s) => s.id === setId);
      if (!set) return;
      await updateWorkoutSet(setId, { completed: !set.completed });
      await refreshEntries(activeSession.id);
    },
    [activeSession, entries, refreshEntries],
  );

  const finishWorkout = useCallback(async () => {
    if (!activeSession) return;
    await finishWorkoutSession(activeSession.id);
    setActiveSession(null);
    setEntries([]);
    triggerSync();
  }, [activeSession, triggerSync]);

  const discardWorkout = useCallback(async () => {
    if (!activeSession) return;
    await deleteWorkoutSession(activeSession.id);
    setActiveSession(null);
    setEntries([]);
  }, [activeSession]);

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
