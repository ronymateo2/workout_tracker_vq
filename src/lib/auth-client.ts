"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export function useAuth() {
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

  function signInWithGoogle() {
    window.location.href = "/api/auth/google";
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    setSupabaseToken(null);
    setStatus("unauthenticated");
  }

  return { user, supabaseToken, status, signInWithGoogle, signOut, refreshSession: fetchSession };
}
