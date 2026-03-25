"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Search } from "lucide-react";
import type { ExerciseLibraryItem } from "@/lib/workout-types";

export function LibraryView({
  items,
  query,
  onQueryChange,
  onUse,
}: {
  items: ExerciseLibraryItem[];
  query: string;
  onQueryChange: (value: string) => void;
  onUse: (exercise: ExerciseLibraryItem) => void;
}) {
  return (
    <div className="space-y-3">
      {/* iOS-style search bar */}
      <div className="flex items-center gap-2 rounded-[12px] bg-[var(--fill-tertiary)] px-3 py-2.5">
        <Search className="size-4 shrink-0 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar ejercicio"
          className="flex-1 bg-transparent text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      {/* Count badge */}
      {items.length > 0 && (
        <p className="px-1 text-[13px] text-[var(--muted)]">
          {items.length} ejercicio{items.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="ios-card px-5 py-8 text-center">
          <p className="text-[15px] font-semibold">Librería vacía</p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {query
              ? "Sin resultados para esa búsqueda."
              : "Agrega ejercicios y aparecerán aquí."}
          </p>
        </div>
      ) : (
        <div className="ios-card">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                index > 0 ? "border-t border-[var(--separator)]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-[var(--foreground)]">
                  {item.canonicalName}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  {item.aliases.length > 0
                    ? `${item.aliases.length} alias`
                    : "Sin alias"}{" "}
                  ·{" "}
                  {item.lastUsedAt
                    ? format(parseISO(item.lastUsedAt), "d MMM", { locale: es })
                    : "nuevo"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUse(item)}
                className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-semibold text-[var(--accent)] transition active:opacity-70"
              >
                Usar hoy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
