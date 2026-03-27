"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

interface DataContextValue {
  supabase: SupabaseClient | null;
}

const DataContext = createContext<DataContextValue>({
  supabase: null,
});

export function useData() {
  return useContext(DataContext);
}

interface DataProviderProps {
  supabaseToken: string;
  userId: string;
  children: ReactNode;
}

export function DataProvider({ supabaseToken, children }: DataProviderProps) {
  const supabaseRef = useRef<SupabaseClient | null>(null);

  if (!supabaseRef.current) {
    supabaseRef.current = getSupabaseBrowserClient(supabaseToken);
  }

  const value = useMemo(() => ({ supabase: supabaseRef.current }), []);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
