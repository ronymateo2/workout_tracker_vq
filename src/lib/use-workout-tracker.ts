"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth-client";
import {
  deleteQueueItem,
  deleteSessionFromLocal,
  getLocalLibrary,
  getLocalSessions,
  getPendingQueueItems,
  putLibraryItems,
  putSessions,
  saveSessionToLocal,
} from "@/lib/local-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  ExerciseLibraryItem,
  SyncQueueItem,
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

  if (error !== null && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
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
    return {
      sessions: [],
      library: [],
    };
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

  if (sessionsResponse.error) {
    throw sessionsResponse.error;
  }

  if (entriesResponse.error) {
    throw entriesResponse.error;
  }

  if (setsResponse.error) {
    throw setsResponse.error;
  }

  if (libraryResponse.error) {
    throw libraryResponse.error;
  }

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
        (left, right) => left.position - right.position,
      ),
    });
    entryMap.set(remoteEntry.session_id, currentEntries);
  }

  return {
    sessions: sortSessions(
      (sessionsResponse.data ?? []).map((remoteSession) => ({
        id: remoteSession.id,
        userId: remoteSession.user_id,
        date: remoteSession.session_date,
        notes: remoteSession.notes ?? "",
        entries: (entryMap.get(remoteSession.id) ?? []).sort(
          (left, right) => left.position - right.position,
        ),
        syncState: "synced",
        createdAt: remoteSession.created_at,
        updatedAt: remoteSession.updated_at,
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

async function syncSessionSnapshot(session: WorkoutSession, token: string) {
  const supabase = getSupabaseBrowserClient(token);

  if (!supabase) {
    return;
  }

  const { error: sessionError } = await supabase.from("workout_sessions").upsert(
    {
      id: session.id,
      user_id: session.userId,
      session_date: session.date,
      notes: session.notes,
      sync_state: "synced",
      updated_at: session.updatedAt,
    },
    {
      onConflict: "id",
    },
  );

  if (sessionError) {
    throw sessionError;
  }

  const { error: deleteEntriesError } = await supabase
    .from("workout_entries")
    .delete()
    .eq("user_id", session.userId)
    .eq("session_id", session.id);

  if (deleteEntriesError) {
    throw deleteEntriesError;
  }

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

    if (entryError) {
      throw entryError;
    }
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
      // Rollback entries to avoid leaving Supabase with entries but no sets
      await supabase
        .from("workout_entries")
        .delete()
        .eq("user_id", session.userId)
        .eq("session_id", session.id);
      throw setsError;
    }
  }
}

async function syncLibrarySnapshot(items: ExerciseLibraryItem[], token: string) {
  const supabase = getSupabaseBrowserClient(token);

  if (!supabase || items.length === 0) {
    return;
  }

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
    {
      onConflict: "user_id,normalized_name",
    },
  );

  if (error) {
    throw error;
  }
}

function mergeRemoteSessions(
  localSessions: WorkoutSession[],
  remoteSessions: WorkoutSession[],
  queueItems: SyncQueueItem[],
) {
  const pendingMap = new Map(
    localSessions
      .filter((session) => session.syncState !== "synced")
      .map((session) => [session.id, session]),
  );
  const deletedSessionIds = new Set(
    queueItems
      .filter((item) => item.kind === "delete-session")
      .map((item) => item.sessionId),
  );

  const merged: WorkoutSession[] = [];

  for (const session of remoteSessions) {
    if (deletedSessionIds.has(session.id)) {
      continue;
    }

    merged.push(pendingMap.get(session.id) ?? session);
  }

  for (const session of pendingMap.values()) {
    if (!merged.some((candidate) => candidate.id === session.id)) {
      merged.push(session);
    }
  }

  return sortSessions(merged);
}

function mergeRemoteLibrary(
  localLibrary: ExerciseLibraryItem[],
  remoteLibrary: ExerciseLibraryItem[],
) {
  const merged = new Map<string, ExerciseLibraryItem>();

  for (const item of [...remoteLibrary, ...localLibrary]) {
    const current = merged.get(item.normalizedName);

    if (!current || current.updatedAt < item.updatedAt) {
      merged.set(item.normalizedName, item);
    }
  }

  return sortLibrary([...merged.values()]);
}

function touchLibrary(
  currentLibrary: ExerciseLibraryItem[],
  userId: string,
  entry: WorkoutEntry,
  linkedExercise: ExerciseLibraryItem | null,
  typedName: string,
) {
  const nextLibrary = [...currentLibrary];
  const now = new Date().toISOString();
  const normalizedTypedName = normalizeExerciseName(typedName);

  if (linkedExercise) {
    const itemIndex = nextLibrary.findIndex((item) => item.id === linkedExercise.id);
    const nextAliases = linkedExercise.aliases.includes(typedName) || !normalizedTypedName
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

    return sortLibrary(nextLibrary);
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
    return sortLibrary(nextLibrary);
  }

  nextLibrary.unshift({
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
  });

  return sortLibrary(nextLibrary);
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
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hydrateFromRemote = useCallback(async (activeUser: AppUser, token: string) => {
    const [localSessions, localLibrary, queueItems, remoteSnapshot] =
      await Promise.all([
        getLocalSessions(activeUser.id),
        getLocalLibrary(activeUser.id),
        getPendingQueueItems(activeUser.id),
        fetchRemoteSnapshot(activeUser.id, token),
      ]);

    const mergedSessions = mergeRemoteSessions(
      localSessions,
      remoteSnapshot.sessions,
      queueItems,
    );
    const mergedLibrary = mergeRemoteLibrary(localLibrary, remoteSnapshot.library);

    setSessions(mergedSessions);
    setLibrary(mergedLibrary);
    await Promise.all([putSessions(mergedSessions), putLibraryItems(mergedLibrary)]);
  }, []);

  const syncPendingChanges = useCallback(async (activeUser: AppUser, token: string) => {
    if (!navigator.onLine || !token) {
      return;
    }

    const supabase = getSupabaseBrowserClient(token);

    if (!supabase) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);

    try {
      await upsertProfile(activeUser, token);

      const queueItems = await getPendingQueueItems(activeUser.id);

      for (const item of queueItems) {
        if (item.kind === "delete-session") {
          const { error } = await supabase
            .from("workout_sessions")
            .delete()
            .eq("user_id", activeUser.id)
            .eq("id", item.sessionId);

          if (error) {
            throw error;
          }

          await deleteSessionFromLocal(item.sessionId, activeUser.id, false);
          continue;
        }

        const localSessions = await getLocalSessions(activeUser.id);
        const session = localSessions.find(
          (candidate) => candidate.id === item.sessionId,
        );

        if (!session) {
          await deleteQueueItem(item.id);
          continue;
        }

        await syncSessionSnapshot(session, token);
        await saveSessionToLocal(
          {
            ...session,
            syncState: "synced",
          },
          false,
        );
        await deleteQueueItem(item.id);
      }

      const localLibrary = await getLocalLibrary(activeUser.id);
      await syncLibrarySnapshot(localLibrary, token);
      await hydrateFromRemote(activeUser, token);
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error("[sync] error:", error);
      setErrorMessage(getErrorMessage(error));
      const localSessions = await getLocalSessions(activeUser.id);
      setSessions(sortSessions(localSessions));
    } finally {
      setIsSyncing(false);
    }
  }, [hydrateFromRemote]);

  const loadUserData = useCallback(async (activeUser: AppUser, token: string) => {
    setStatus("loading");

    const [localSessions, localLibrary] = await Promise.all([
      getLocalSessions(activeUser.id),
      getLocalLibrary(activeUser.id),
    ]);

    setSessions(sortSessions(localSessions));
    setLibrary(sortLibrary(localLibrary));
    setStatus("ready");

    if (navigator.onLine) {
      await syncPendingChanges(activeUser, token);
    }
  }, [syncPendingChanges]);

  // React to auth state changes
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

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);

      if (authUser && supabaseToken) {
        void syncPendingChanges(authUser, supabaseToken);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingChanges, authUser, supabaseToken]);

  // ─── Dev bypass (development only) ──────────────────────────────
  const [devUser, setDevUser] = useState<AppUser | null>(null);

  async function devSignIn() {
    if (process.env.NODE_ENV !== "development") return;
    const mockUser: AppUser = {
      id: "dev-00000000-0000-0000-0000-000000000000",
      email: "dev@rurana.local",
      fullName: "Dev User",
      avatarUrl: null,
    };
    setDevUser(mockUser);
    const [localSessions, localLibrary] = await Promise.all([
      getLocalSessions(mockUser.id),
      getLocalLibrary(mockUser.id),
    ]);
    setSessions(sortSessions(localSessions));
    setLibrary(sortLibrary(localLibrary));
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

  async function saveEntry({
    date,
    entry,
    linkedExercise,
    typedName,
  }: SaveEntryInput) {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    const currentSession =
      sessions.find((session) => session.date === date) ?? null;
    const now = new Date().toISOString();
    const nextEntries = currentSession
      ? currentSession.entries.map((existingEntry) =>
          existingEntry.id === entry.id ? entry : existingEntry,
        )
      : [];

    if (!currentSession || !currentSession.entries.some((item) => item.id === entry.id)) {
      nextEntries.push({
        ...entry,
        position: nextEntries.length,
      });
    }

    const nextSessionId = currentSession?.id ?? crypto.randomUUID();
    const nextSession: WorkoutSession = {
      id: nextSessionId,
      userId: user.id,
      date,
      notes: currentSession?.notes ?? "",
      entries: nextEntries.map((existingEntry, position) => ({
        ...existingEntry,
        sessionId: nextSessionId,
        position,
      })),
      syncState: "pending",
      createdAt: currentSession?.createdAt ?? now,
      updatedAt: now,
    };

    const nextSessions = sortSessions([
      ...sessions.filter((session) => session.id !== nextSession.id),
      nextSession,
    ]);
    const nextLibrary = touchLibrary(library, user.id, entry, linkedExercise, typedName);

    setSessions(nextSessions);
    setLibrary(nextLibrary);
    await Promise.all([
      saveSessionToLocal(nextSession),
      putLibraryItems(nextLibrary),
    ]);

    if (navigator.onLine && supabaseToken) {
      await syncPendingChanges(user, supabaseToken);
    }
  }

  async function deleteEntry(date: string, entryId: string) {
    if (!user) {
      return;
    }

    const currentSession = sessions.find((session) => session.date === date);

    if (!currentSession) {
      return;
    }

    const nextEntries = currentSession.entries
      .filter((entry) => entry.id !== entryId)
      .map((entry, position) => ({
        ...entry,
        position,
      }));

    if (nextEntries.length === 0) {
      const nextSessions = sessions.filter((session) => session.id !== currentSession.id);
      setSessions(nextSessions);
      await deleteSessionFromLocal(currentSession.id, user.id);

      if (navigator.onLine && supabaseToken) {
        await syncPendingChanges(user, supabaseToken);
      }

      return;
    }

    const nextSession: WorkoutSession = {
      ...currentSession,
      entries: nextEntries,
      syncState: "pending",
      updatedAt: new Date().toISOString(),
    };
    const nextSessions = sortSessions([
      ...sessions.filter((session) => session.id !== currentSession.id),
      nextSession,
    ]);

    setSessions(nextSessions);
    await saveSessionToLocal(nextSession);

    if (navigator.onLine && supabaseToken) {
      await syncPendingChanges(user, supabaseToken);
    }
  }

  async function syncNow() {
    if (!user || !supabaseToken) {
      return;
    }

    await syncPendingChanges(user, supabaseToken);
  }

  const pendingCount = sessions.filter(
    (session) => session.syncState !== "synced",
  ).length;

  return {
    status,
    user,
    sessions,
    library,
    isOnline,
    isSyncing,
    lastSyncAt,
    errorMessage,
    pendingCount,
    signInWithGoogle,
    signOut,
    saveEntry,
    deleteEntry,
    syncNow,
    devSignIn: process.env.NODE_ENV === "development" ? devSignIn : undefined,
    devSignOut: process.env.NODE_ENV === "development" ? devSignOut : undefined,
  };
}
