"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Sparkles, X } from "lucide-react";
import type {
  ExerciseLibraryItem,
  ExerciseMode,
  LoadMode,
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
                  <FormSection label="Nombre">
                    <input
                      value={draft.exerciseName}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, exerciseName: e.target.value } : d,
                        )
                      }
                      placeholder="Face pull, Sentadilla..."
                      className="ios-input text-[16px]"
                      autoFocus
                    />
                  </FormSection>

                  {/* Mode selectors */}
                  <FormSection label="Ejecución">
                    <SegmentControl
                      value={draft.exerciseMode}
                      options={[
                        { value: "reps", label: "Repeticiones" },
                        { value: "isometric", label: "Tiempo" },
                      ]}
                      onChange={(v) =>
                        setDraft((d) =>
                          d ? { ...d, exerciseMode: v as ExerciseMode } : d,
                        )
                      }
                    />
                  </FormSection>

                  <FormSection label="Tipo de carga">
                    <SegmentControl
                      value={draft.loadMode}
                      options={[
                        { value: "bodyweight", label: "Libre" },
                        { value: "weight", label: "Peso" },
                        { value: "band", label: "Banda" },
                        { value: "mixed", label: "Mixto" },
                      ]}
                      onChange={(v) =>
                        setDraft((d) =>
                          d ? { ...d, loadMode: v as LoadMode } : d,
                        )
                      }
                    />
                  </FormSection>

                  {/* Load defaults */}
                  {(showWeightDefaults || showBandDefaults) && (
                    <FormSection label="Carga por defecto">
                      <div className="grid grid-cols-2 gap-2">
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
                    </FormSection>
                  )}

                  {/* Unilateral toggle */}
                  <div className="mt-3 flex items-center justify-between rounded-[14px] bg-[var(--background)] px-4 py-3.5">
                    <p className="text-[15px] font-medium">Unilateral</p>
                    {/* iOS-style switch: thumb uses `left` for reliable positioning */}
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

                  {/* Sets */}
                  <FormSection label="Sets">
                    <div className="space-y-2">
                      {draft.sets.map((set, index) => (
                        <div
                          key={set.id}
                          className="rounded-[14px] bg-[var(--background)] px-3.5 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-[var(--muted)]">
                              Set {index + 1}
                            </span>
                            {draft.sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          sets: d.sets.filter(
                                            (s) => s.id !== set.id,
                                          ),
                                        }
                                      : d,
                                  )
                                }
                                className="text-[13px] font-medium text-[var(--danger)]"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {draft.exerciseMode === "isometric" ? (
                              <InlineField
                                label="Segundos"
                                value={set.durationSeconds}
                                inputMode="numeric"
                                placeholder="30"
                                onChange={(v) =>
                                  setDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          sets: d.sets.map((s) =>
                                            s.id === set.id
                                              ? { ...s, durationSeconds: v }
                                              : s,
                                          ),
                                        }
                                      : d,
                                  )
                                }
                              />
                            ) : (
                              <InlineField
                                label="Reps"
                                value={set.reps}
                                inputMode="numeric"
                                placeholder="15"
                                onChange={(v) =>
                                  setDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          sets: d.sets.map((s) =>
                                            s.id === set.id
                                              ? { ...s, reps: v }
                                              : s,
                                          ),
                                        }
                                      : d,
                                  )
                                }
                              />
                            )}

                            {showWeightDefaults && (
                              <InlineField
                                label="Kg"
                                value={set.weightKg}
                                inputMode="decimal"
                                placeholder={draft.defaultWeightKg || "—"}
                                onChange={(v) =>
                                  setDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          sets: d.sets.map((s) =>
                                            s.id === set.id
                                              ? { ...s, weightKg: v }
                                              : s,
                                          ),
                                        }
                                      : d,
                                  )
                                }
                              />
                            )}

                            {showBandDefaults && (
                              <>
                                <InlineField
                                  label="Color"
                                  value={set.bandColor}
                                  placeholder={draft.defaultBandColor || "—"}
                                  onChange={(v) =>
                                    setDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            sets: d.sets.map((s) =>
                                              s.id === set.id
                                                ? { ...s, bandColor: v }
                                                : s,
                                            ),
                                          }
                                        : d,
                                    )
                                  }
                                />
                                <InlineField
                                  label="Resistencia"
                                  value={set.bandResistance}
                                  placeholder={
                                    draft.defaultBandResistance || "—"
                                  }
                                  onChange={(v) =>
                                    setDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            sets: d.sets.map((s) =>
                                              s.id === set.id
                                                ? { ...s, bandResistance: v }
                                                : s,
                                            ),
                                          }
                                        : d,
                                    )
                                  }
                                />
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Set actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) =>
                              d
                                ? { ...d, sets: [...d.sets, createDraftSet()] }
                                : d,
                            )
                          }
                          className="flex-1 rounded-[12px] bg-[var(--background)] py-2.5 text-[14px] font-semibold text-[var(--accent)]"
                        >
                          + Set vacío
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => {
                              if (!d || d.sets.length === 0) return d;
                              const last = d.sets[d.sets.length - 1];
                              return {
                                ...d,
                                sets: [...d.sets, createDraftSet(last)],
                              };
                            })
                          }
                          className="flex-1 rounded-[12px] bg-[var(--background)] py-2.5 text-[14px] font-semibold text-[var(--muted)]"
                        >
                          Duplicar último
                        </button>
                      </div>
                    </div>
                  </FormSection>

                  {/* Notes */}
                  <FormSection label="Nota (opcional)">
                    <textarea
                      value={draft.notes}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, notes: e.target.value } : d,
                        )
                      }
                      rows={2}
                      placeholder="12 kg por mano, pausa 90s..."
                      className="ios-input resize-none text-[15px]"
                    />
                  </FormSection>

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

function FormSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function SegmentControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-[12px] bg-[var(--fill-tertiary)] p-1 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "flex-1 rounded-[9px] py-2 text-[13px] font-semibold transition-all",
            option.value === value
              ? "bg-[var(--background-secondary)] text-[var(--foreground)] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              : "text-[var(--muted)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
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
