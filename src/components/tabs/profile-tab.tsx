"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { getWorkoutCount } from "@/lib/data";
import { TrainingCalendar } from "@/components/profile/training-calendar";

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
  const [workoutCount, setWorkoutCount] = useState(0);

  const loadStats = useCallback(async () => {
    const count = await getWorkoutCount(user.id);
    setWorkoutCount(count);
  }, [user.id]);

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
          <p className="truncate text-[13px] text-[var(--label-secondary)]">
            {user.email}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 rounded-[16px] bg-[var(--background-secondary)] p-4">
        <p className="text-[13px] text-[var(--label-secondary)]">
          Total Entrenamientos
        </p>
        <p className="text-[28px] font-bold text-[var(--accent)]">
          {workoutCount}
        </p>
      </div>

      {/* Calendar */}
      <div className="mb-6">
        <TrainingCalendar userId={user.id} />
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
