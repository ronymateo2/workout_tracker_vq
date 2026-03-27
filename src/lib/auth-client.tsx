"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUser } from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AppUser | null;
  supabaseToken: string | null;
  status: AuthStatus;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data: { user: AppUser; supabaseToken: string } = await res.json();
        setUser(data.user);
        setSupabaseToken(data.supabaseToken);
        setStatus("authenticated");
      } else {
        setUser(null);
        setSupabaseToken(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setSupabaseToken(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const signInWithGoogle = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    setSupabaseToken(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      user,
      supabaseToken,
      status,
      signInWithGoogle,
      signOut,
      refreshSession: fetchSession,
    }),
    [user, supabaseToken, status, signInWithGoogle, signOut, fetchSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
