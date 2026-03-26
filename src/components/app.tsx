"use client";

import { Dumbbell, LoaderCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-client";

export function App() {
  const { user, status, signInWithGoogle, signOut } = useAuth();

  /* ─── Loading ─────────────────────────────────────────────────────── */
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
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
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-[20px] bg-[var(--accent)] shadow-[0_8px_24px_rgba(0,122,255,0.35)] text-white">
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
              className="flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-[var(--foreground)] px-5 py-4 text-[16px] font-semibold text-white transition active:opacity-80"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Authenticated ───────────────────────────────────────────────── */
  const firstName = user.fullName?.split(" ")[0] ?? user.email ?? "Tú";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-[20px] bg-[var(--accent)] text-white">
            <Dumbbell className="size-8" />
          </div>
        </div>
        <h1 className="text-[24px] font-bold tracking-tight">Hola, {firstName}</h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">Sesión iniciada.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--fill-tertiary)] px-5 py-4 text-[15px] font-medium text-[var(--muted)] transition active:opacity-70"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
