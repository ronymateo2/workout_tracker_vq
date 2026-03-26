"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6">
      <div className="text-[var(--label-tertiary)]">{icon}</div>
      <p className="text-center text-[15px] text-[var(--label-secondary)]">
        {message}
      </p>
    </div>
  );
}
