"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dumbbell, LoaderCircle, X } from "lucide-react";

import { AuthProvider, useAuth } from "@/lib/auth-client";
import { DataProvider } from "@/lib/data-context";
import { WorkoutProvider, useWorkoutSession } from "@/lib/workout-context";
import { ThemeProvider } from "@/lib/theme-context";
import { clearAllCaches } from "@/lib/db";
import { TabBar, type TabId } from "./tab-bar";
import { HomeTab } from "./tabs/home-tab";
import { WorkoutTab } from "./tabs/workout-tab";
import { ProfileTab } from "./tabs/profile-tab";
import { ActiveWorkout } from "./workout/active-workout";
import { WorkoutTimer } from "./workout/workout-timer";
import { AlertDialog } from "./ui/alert-dialog";

function useServiceWorker() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registrationRef.current = reg;
      })
      .catch(console.error);

    // Reload when a new SW takes control (skipWaiting already called in SW)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // iOS PWA doesn't check for SW updates automatically — force check on focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && registrationRef.current) {
        registrationRef.current.update().catch(console.error);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}

export function App() {
  useServiceWorker();
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppInner() {
  const { user, supabaseToken, status, signInWithGoogle, signOut } = useAuth();

  /* ─── Loading ─────────────────────────────────────────────────────── */
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-white">
            <Dumbbell className="size-6" />
          </div>
          <LoaderCircle className="size-5 animate-spin text-[var(--muted)]" />
        </div>
      </div>
    );
  }

  /* ─── Login ───────────────────────────────────────────────────────── */
  if (!user || !supabaseToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-[20px] bg-[var(--accent)] shadow-[0_8px_24px_rgba(10,132,255,0.35)] text-white">
              <Dumbbell className="size-8" />
            </div>
            <div className="text-center">
              <h1 className="text-[28px] font-bold tracking-tight">Rurana</h1>
              <p className="mt-1 text-[15px] text-[var(--muted)]">
                Tu entrenamiento, limpio y móvil.
              </p>
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--background-secondary)] p-5 shadow-[var(--shadow)]">
            <p className="mb-4 text-[14px] leading-relaxed text-[var(--muted)]">
              Registra pesos, bandas, isométricos y sesiones del día con una
              interfaz compacta y móvil.
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-[var(--foreground)] px-5 py-4 text-[16px] font-semibold text-[var(--background)] transition active:opacity-80"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Authenticated ───────────────────────────────────────────────── */
  return (
    <DataProvider supabaseToken={supabaseToken} userId={user.id}>
      <WorkoutProvider userId={user.id}>
        <AuthenticatedApp user={user} onSignOut={signOut} />
      </WorkoutProvider>
    </DataProvider>
  );
}

// ─── Inner app (avoids re-renders from auth state) ───────────────────────────

function AuthenticatedApp({
  user,
  onSignOut,
}: {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  onSignOut: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("workout");
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const { activeSession, loading, discardWorkout } = useWorkoutSession();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("login") === "success") {
        // Limpiamos los caches tras login para tener datos actualizados
        clearAllCaches().catch(console.error);
        localStorage.clear();
        sessionStorage.clear();
        if ("caches" in window) {
          caches.keys().then((keys) => {
            return Promise.all(
              keys.filter((k) => k.startsWith("rurana-")).map((k) => caches.delete(k)),
            );
          }).catch(console.error);
        }
        url.searchParams.delete("login");
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, []);

  const handleResumeWorkout = useCallback(() => {
    setShowActiveWorkout(true);
  }, [setShowActiveWorkout]);

  const handleOnMinimize = useCallback(
    () => setShowActiveWorkout(false),
    [setShowActiveWorkout],
  );
  // Auto-open only when a NEW session starts (not on page restore)
  useEffect(() => {
    if (loading) return;
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    if (activeSession) {
      const id = setTimeout(() => setShowActiveWorkout(true), 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, loading]);

  const overlayVisible = showActiveWorkout && !!activeSession;

  return (
    <div className="flex flex-1 flex-col">
      {overlayVisible && <ActiveWorkout onMinimize={handleOnMinimize} />}

      <main className="flex-1 pb-20">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "workout" && (
          <WorkoutTab onResumeWorkout={handleResumeWorkout} />
        )}
        {activeTab === "profile" && (
          <ProfileTab user={user} onSignOut={onSignOut} />
        )}
      </main>

      {/* Active session pill */}
      {activeSession && !overlayVisible && (
        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] left-1/2 z-40 -translate-x-1/2 flex items-center rounded-full"
          style={{
            background: "#1C1C1E",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          <button
            type="button"
            onClick={() => setShowActiveWorkout(true)}
            className="flex items-center gap-3 rounded-full px-5 py-2.5 tap-highlight-transparent transition-transform active:scale-95"
          >
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0A84FF] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#0A84FF]" />
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold text-white">
              Entrenando
            </span>
            <span className="h-3.5 w-px bg-white/20" />
            <WorkoutTimer startedAt={activeSession.started_at} />
          </button>
          <button
            type="button"
            onClick={() => setShowDiscardConfirm(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full mr-1 tap-highlight-transparent active:opacity-60"
          >
            <X className="size-3.5 text-white/50" />
          </button>
        </div>
      )}

      <AlertDialog
        open={showDiscardConfirm}
        title="¿Eliminar sesión?"
        description="Se perderán todos los datos de esta sesión."
        actions={[
          {
            label: "Eliminar",
            variant: "danger",
            onClick: () => {
              setShowDiscardConfirm(false);
              void discardWorkout();
            },
          },
          {
            label: "Cancelar",
            variant: "cancel",
            onClick: () => setShowDiscardConfirm(false),
          },
        ]}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
