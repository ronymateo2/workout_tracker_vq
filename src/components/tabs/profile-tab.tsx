"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useData } from "@/lib/data-context";
import { getWorkoutCount, getRecentWorkouts } from "@/lib/data";
import { syncWorkoutsToSqlite, runSQLiteTestQuery } from "@/lib/sqlite";
import { TrainingCalendar } from "@/components/profile/training-calendar";
import { useTheme } from "@/lib/theme-context";

interface ProfileTabProps {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  onSignOut: () => void;
}

export function ProfileTab({ user, onSignOut }: ProfileTabProps) {
  const { supabase } = useData();
  const { theme, toggleTheme } = useTheme();
  const [workoutCount, setWorkoutCount] = useState(0);

  const loadStats = useCallback(async () => {
    if (!supabase) return;
    const count = await getWorkoutCount(supabase, user.id);
    setWorkoutCount(count);
  }, [user.id, supabase]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const displayName = user.fullName ?? user.email;

  return (
    <div className="safe-top px-4">
      <h1 className="pt-2 pb-4 text-[34px] font-bold tracking-tight">Perfil</h1>

      {/* User info */}
      <div className="mb-6 flex items-center gap-4 rounded-[16px] bg-[var(--background-secondary)] p-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="size-14 rounded-full"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[20px] font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold">{displayName}</p>
          <p className="truncate text-[14px] text-[var(--label-secondary)]">
            {user.email}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 rounded-[16px] bg-[var(--background-secondary)] p-4 space-y-4">
        <div>
          <p className="text-[14px] text-[var(--label-secondary)]">
            Total Entrenamientos
          </p>
          <p className="text-[28px] font-bold text-[var(--accent)]">
            {workoutCount}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-6">
        <TrainingCalendar userId={user.id} />
      </div>

      {/* Settings */}
      <div className="mb-6 overflow-hidden rounded-[16px] bg-[var(--background-secondary)]">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between px-4 py-[14px] transition active:opacity-70"
        >
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="size-[18px] text-[var(--accent)]" />
            ) : (
              <Sun className="size-[18px] text-[var(--accent)]" />
            )}
            <span className="text-[17px]">Apariencia</span>
          </div>
          {/* iOS-style toggle */}
          <div
            className="relative h-[31px] w-[51px] rounded-full transition-colors duration-200"
            style={{
              background: theme === "dark" ? "var(--accent)" : "var(--fill-secondary)",
            }}
          >
            <div
              className="absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200"
              style={{
                transform: theme === "dark" ? "translateX(22px)" : "translateX(2px)",
              }}
            />
          </div>
        </button>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--fill-tertiary)] px-5 py-4 text-[15px] font-medium text-[var(--muted)] transition active:opacity-70"
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
