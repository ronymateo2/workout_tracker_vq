"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  activeIcon?: ReactNode;
}

export function NavBar({
  items,
  activeId,
  onSelect,
}: {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="ios-surface flex items-center justify-around rounded-none border-x-0 border-b-0 px-2 pt-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-opacity active:opacity-60"
          >
            <span
              className={clsx(
                "transition-colors",
                active ? "text-[var(--accent)]" : "text-[rgba(60,60,67,0.5)]",
              )}
            >
              {active && item.activeIcon ? item.activeIcon : item.icon}
            </span>
            <span
              className={clsx(
                "text-[10px] font-medium transition-colors",
                active ? "text-[var(--accent)]" : "text-[rgba(60,60,67,0.5)]",
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
