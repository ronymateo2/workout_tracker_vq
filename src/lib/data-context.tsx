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
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";
import { syncAll } from "./sync";

interface DataContextValue {
  supabase: SupabaseClient | null;
  syncing: boolean;
  lastSyncError: string | null;
  triggerSync: () => void;
}

const DataContext = createContext<DataContextValue>({
  supabase: null,
  syncing: false,
  lastSyncError: null,
  triggerSync: () => {},
});

export function useData() {
  return useContext(DataContext);
}

interface DataProviderProps {
  supabaseToken: string;
  userId: string;
  children: ReactNode;
}

export function DataProvider({ supabaseToken, userId, children }: DataProviderProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  // Create Supabase client once
  if (!supabaseRef.current) {
    supabaseRef.current = getSupabaseBrowserClient(supabaseToken);
  }

  const triggerSync = useCallback(async () => {
    if (!supabaseRef.current || syncing) return;
    setSyncing(true);
    setLastSyncError(null);
    try {
      await syncAll(supabaseRef.current, userId);
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [userId, syncing]);

  // Initial sync on mount
  useEffect(() => {
    triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DataContext.Provider
      value={{
        supabase: supabaseRef.current,
        syncing,
        lastSyncError,
        triggerSync,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
