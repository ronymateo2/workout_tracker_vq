"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Sparkles, X } from "lucide-react";
import type {
  ExerciseLibraryItem,
  WorkoutEntry,
} from "@/lib/workout-types";
import { findExerciseSuggestions } from "@/lib/workout-types";
import {
  buildEntryFromDraft,
  createDraftSet,
  type ExerciseDraft,
} from "./draft-utils";

export function ExerciseEditorSheet({
  open,
  draftSeed,
  library,
  userId,
  sessionId,
  onClose,
  onSave,
}: {
  open: boolean;
  draftSeed: ExerciseDraft | null;
  library: ExerciseLibraryItem[];
  userId: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (payload: {
    entry: WorkoutEntry;
    linkedExercise: ExerciseLibraryItem | null;
    typedName: string;
  }) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ExerciseDraft | null>(draftSeed);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<ExerciseLibraryItem[]>([]);

  useEffect(() => {
    setDraft(draftSeed);
    setSuggestions([]);
    setError(null);
  }, [draftSeed]);

  if (!draft) return null;

  async function commit(
    linkedExercise: ExerciseLibraryItem | null,
    skipSuggestion = false,
  ) {
    setError(null);
    if (!draft) return;

    const current = draft;

    if (!current.exerciseName.trim()) {
      setError("Escribe un nombre para el ejercicio.");
      return;
    }

    if (!skipSuggestion) {
      const next = findExerciseSuggestions(
        current.exerciseName,
        library.filter((item) => item.id !== linkedExercise?.id),
      );
      if (next.length > 0 && !linkedExercise) {
        setSuggestions(next);
        return;
      }
    }

    const payload = buildEntryFromDraft(current, userId, sessionId, linkedExercise);

    if (payload.entry.sets.length === 0) {
      setError(
        current.exerciseMode === "isometric"
          ? "Agrega al menos un set con segundos."
          : "Agrega al menos un set con repeticiones.",
      );
      return;
    }

    try {
      setSubmitting(true);
      await onSave({ ...payload, linkedExercise });
    } finally {
      setSubmitting(false);
    }
  }

  const isEditing = draft.id === draftSeed?.id && !!draftSeed?.exerciseName;
  const showWeightDefaults =
    draft.loadMode === "weight" || draft.loadMode === "mixed";
  const showBandDefaults =
    draft.loadMode === "band" || draft.loadMode === "mixed";

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-0"
          >
            <div className="w-full max-w-lg overflow-hidden rounded-t-[20px] bg-[var(--background-secondary)] shadow-[0_-4px_32px_rgba(0,0,0,0.14)]">
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="h-[5px] w-9 rounded-full bg-[rgba(60,60,67,0.3)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 pt-1">
                <p className="text-[17px] font-semibold text-[var(--foreground)]">
                  {isEditing ? "Editar ejercicio" : "Nuevo ejercicio"}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-7 items-center justify-center rounded-full bg-[var(--fill-tertiary)] text-[var(--muted)]"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="scrollbar-none max-h-[78vh] overflow-y-auto overscroll-contain">
                <div className="space-y-0 px-4 pb-6">

                  {/* Name */}
                  <div className="mt-3">
                    <input
                      value={draft.exerciseName}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, exerciseName: e.target.value } : d,
                        )
                      }
                      placeholder="Face pull, Sentadilla..."
                      className="ios-input text-[17px] font-medium"
                      autoFocus
                    />
                  </div>

                  {/* Settings card */}
                  <div className="mt-4 overflow-hidden rounded-[16px] bg-[var(--background-secondary)] divide-y divide-[var(--separator)]">
                    {/* Ejecución */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-[var(--foreground)]">Ejecución</span>
                      <div className="flex gap-1.5">
                        <PillButton
                          active={draft.exerciseMode === "reps"}
                          onClick={() => setDraft((d) => d ? { ...d, exerciseMode: "reps" } : d)}
                        >
                          Repeticiones
                        </PillButton>
                        <PillButton
                          active={draft.exerciseMode === "isometric"}
                          onClick={() => setDraft((d) => d ? { ...d, exerciseMode: "isometric" } : d)}
                        >
                          Tiempo
                        </PillButton>
                      </div>
                    </div>

                    {/* Tipo de carga */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] text-[var(--foreground)]">Carga</span>
                      <div className="flex gap-1.5">
                        {(
                          [
                            { value: "bodyweight", label: "Libre" },
                            { value: "weight", label: "Peso" },
                            { value: "band", label: "Banda" },
                            { value: "mixed", label: "Mixto" },
                          ] as const
                        ).map((opt) => (
                          <PillButton
                            key={opt.value}
                            active={draft.loadMode === opt.value}
                            onClick={() => setDraft((d) => d ? { ...d, loadMode: opt.value } : d)}
                          >
                            {opt.label}
                          </PillButton>
                        ))}
                      </div>
                    </div>

                    {/* Unilateral */}
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-[15px] text-[var(--foreground)]">Unilateral</span>
                      <div
                        role="switch"
                        aria-checked={draft.unilateral}
                        tabIndex={0}
                        onClick={() =>
                          setDraft((d) =>
                            d ? { ...d, unilateral: !d.unilateral } : d,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter")
                            setDraft((d) =>
                              d ? { ...d, unilateral: !d.unilateral } : d,
                            );
                        }}
                        className={clsx(
                          "relative h-[31px] w-[51px] shrink-0 cursor-pointer select-none rounded-full outline-none transition-colors duration-200",
                          draft.unilateral
                            ? "bg-[var(--accent)]"
                            : "bg-[rgba(120,120,128,0.32)]",
                        )}
                      >
                        <span
                          className={clsx(
                            "absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-[left] duration-200",
                            draft.unilateral ? "left-[22px]" : "left-[2px]",
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Load defaults */}
                  {(showWeightDefaults || showBandDefaults) && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {showWeightDefaults && (
                        <InlineField
                          label="Peso base"
                          value={draft.defaultWeightKg}
                          inputMode="decimal"
                          placeholder="kg"
                          onChange={(v) =>
                            setDraft((d) =>
                              d ? { ...d, defaultWeightKg: v } : d,
                            )
                          }
                        />
                      )}
                      {showBandDefaults && (
                        <>
                          <InlineField
                            label="Color"
                            value={draft.defaultBandColor}
                            placeholder="Roja"
                            onChange={(v) =>
                              setDraft((d) =>
                                d ? { ...d, defaultBandColor: v } : d,
                              )
                            }
                          />
                          <InlineField
                            label="Resistencia"
                            value={draft.defaultBandResistance}
                            placeholder="Media / 35 lb"
                            onChange={(v) =>
                              setDraft((d) =>
                                d ? { ...d, defaultBandResistance: v } : d,
                              )
                            }
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* Sets */}
                  <div className="mt-4">
                    <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Sets
                    </p>
                    <div className="overflow-hidden rounded-[16px] bg-[var(--background-secondary)]">
                      {/* Column headers */}
                      <div className={clsx(
                        "grid gap-2 border-b border-[var(--separator)] px-4 py-2",
                        draft.exerciseMode === "isometric"
                          ? showWeightDefaults ? "grid-cols-[2rem_1fr_1fr]" : "grid-cols-[2rem_1fr]"
                          : showWeightDefaults ? "grid-cols-[2rem_1fr_1fr]" : showBandDefaults ? "grid-cols-[2rem_1fr_1fr_1fr]" : "grid-cols-[2rem_1fr]"
                      )}>
                        <span />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                          {draft.exerciseMode === "isometric" ? "Segundos" : "Reps"}
                        </span>
                        {showWeightDefaults && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Kg</span>
                        )}
                        {showBandDefaults && (
                          <>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Color</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Resist.</span>
                          </>
                        )}
                      </div>

                      {/* Set rows */}
                      <div className="divide-y divide-[var(--separator)]">
                        {draft.sets.map((set, index) => (
                          <div
                            key={set.id}
                            className={clsx(
                              "grid items-center gap-2 px-4 py-2.5",
                              draft.exerciseMode === "isometric"
                                ? showWeightDefaults ? "grid-cols-[2rem_1fr_1fr]" : "grid-cols-[2rem_1fr]"
                                : showWeightDefaults ? "grid-cols-[2rem_1fr_1fr]" : showBandDefaults ? "grid-cols-[2rem_1fr_1fr_1fr]" : "grid-cols-[2rem_1fr]"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                draft.sets.length > 1 &&
                                setDraft((d) =>
                                  d
                                    ? { ...d, sets: d.sets.filter((s) => s.id !== set.id) }
                                    : d,
                                )
                              }
                              className={clsx(
                                "flex size-6 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
                                draft.sets.length > 1
                                  ? "bg-[rgba(255,59,48,0.12)] text-[var(--danger)]"
                                  : "bg-[var(--fill-tertiary)] text-[var(--muted)] cursor-default",
                              )}
                              aria-label={`Eliminar set ${index + 1}`}
                            >
                              {index + 1}
                            </button>

                            {draft.exerciseMode === "isometric" ? (
                              <SetInput
                                value={set.durationSeconds}
                                inputMode="numeric"
                                placeholder="30"
                                onChange={(v) =>
                                  setDraft((d) =>
                                    d
                                      ? { ...d, sets: d.sets.map((s) => s.id === set.id ? { ...s, durationSeconds: v } : s) }
                                      : d,
                                  )
                                }
                              />
                            ) : (
                              <SetInput
                                value={set.reps}
                                inputMode="numeric"
                                placeholder="15"
                                onChange={(v) =>
                                  setDraft((d) =>
                                    d
                                      ? { ...d, sets: d.sets.map((s) => s.id === set.id ? { ...s, reps: v } : s) }
                                      : d,
                                  )
                                }
                              />
                            )}

                            {showWeightDefaults && (
                              <SetInput
                                value={set.weightKg}
                                inputMode="decimal"
                                placeholder={draft.defaultWeightKg || "—"}
                                onChange={(v) =>
                                  setDraft((d) =>
                                    d
                                      ? { ...d, sets: d.sets.map((s) => s.id === set.id ? { ...s, weightKg: v } : s) }
                                      : d,
                                  )
                                }
                              />
                            )}

                            {showBandDefaults && (
                              <>
                                <SetInput
                                  value={set.bandColor}
                                  placeholder={draft.defaultBandColor || "—"}
                                  onChange={(v) =>
                                    setDraft((d) =>
                                      d
                                        ? { ...d, sets: d.sets.map((s) => s.id === set.id ? { ...s, bandColor: v } : s) }
                                        : d,
                                    )
                                  }
                                />
                                <SetInput
                                  value={set.bandResistance}
                                  placeholder={draft.defaultBandResistance || "—"}
                                  onChange={(v) =>
                                    setDraft((d) =>
                                      d
                                        ? { ...d, sets: d.sets.map((s) => s.id === set.id ? { ...s, bandResistance: v } : s) }
                                        : d,
                                    )
                                  }
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Set actions */}
                      <div className="flex gap-px border-t border-[var(--separator)]">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) =>
                              d ? { ...d, sets: [...d.sets, createDraftSet()] } : d,
                            )
                          }
                          className="flex-1 py-3 text-[14px] font-semibold text-[var(--accent)]"
                        >
                          + Set vacío
                        </button>
                        <div className="w-px bg-[var(--separator)]" />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => {
                              if (!d || d.sets.length === 0) return d;
                              const last = d.sets[d.sets.length - 1];
                              return { ...d, sets: [...d.sets, createDraftSet(last)] };
                            })
                          }
                          className="flex-1 py-3 text-[14px] font-semibold text-[var(--muted)]"
                        >
                          Duplicar último
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-3">
                    <textarea
                      value={draft.notes}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, notes: e.target.value } : d,
                        )
                      }
                      rows={2}
                      placeholder="Nota opcional: 12 kg por mano, pausa 90s..."
                      className="ios-input resize-none text-[15px]"
                    />
                  </div>

                  {/* Library suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-3 rounded-[16px] border border-[var(--accent-soft)] bg-[var(--accent-soft)] p-4">
                      <div className="flex items-center gap-2 text-[var(--accent)]">
                        <Sparkles className="size-4" />
                        <p className="text-[14px] font-semibold">
                          Nombres parecidos en librería
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {suggestions.map((suggestion) => (
                          <button
                            type="button"
                            key={suggestion.id}
                            onClick={() => void commit(suggestion, true)}
                            className="flex w-full items-center justify-between rounded-[12px] bg-[var(--background-secondary)] px-4 py-3 text-left"
                          >
                            <div>
                              <p className="text-[14px] font-semibold">
                                {suggestion.canonicalName}
                              </p>
                              <p className="text-[12px] text-[var(--muted)]">
                                {suggestion.aliases.length} alias
                              </p>
                            </div>
                            <span className="text-[13px] font-semibold text-[var(--accent)]">
                              Usar
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void commit(null, true)}
                        className="mt-3 text-[13px] font-semibold text-[var(--muted)]"
                      >
                        Guardar con mi nombre
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <p className="mt-3 rounded-[12px] bg-[rgba(255,59,48,0.1)] px-4 py-3 text-[14px] font-medium text-[var(--danger)]">
                      {error}
                    </p>
                  )}

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={() => void commit(null)}
                    disabled={submitting}
                    className="mt-4 w-full rounded-[14px] bg-[var(--accent)] py-4 text-[16px] font-semibold text-white transition disabled:opacity-50 active:opacity-80"
                  >
                    {submitting ? "Guardando..." : "Guardar ejercicio"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/* ─── Internal sub-components ──────────────────────────────────────── */

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 text-[13px] font-semibold transition-all",
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--fill-tertiary)] text-[var(--muted)]",
      )}
    >
      {children}
    </button>
  );
}

function SetInput({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode={inputMode}
      placeholder={placeholder}
      className="w-full rounded-[8px] bg-[var(--fill-tertiary)] px-2.5 py-1.5 text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)] focus:bg-[var(--accent-soft)] focus:ring-1 focus:ring-[var(--accent)]"
    />
  );
}

function InlineField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="w-full rounded-[10px] border border-[var(--separator)] bg-[var(--background-secondary)] px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--label-tertiary)] focus:border-[var(--accent)]"
      />
    </div>
  );
}
