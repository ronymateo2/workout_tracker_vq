"use client";

import { Home, Dumbbell, User } from "lucide-react";
import clsx from "clsx";

export type TabId = "home" | "workout" | "profile";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "workout", label: "Entreno", icon: Dumbbell },
  { id: "profile", label: "Perfil", icon: User },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 ios-surface safe-bottom border-t border-[var(--line)]">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-4 py-1 tap-highlight-transparent transition-colors",
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--label-tertiary)]",
              )}
            >
              <Icon className="size-6" strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
