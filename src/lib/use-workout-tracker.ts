"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  ExerciseLibraryItem,
  WorkoutEntry,
  WorkoutSession,
} from "@/lib/workout-types";
import {
  normalizeExerciseName,
  sortLibrary,
  sortSessions,
} from "@/lib/workout-types";

type TrackerStatus = "loading" | "auth" | "ready";

interface SaveEntryInput {
  date: string;
  entry: WorkoutEntry;
  linkedExercise: ExerciseLibraryItem | null;
  typedName: string;
}

interface RemoteSnapshot {
  sessions: WorkoutSession[];
  library: ExerciseLibraryItem[];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error !== null && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof e.message === "string") parts.push(e.message);
    if (typeof e.code === "string") parts.push(`code: ${e.code}`);
    if (typeof e.details === "string" && e.details) parts.push(e.details);
    if (typeof e.hint === "string" && e.hint) parts.push(`hint: ${e.hint}`);
    if (parts.length > 0) return parts.join(" · ");
  }

  return "Ocurrió un error inesperado.";
}

async function upsertProfile(activeUser: AppUser, token: string) {
  const supabase = getSupabaseBrowserClient(token);

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: activeUser.id,
    email: activeUser.email ?? null,
    full_name: activeUser.fullName ?? null,
    avatar_url: activeUser.avatarUrl ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function fetchRemoteSnapshot(
  userId: string,
  token: string,
): Promise<RemoteSnapshot> {
  const supabase = getSupabaseBrowserClient(token);

  if (!supabase) {
    return { sessions: [], library: [] };
  }

  const [sessionsResponse, entriesResponse, setsResponse, libraryResponse] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("session_date", { ascending: false }),
      supabase
        .from("workout_entries")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true }),
      supabase
        .from("workout_sets")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true }),
      supabase
        .from("exercise_library")
        .select("*")
        .eq("user_id", userId)
        .order("last_used_at", { ascending: false }),
    ]);

  if (sessionsResponse.error) throw sessionsResponse.error;
  if (entriesResponse.error) throw entriesResponse.error;
  if (setsResponse.error) throw setsResponse.error;
  if (libraryResponse.error) throw libraryResponse.error;

  const setMap = new Map<string, RemoteSnapshot["sessions"][number]["entries"][number]["sets"]>();

  for (const remoteSet of setsResponse.data ?? []) {
    const currentSets = setMap.get(remoteSet.entry_id) ?? [];
    currentSets.push({
      id: remoteSet.id,
      position: remoteSet.position,
      reps: remoteSet.reps,
      durationSeconds: remoteSet.duration_seconds,
      weightKg: Number(remoteSet.weight_kg ?? 0) || null,
      bandColor: remoteSet.band_color,
      bandResistance: remoteSet.band_resistance,
    });
    setMap.set(remoteSet.entry_id, currentSets);
  }

  const entryMap = new Map<string, WorkoutEntry[]>();

  for (const remoteEntry of entriesResponse.data ?? []) {
    const currentEntries = entryMap.get(remoteEntry.session_id) ?? [];
    currentEntries.push({
      id: remoteEntry.id,
      sessionId: remoteEntry.session_id,
      userId: remoteEntry.user_id,
      position: remoteEntry.position,
      exerciseName: remoteEntry.exercise_name,
      normalizedName: remoteEntry.normalized_name,
      canonicalExerciseId: remoteEntry.canonical_exercise_id,
      exerciseMode: remoteEntry.exercise_mode,
      loadMode: remoteEntry.load_mode,
      unilateral: remoteEntry.unilateral,
      defaultWeightKg: Number(remoteEntry.default_weight_kg ?? 0) || null,
      defaultBandColor: remoteEntry.default_band_color,
      defaultBandResistance: remoteEntry.default_band_resistance,
      notes: remoteEntry.notes ?? "",
      sets: (setMap.get(remoteEntry.id) ?? []).sort(
        (l, r) => l.position - r.position,
      ),
    });
    entryMap.set(remoteEntry.session_id, currentEntries);
  }

  return {
    sessions: sortSessions(
      (sessionsResponse.data ?? []).map((s) => ({
        id: s.id,
        userId: s.user_id,
        date: s.session_date,
        notes: s.notes ?? "",
        entries: (entryMap.get(s.id) ?? []).sort((l, r) => l.position - r.position),
        syncState: "synced" as const,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    ),
    library: sortLibrary(
      (libraryResponse.data ?? []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        canonicalName: item.canonical_name,
        normalizedName: item.normalized_name,
        aliases: item.aliases ?? [],
        lastUsedAt: item.last_used_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    ),
  };
}

async function syncSessionToRemote(session: WorkoutSession, token: string) {
  const supabase = getSupabaseBrowserClient(token);

  if (!supabase) return;

  const { error: sessionError } = await supabase.from("workout_sessions").upsert(
    {
      id: session.id,
      user_id: session.userId,
      session_date: session.date,
      notes: session.notes,
      updated_at: session.updatedAt,
    },
    { onConflict: "id" },
  );

  if (sessionError) throw sessionError;

  const { error: deleteEntriesError } = await supabase
    .from("workout_entries")
    .delete()
    .eq("user_id", session.userId)
    .eq("session_id", session.id);

  if (deleteEntriesError) throw deleteEntriesError;

  if (session.entries.length > 0) {
    const { error: entryError } = await supabase.from("workout_entries").insert(
      session.entries.map((entry) => ({
        id: entry.id,
        session_id: session.id,
        user_id: session.userId,
        position: entry.position,
        exercise_name: entry.exerciseName,
        normalized_name: entry.normalizedName,
        canonical_exercise_id: entry.canonicalExerciseId,
        exercise_mode: entry.exerciseMode,
        load_mode: entry.loadMode,
        unilateral: entry.unilateral,
        default_weight_kg: entry.defaultWeightKg,
        default_band_color: entry.defaultBandColor,
        default_band_resistance: entry.defaultBandResistance,
        notes: entry.notes,
        updated_at: session.updatedAt,
      })),
    );

    if (entryError) throw entryError;
  }

  const sets = session.entries.flatMap((entry) =>
    entry.sets.map((set) => ({
      id: set.id,
      entry_id: entry.id,
      user_id: session.userId,
      position: set.position,
      reps: set.reps,
      duration_seconds: set.durationSeconds,
      weight_kg: set.weightKg,
      band_color: set.bandColor,
      band_resistance: set.bandResistance,
      updated_at: session.updatedAt,
    })),
  );

  if (sets.length > 0) {
    const { error: setsError } = await supabase.from("workout_sets").insert(sets);

    if (setsError) {
      await supabase
        .from("workout_entries")
        .delete()
        .eq("user_id", session.userId)
        .eq("session_id", session.id);
      throw setsError;
    }
  }
}

async function syncLibraryToRemote(items: ExerciseLibraryItem[], token: string) {
  const supabase = getSupabaseBrowserClient(token);

  if (!supabase || items.length === 0) return;

  const { error } = await supabase.from("exercise_library").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: item.userId,
      canonical_name: item.canonicalName,
      normalized_name: item.normalizedName,
      aliases: item.aliases,
      last_used_at: item.lastUsedAt,
      updated_at: item.updatedAt,
    })),
    { onConflict: "user_id,normalized_name" },
  );

  if (error) throw error;
}

function touchLibrary(
  currentLibrary: ExerciseLibraryItem[],
  userId: string,
  entry: WorkoutEntry,
  linkedExercise: ExerciseLibraryItem | null,
  typedName: string,
): { library: ExerciseLibraryItem[]; touched: ExerciseLibraryItem[] } {
  const nextLibrary = [...currentLibrary];
  const now = new Date().toISOString();
  const normalizedTypedName = normalizeExerciseName(typedName);

  if (linkedExercise) {
    const itemIndex = nextLibrary.findIndex((item) => item.id === linkedExercise.id);
    const nextAliases =
      linkedExercise.aliases.includes(typedName) || !normalizedTypedName
        ? linkedExercise.aliases
        : [...linkedExercise.aliases, typedName];
    const item: ExerciseLibraryItem = {
      ...linkedExercise,
      aliases: nextAliases,
      lastUsedAt: now,
      updatedAt: now,
    };

    if (itemIndex >= 0) {
      nextLibrary[itemIndex] = item;
    } else {
      nextLibrary.push(item);
    }

    return { library: sortLibrary(nextLibrary), touched: [item] };
  }

  const existingItemIndex = nextLibrary.findIndex(
    (item) => item.normalizedName === entry.normalizedName,
  );

  if (existingItemIndex >= 0) {
    nextLibrary[existingItemIndex] = {
      ...nextLibrary[existingItemIndex],
      lastUsedAt: now,
      updatedAt: now,
    };
    return {
      library: sortLibrary(nextLibrary),
      touched: [nextLibrary[existingItemIndex]],
    };
  }

  const newItem: ExerciseLibraryItem = {
    id: crypto.randomUUID(),
    userId,
    canonicalName: entry.exerciseName,
    normalizedName: entry.normalizedName,
    aliases:
      typedName && typedName.trim() !== entry.exerciseName.trim()
        ? [typedName.trim()]
        : [],
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  nextLibrary.unshift(newItem);

  return { library: sortLibrary(nextLibrary), touched: [newItem] };
}

export function useWorkoutTracker() {
  const {
    user: authUser,
    status: authStatus,
    supabaseToken,
    signInWithGoogle,
    signOut: authSignOut,
  } = useAuth();

  const [status, setStatus] = useState<TrackerStatus>("loading");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUserData = useCallback(async (activeUser: AppUser, token: string) => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      await upsertProfile(activeUser, token);
      const snapshot = await fetchRemoteSnapshot(activeUser.id, token);
      setSessions(snapshot.sessions);
      setLibrary(snapshot.library);
    } catch (error) {
      console.error("[load] error:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    if (authStatus === "loading") {
      setStatus("loading");
      return;
    }

    if (authStatus === "unauthenticated") {
      setSessions([]);
      setLibrary([]);
      setStatus("auth");
      return;
    }

    if (authUser && supabaseToken) {
      void loadUserData(authUser, supabaseToken);
    }
  }, [authStatus, authUser, supabaseToken, loadUserData]);

  // ─── Dev bypass (development only) ──────────────────────────────
  const [devUser, setDevUser] = useState<AppUser | null>(null);

  function devSignIn() {
    if (process.env.NODE_ENV !== "development") return;
    const mockUser: AppUser = {
      id: "dev-00000000-0000-0000-0000-000000000000",
      email: "dev@rurana.local",
      fullName: "Dev User",
      avatarUrl: null,
    };
    setDevUser(mockUser);
    setSessions([]);
    setLibrary([]);
    setStatus("ready");
  }

  function devSignOut() {
    if (process.env.NODE_ENV !== "development") return;
    setDevUser(null);
    setSessions([]);
    setLibrary([]);
    setStatus("auth");
  }

  const user = devUser ?? authUser;

  async function signOut() {
    if (devUser) {
      devSignOut();
      return;
    }
    await authSignOut();
  }

  async function saveEntry({ date, entry, linkedExercise, typedName }: SaveEntryInput) {
    if (!user || !supabaseToken) return;

    setErrorMessage(null);
    setIsSyncing(true);

    const currentSession = sessions.find((s) => s.date === date) ?? null;
    const now = new Date().toISOString();
    const nextEntries = currentSession
      ? currentSession.entries.map((e) => (e.id === entry.id ? entry : e))
      : [];

    if (!currentSession || !currentSession.entries.some((e) => e.id === entry.id)) {
      nextEntries.push({ ...entry, position: nextEntries.length });
    }

    const nextSessionId = currentSession?.id ?? crypto.randomUUID();
    const nextSession: WorkoutSession = {
      id: nextSessionId,
      userId: user.id,
      date,
      notes: currentSession?.notes ?? "",
      entries: nextEntries.map((e, position) => ({
        ...e,
        sessionId: nextSessionId,
        position,
      })),
      syncState: "synced",
      createdAt: currentSession?.createdAt ?? now,
      updatedAt: now,
    };

    const nextSessions = sortSessions([
      ...sessions.filter((s) => s.id !== nextSession.id),
      nextSession,
    ]);
    const { library: nextLibrary, touched } = touchLibrary(
      library,
      user.id,
      entry,
      linkedExercise,
      typedName,
    );

    setSessions(nextSessions);
    setLibrary(nextLibrary);

    try {
      await syncSessionToRemote(nextSession, supabaseToken);
      await syncLibraryToRemote(touched, supabaseToken);
    } catch (error) {
      console.error("[saveEntry] error:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }

  async function deleteEntry(date: string, entryId: string) {
    if (!user || !supabaseToken) return;

    const currentSession = sessions.find((s) => s.date === date);
    if (!currentSession) return;

    setErrorMessage(null);
    setIsSyncing(true);

    const nextEntries = currentSession.entries
      .filter((e) => e.id !== entryId)
      .map((e, position) => ({ ...e, position }));

    try {
      if (nextEntries.length === 0) {
        setSessions(sessions.filter((s) => s.id !== currentSession.id));
        const supabase = getSupabaseBrowserClient(supabaseToken);
        if (supabase) {
          const { error } = await supabase
            .from("workout_sessions")
            .delete()
            .eq("user_id", user.id)
            .eq("id", currentSession.id);
          if (error) throw error;
        }
      } else {
        const nextSession: WorkoutSession = {
          ...currentSession,
          entries: nextEntries,
          updatedAt: new Date().toISOString(),
        };
        setSessions(
          sortSessions([
            ...sessions.filter((s) => s.id !== currentSession.id),
            nextSession,
          ]),
        );
        await syncSessionToRemote(nextSession, supabaseToken);
      }
    } catch (error) {
      console.error("[deleteEntry] error:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }

  return {
    status,
    user,
    sessions,
    library,
    isSyncing,
    errorMessage,
    signInWithGoogle,
    signOut,
    saveEntry,
    deleteEntry,
    devSignIn: process.env.NODE_ENV === "development" ? devSignIn : undefined,
    devSignOut: process.env.NODE_ENV === "development" ? devSignOut : undefined,
  };
}
