import type { ReactNode } from "react";
import clsx from "clsx";

export function StatusPill({
  icon,
  label,
  tone,
}: {
  icon: ReactNode;
  label: string;
  tone: "neutral" | "warning" | "success";
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "warning" && "bg-[rgba(255,149,0,0.12)] text-[var(--warning)]",
        tone === "success" && "bg-[rgba(52,199,89,0.12)] text-[var(--success)]",
        tone === "neutral" && "bg-[var(--fill-tertiary)] text-[var(--muted)]",
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
