"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  addWorkoutSet,
  getActiveSession,
  getEntriesForSession,
  getSetsForEntry,
  getExerciseById,
  getRoutineWithExercises,
  getPreviousSetsForExercise,
} from "./data";
import { useData } from "./data-context";

// ─── localStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = "rurana-active-workout";

interface PersistedWorkout {
  session: WorkoutSession;
  entries: WorkoutEntryWithDetails[];
}

function loadFromStorage(): PersistedWorkout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedWorkout) : null;
  } catch {
    return null;
  }
}

function saveToStorage(session: WorkoutSession, entries: WorkoutEntryWithDetails[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, entries }));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface WorkoutContextValue {
  activeSession: WorkoutSession | null;
  entries: WorkoutEntryWithDetails[];
  previousSets: Record<string, WorkoutSet[]>;
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
  previousSets: {},
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

// ─── Provider ────────────────────────────────────────────────────────────────

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
  const [previousSets, setPreviousSets] = useState<Record<string, WorkoutSet[]>>({});
  const [loading, setLoading] = useState(true);
  const prevSetsCache = useRef<Record<string, WorkoutSet[]>>({});

  // Helper: update state + localStorage atomically
  const commit = useCallback(
    (session: WorkoutSession, next: WorkoutEntryWithDetails[]) => {
      setEntries(next);
      saveToStorage(session, next);
    },
    [],
  );

  // ── Startup: restore from localStorage or DB ─────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      // 1. Check localStorage
      const persisted = loadFromStorage();
      if (persisted) {
        // Verify the session still exists in DB (not discarded from another tab)
        const dbSession = await getActiveSession(supabase, userId);
        if (dbSession && dbSession.id === persisted.session.id) {
          setActiveSession(persisted.session);
          setEntries(persisted.entries);
          setLoading(false);
          return;
        }
        clearStorage();
      }

      // 2. Fall back to DB (backward-compat with old data written directly)
      const session = await getActiveSession(supabase, userId);
      if (session) {
        const rawEntries = await getEntriesForSession(supabase, session.id);
        const detailed: WorkoutEntryWithDetails[] = [];
        for (const entry of rawEntries) {
          const exercise = await getExerciseById(supabase, entry.exercise_id);
          if (!exercise) continue;
          const sets = await getSetsForEntry(supabase, entry.id);
          detailed.push({ ...entry, exercise, sets });
        }
        setActiveSession(session);
        setEntries(detailed);
        saveToStorage(session, detailed);
      }

      setLoading(false);
    })();
  }, [userId, supabase]);

  // ── Load previous sets whenever entries change ────────────────────────────
  useEffect(() => {
    if (!supabase || entries.length === 0) return;
    const exerciseIds = [...new Set(entries.map((e) => e.exercise_id))];
    const uncached = exerciseIds.filter((id) => !(id in prevSetsCache.current));
    if (uncached.length === 0) return;
    void (async () => {
      const fetched: Record<string, WorkoutSet[]> = {};
      await Promise.all(
        uncached.map(async (exerciseId) => {
          const sets = await getPreviousSetsForExercise(supabase!, userId, exerciseId);
          fetched[exerciseId] = sets;
        }),
      );
      prevSetsCache.current = { ...prevSetsCache.current, ...fetched };
      setPreviousSets({ ...prevSetsCache.current });
    })();
  }, [entries, supabase, userId]);

  // ── startWorkout ──────────────────────────────────────────────────────────
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
      // Only the session record goes to DB immediately (so we can detect it on refresh)
      await startWorkoutSession(supabase, session);
      setActiveSession(session);

      if (routineId) {
        const routine = await getRoutineWithExercises(supabase, routineId);
        const detailed: WorkoutEntryWithDetails[] = [];
        if (routine) {
          for (const re of routine.exercises) {
            const entryId = crypto.randomUUID();
            const isBands = re.exercise.exercise_type === "bands";
            const sets: WorkoutSet[] = Array.from({ length: re.default_sets }, (_, i) => ({
              id: crypto.randomUUID(),
              entry_id: entryId,
              position: i,
              weight_kg: null,
              reps: null,
              duration_seconds: null,
              distance_m: null,
              band_color: isBands ? "yellow" : null,
              band_resistance: null,
              completed: false,
            }));
            detailed.push({
              id: entryId,
              session_id: session.id,
              exercise_id: re.exercise_id,
              position: re.position,
              exercise: re.exercise,
              sets,
            });
          }
        }
        commit(session, detailed);
      } else {
        commit(session, []);
      }
    },
    [userId, supabase, commit],
  );

  // ── addExercise ───────────────────────────────────────────────────────────
  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!activeSession) return;
      const entryId = crypto.randomUUID();
      const newEntry: WorkoutEntryWithDetails = {
        id: entryId,
        session_id: activeSession.id,
        exercise_id: exercise.id,
        position: entries.length,
        exercise,
        sets: [
          {
            id: crypto.randomUUID(),
            entry_id: entryId,
            position: 0,
            weight_kg: null,
            reps: null,
            duration_seconds: null,
            distance_m: null,
            band_color: exercise.exercise_type === "bands" ? "yellow" : null,
            band_resistance: null,
            completed: false,
          },
        ],
      };
      commit(activeSession, [...entries, newEntry]);
    },
    [activeSession, entries, commit],
  );

  // ── removeExercise ────────────────────────────────────────────────────────
  const removeExercise = useCallback(
    async (entryId: string) => {
      if (!activeSession) return;
      commit(activeSession, entries.filter((e) => e.id !== entryId));
    },
    [activeSession, entries, commit],
  );

  // ── addSet ────────────────────────────────────────────────────────────────
  const addSet = useCallback(
    async (entryId: string) => {
      if (!activeSession) return;
      const next = entries.map((entry) => {
        if (entry.id !== entryId) return entry;
        const isBands = entry.exercise.exercise_type === "bands";
        const lastSet = entry.sets[entry.sets.length - 1];
        const newSet: WorkoutSet = {
          id: crypto.randomUUID(),
          entry_id: entryId,
          position: entry.sets.length,
          weight_kg: null,
          reps: null,
          duration_seconds: null,
          distance_m: null,
          band_color: isBands ? (lastSet?.band_color ?? "yellow") : null,
          band_resistance: null,
          completed: false,
        };
        return { ...entry, sets: [...entry.sets, newSet] };
      });
      commit(activeSession, next);
    },
    [activeSession, entries, commit],
  );

  // ── updateSet ─────────────────────────────────────────────────────────────
  const updateSetFn = useCallback(
    async (setId: string, data: Partial<WorkoutSet>) => {
      if (!activeSession) return;
      const next = entries.map((entry) => ({
        ...entry,
        sets: entry.sets.map((s) => (s.id === setId ? { ...s, ...data } : s)),
      }));
      commit(activeSession, next);
    },
    [activeSession, entries, commit],
  );

  // ── removeSet ─────────────────────────────────────────────────────────────
  const removeSet = useCallback(
    async (setId: string) => {
      if (!activeSession) return;
      const next = entries.map((entry) => ({
        ...entry,
        sets: entry.sets.filter((s) => s.id !== setId),
      }));
      commit(activeSession, next);
    },
    [activeSession, entries, commit],
  );

  // ── toggleSet ─────────────────────────────────────────────────────────────
  const toggleSet = useCallback(
    async (setId: string) => {
      if (!activeSession) return;
      const next = entries.map((entry) => ({
        ...entry,
        sets: entry.sets.map((s) =>
          s.id === setId ? { ...s, completed: !s.completed } : s,
        ),
      }));
      commit(activeSession, next);
    },
    [activeSession, entries, commit],
  );

  // ── finishWorkout: flush everything to DB ─────────────────────────────────
  const finishWorkout = useCallback(async () => {
    if (!activeSession || !supabase) return;
    for (const entry of entries) {
      const { exercise: _exercise, sets, ...entryRecord } = entry;
      await addWorkoutEntry(supabase, entryRecord as WorkoutEntry);
      for (const set of sets) {
        await addWorkoutSet(supabase, set);
      }
    }
    await finishWorkoutSession(supabase, activeSession.id);
    clearStorage();
    setActiveSession(null);
    setEntries([]);
  }, [activeSession, entries, supabase]);

  // ── discardWorkout ────────────────────────────────────────────────────────
  const discardWorkout = useCallback(async () => {
    if (!activeSession || !supabase) return;
    // Session is in DB but entries/sets are not yet, so just delete the session
    await deleteWorkoutSession(supabase, activeSession.id);
    clearStorage();
    setActiveSession(null);
    setEntries([]);
  }, [activeSession, supabase]);

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        entries,
        previousSets,
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
