"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  getActiveSession,
  getEntriesWithDetailsForSession,
  getRoutineWithExercises,
  getPrevSetsForExercises,
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

// ─── Session Context ──────────────────────────────────────────────────────────

interface WorkoutSessionContextValue {
  activeSession: WorkoutSession | null;
  loading: boolean;
  isSaving: boolean;
  lastFinishedAt: string | null;
  startWorkout: (routineId?: string) => Promise<void>;
  finishWorkout: () => Promise<void>;
  discardWorkout: () => Promise<void>;
  clearLastFinishedAt: () => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue>({
  activeSession: null,
  loading: true,
  isSaving: false,
  lastFinishedAt: null,
  startWorkout: async () => {},
  finishWorkout: async () => {},
  discardWorkout: async () => {},
  clearLastFinishedAt: () => {},
});

export function useWorkoutSession() {
  return useContext(WorkoutSessionContext);
}

// ─── Entries Context ──────────────────────────────────────────────────────────

interface WorkoutEntriesContextValue {
  entries: WorkoutEntryWithDetails[];
  prevSetsMap: Record<string, WorkoutSet[]>;
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (entryId: string) => Promise<void>;
  addSet: (entryId: string) => Promise<void>;
  updateSet: (setId: string, data: Partial<WorkoutSet>) => Promise<void>;
  removeSet: (setId: string) => Promise<void>;
  toggleSet: (setId: string) => Promise<void>;
}

const WorkoutEntriesContext = createContext<WorkoutEntriesContextValue>({
  entries: [],
  prevSetsMap: {},
  addExercise: async () => {},
  removeExercise: async () => {},
  addSet: async () => {},
  updateSet: async () => {},
  removeSet: async () => {},
  toggleSet: async () => {},
});

export function useWorkoutEntries() {
  return useContext(WorkoutEntriesContext);
}

// ─── Legacy hook (for active-workout which needs both) ───────────────────────

export function useWorkout() {
  const session = useWorkoutSession();
  const entries = useWorkoutEntries();
  return { ...session, ...entries };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

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
  const [isSaving, setIsSaving] = useState(false);
  const [lastFinishedAt, setLastFinishedAt] = useState<string | null>(null);
  const [prevSetsMap, setPrevSetsMap] = useState<Record<string, WorkoutSet[]>>({});
  const fetchedPrevSetIds = useRef<Set<string>>(new Set());

  // Ref so session-level actions (finish/discard) can read entries
  // without adding it to their dependency arrays.
  const entriesRef = useRef<WorkoutEntryWithDetails[]>(entries);

  // Helper: update state + ref + localStorage atomically
  const commit = useCallback(
    (session: WorkoutSession, next: WorkoutEntryWithDetails[]) => {
      entriesRef.current = next;
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
        const dbSession = await getActiveSession(supabase, userId);
        if (dbSession && dbSession.id === persisted.session.id) {
          entriesRef.current = persisted.entries;
          setActiveSession(persisted.session);
          setEntries(persisted.entries);
          setLoading(false);
          return;
        }
        clearStorage();
      }

      // 2. Fall back to DB
      const session = await getActiveSession(supabase, userId);
      if (session) {
        const detailed = await getEntriesWithDetailsForSession(supabase, session.id);
        entriesRef.current = detailed;
        setActiveSession(session);
        setEntries(detailed);
        saveToStorage(session, detailed);
      }

      setLoading(false);
    })();
  }, [userId, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch prev sets for new exercises only ────────────────────────────────
  useEffect(() => {
    if (!supabase || !activeSession || entries.length === 0) return;
    const newIds = entries
      .map((e) => e.exercise_id)
      .filter((id) => !fetchedPrevSetIds.current.has(id));
    if (newIds.length === 0) return;
    newIds.forEach((id) => fetchedPrevSetIds.current.add(id));
    getPrevSetsForExercises(supabase, userId, newIds, activeSession.id).then(
      (result) => setPrevSetsMap((prev) => ({ ...prev, ...result })),
    );
  }, [supabase, userId, activeSession, entries]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── finishWorkout: flush only completed sets to DB (batched) ────────────
  // Uses entriesRef so this callback stays stable when entries change.
  const finishWorkout = useCallback(async () => {
    if (!activeSession || !supabase) return;
    setIsSaving(true);
    try {
      const entryRecords: WorkoutEntry[] = [];
      const allCompletedSets: WorkoutSet[] = [];
      for (const entry of entriesRef.current) {
        const completedSets = entry.sets.filter((s) => s.completed);
        if (completedSets.length === 0) continue;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { exercise, sets, ...entryRecord } = entry;
        entryRecords.push(entryRecord as WorkoutEntry);
        allCompletedSets.push(...completedSets);
      }
      if (entryRecords.length > 0) {
        await supabase.from("workout_entries").insert(entryRecords);
      }
      if (allCompletedSets.length > 0) {
        await supabase.from("workout_sets").insert(allCompletedSets);
      }
      await finishWorkoutSession(supabase, activeSession.id);
    } finally {
      setIsSaving(false);
    }
    clearStorage();
    entriesRef.current = [];
    fetchedPrevSetIds.current = new Set();
    setLastFinishedAt(new Date().toISOString());
    setActiveSession(null);
    setEntries([]);
    setPrevSetsMap({});
  }, [activeSession, supabase]);

  // ── discardWorkout ────────────────────────────────────────────────────────
  const discardWorkout = useCallback(async () => {
    if (!activeSession || !supabase) return;
    await deleteWorkoutSession(supabase, activeSession.id);
    clearStorage();
    entriesRef.current = [];
    fetchedPrevSetIds.current = new Set();
    setActiveSession(null);
    setEntries([]);
    setPrevSetsMap({});
  }, [activeSession, supabase]);

  // ── addExercise ───────────────────────────────────────────────────────────
  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!activeSession) return;
      const entryId = crypto.randomUUID();
      const newEntry: WorkoutEntryWithDetails = {
        id: entryId,
        session_id: activeSession.id,
        exercise_id: exercise.id,
        position: entriesRef.current.length,
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
      commit(activeSession, [...entriesRef.current, newEntry]);
    },
    [activeSession, commit],
  );

  // ── removeExercise ────────────────────────────────────────────────────────
  const removeExercise = useCallback(
    async (entryId: string) => {
      if (!activeSession) return;
      commit(activeSession, entriesRef.current.filter((e) => e.id !== entryId));
    },
    [activeSession, commit],
  );

  // ── addSet ────────────────────────────────────────────────────────────────
  const addSet = useCallback(
    async (entryId: string) => {
      if (!activeSession) return;
      const next = entriesRef.current.map((entry) => {
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
    [activeSession, commit],
  );

  // ── updateSet ─────────────────────────────────────────────────────────────
  const updateSetFn = useCallback(
    async (setId: string, data: Partial<WorkoutSet>) => {
      if (!activeSession) return;
      const next = entriesRef.current.map((entry) => ({
        ...entry,
        sets: entry.sets.map((s) => (s.id === setId ? { ...s, ...data } : s)),
      }));
      commit(activeSession, next);
    },
    [activeSession, commit],
  );

  // ── removeSet ─────────────────────────────────────────────────────────────
  const removeSet = useCallback(
    async (setId: string) => {
      if (!activeSession) return;
      const next = entriesRef.current.map((entry) => ({
        ...entry,
        sets: entry.sets.filter((s) => s.id !== setId),
      }));
      commit(activeSession, next);
    },
    [activeSession, commit],
  );

  // ── toggleSet ─────────────────────────────────────────────────────────────
  const toggleSet = useCallback(
    async (setId: string) => {
      if (!activeSession) return;
      const next = entriesRef.current.map((entry) => ({
        ...entry,
        sets: entry.sets.map((s) =>
          s.id === setId ? { ...s, completed: !s.completed } : s,
        ),
      }));
      commit(activeSession, next);
    },
    [activeSession, commit],
  );

  const clearLastFinishedAt = useCallback(() => setLastFinishedAt(null), []);

  const sessionValue = useMemo(
    () => ({ activeSession, loading, isSaving, lastFinishedAt, startWorkout, finishWorkout, discardWorkout, clearLastFinishedAt }),
    [activeSession, loading, isSaving, lastFinishedAt, startWorkout, finishWorkout, discardWorkout, clearLastFinishedAt],
  );

  const entriesValue = useMemo(
    () => ({
      entries,
      prevSetsMap,
      addExercise,
      removeExercise,
      addSet,
      updateSet: updateSetFn,
      removeSet,
      toggleSet,
    }),
    [entries, prevSetsMap, addExercise, removeExercise, addSet, updateSetFn, removeSet, toggleSet],
  );

  return (
    <WorkoutSessionContext.Provider value={sessionValue}>
      <WorkoutEntriesContext.Provider value={entriesValue}>
        {children}
      </WorkoutEntriesContext.Provider>
    </WorkoutSessionContext.Provider>
  );
}
