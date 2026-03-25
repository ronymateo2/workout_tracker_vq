"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Dumbbell,
  LibraryBig,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWorkoutTracker } from "@/lib/use-workout-tracker";
import type { ExerciseLibraryItem, WorkoutEntry } from "@/lib/workout-types";
import {
  getSessionSummary,
  normalizeExerciseName,
  toDateKey,
} from "@/lib/workout-types";
import {
  createExerciseDraft,
  exerciseToDraft,
  type ExerciseDraft,
} from "@/features/exercise-editor/draft-utils";
import { ExerciseEditorSheet } from "@/features/exercise-editor/ExerciseEditorSheet";
import { TodayView } from "@/features/today/TodayView";
import { CalendarView } from "@/features/calendar/CalendarView";
import {
  goToNextMonth,
  goToPreviousMonth,
  monthFromDateKey,
} from "@/features/calendar/calendar-utils";
import { LibraryView } from "@/features/library/LibraryView";
import { NavBar } from "@/shared/components/NavBar";
import { StatusPill } from "@/shared/components/StatusPill";
import { formatCompactDate } from "@/shared/lib/formatters";
import { useServiceWorkerUpdater } from "@/shared/lib/use-service-worker-updater";

type AppTab = "today" | "calendar" | "library";

const NAV_ITEMS = [
  {
    id: "today",
    label: "Hoy",
    icon: <Dumbbell className="size-[22px]" />,
  },
  {
    id: "calendar",
    label: "Calendario",
    icon: <CalendarDays className="size-[22px]" />,
  },
  {
    id: "library",
    label: "Librería",
    icon: <LibraryBig className="size-[22px]" />,
  },
];

export function WorkoutTrackerApp() {
  const {
    status,
    user,
    sessions,
    library,
    isOnline,
    isSyncing,
    lastSyncAt,
    errorMessage,
    pendingCount,
    signInWithGoogle,
    signOut,
    saveEntry,
    deleteEntry,
    syncNow,
    devSignIn,
    devSignOut,
  } = useWorkoutTracker();

  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [, startTransition] = useTransition();
  const [libraryQuery, setLibraryQuery] = useState("");
  const deferredLibraryQuery = useDeferredValue(libraryQuery);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<ExerciseDraft | null>(null);
  const { waitingWorker, updateApp } = useServiceWorkerUpdater();

  const currentSession =
    sessions.find((s) => s.date === selectedDate) ?? null;
  const selectedSummary = getSessionSummary(currentSession);
  const filteredLibrary = library.filter((item) =>
    normalizeExerciseName(item.canonicalName).includes(
      normalizeExerciseName(deferredLibraryQuery),
    ),
  );

  function openNewExercise(linkedExercise?: ExerciseLibraryItem) {
    setEditorDraft(createExerciseDraft("", linkedExercise));
    setEditorOpen(true);
  }

  function openEntryForEdit(entry: WorkoutEntry) {
    setEditorDraft(exerciseToDraft(entry));
    setEditorOpen(true);
  }

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


  /* ─── Auth / Login ────────────────────────────────────────────────── */
  if (!user || status === "auth") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-5 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
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

          {/* Card */}
          <div className="rounded-[20px] bg-[var(--background-secondary)] p-5 shadow-[var(--shadow)]">
            <p className="mb-4 text-[14px] leading-relaxed text-[var(--muted)]">
              Registra pesos, bandas, isométricos y sesiones del día con una
              interfaz compacta y offline-first.
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

            {devSignIn && (
              <button
                type="button"
                onClick={() => void devSignIn()}
                className="mt-2 w-full rounded-[14px] border border-dashed border-[var(--separator)] py-3 text-[14px] font-medium text-[var(--muted)] transition active:opacity-60"
              >
                ⚙️ Dev Login (sin Google)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main App ────────────────────────────────────────────────────── */
  const firstName =
    user.fullName?.split(" ")[0] ??
    user.email ??
    "Tú";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-[var(--separator)]"
        style={{
          background: "rgba(242,242,247,0.88)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          paddingTop: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <div className="mx-auto max-w-lg px-5 pb-3 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Date */}
              <h1 className="text-[28px] font-bold capitalize leading-tight tracking-tight text-[var(--foreground)]">
                {formatCompactDate(selectedDate)}
              </h1>
              {/* Summary */}
              <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                {selectedSummary.exercises > 0
                  ? `${selectedSummary.exercises} ejercicio${selectedSummary.exercises !== 1 ? "s" : ""} · ${selectedSummary.sets} sets`
                  : "Sin ejercicios hoy"}
              </p>
            </div>

            {/* Right controls */}
            <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
              {/* User + logout */}
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">
                  {firstName}
                </span>
                <button
                  type="button"
                  onClick={() => void (devSignOut ? devSignOut() : signOut())}
                  className="flex size-7 items-center justify-center rounded-full bg-[var(--fill-tertiary)] text-[var(--muted)] transition active:opacity-60"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>

              {/* Sync status */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--fill-tertiary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] transition active:opacity-60"
                >
                  <RefreshCw
                    className={`size-3 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  {isSyncing
                    ? "Sync..."
                    : lastSyncAt
                      ? format(parseISO(lastSyncAt), "HH:mm", { locale: es })
                      : "Sync"}
                </button>
                <StatusPill
                  icon={
                    isOnline ? (
                      <Wifi className="size-3" />
                    ) : (
                      <WifiOff className="size-3" />
                    )
                  }
                  label={
                    isOnline
                      ? pendingCount > 0
                        ? `${pendingCount}↑`
                        : "En línea"
                      : "Offline"
                  }
                  tone={
                    isOnline
                      ? pendingCount > 0
                        ? "warning"
                        : "neutral"
                      : "warning"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Banners ──────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-lg px-4">
        {waitingWorker ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-[14px] bg-[var(--background-secondary)] px-4 py-3 shadow-[var(--shadow-xs)]">
            <p className="text-[14px] font-semibold">Nueva versión disponible</p>
            <button
              type="button"
              onClick={updateApp}
              className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              Actualizar
            </button>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-2 rounded-[14px] bg-[rgba(255,59,48,0.08)] px-4 py-3 text-[14px] font-medium text-[var(--danger)]">
            {errorMessage}
          </div>
        ) : null}
      </div>

      {/* ─── Main content ─────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {activeTab === "today" && (
              <TodayView
                selectedDate={selectedDate}
                session={currentSession}
                onEdit={openEntryForEdit}
                onDelete={(entryId) =>
                  void deleteEntry(selectedDate, entryId)
                }
              />
            )}

            {activeTab === "calendar" && (
              <CalendarView
                monthCursor={monthCursor}
                selectedDate={selectedDate}
                sessions={sessions}
                onPreviousMonth={() =>
                  setMonthCursor((c) => goToPreviousMonth(c))
                }
                onNextMonth={() => setMonthCursor((c) => goToNextMonth(c))}
                onSelectDate={(date) => {
                  startTransition(() => {
                    setSelectedDate(date);
                    setActiveTab("today");
                  });
                }}
              />
            )}

            {activeTab === "library" && (
              <LibraryView
                items={filteredLibrary}
                query={libraryQuery}
                onQueryChange={setLibraryQuery}
                onUse={(exercise) => {
                  startTransition(() => {
                    setActiveTab("today");
                    setSelectedDate(toDateKey(new Date()));
                  });
                  openNewExercise(exercise);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ─── FAB + Tab bar ────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-lg">
          {/* FAB — only on Today tab */}
          {activeTab === "today" && (
            <div className="flex justify-center pb-2">
              <button
                type="button"
                onClick={() => openNewExercise()}
                className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(0,122,255,0.4)] transition active:opacity-80"
              >
                <Plus className="size-[18px]" />
                Ejercicio
              </button>
            </div>
          )}

          {/* Tab bar */}
          <NavBar
            items={NAV_ITEMS}
            activeId={activeTab}
            onSelect={(id) => {
              const tab = id as AppTab;
              startTransition(() => {
                setActiveTab(tab);
                if (tab === "calendar") {
                  setMonthCursor(monthFromDateKey(selectedDate));
                }
              });
            }}
          />
        </div>
      </div>

      {/* ─── Exercise editor sheet ────────────────────────────────────── */}
      <ExerciseEditorSheet
        open={editorOpen}
        draftSeed={editorDraft}
        library={library}
        userId={user.id}
        sessionId={currentSession?.id}
        onClose={() => setEditorOpen(false)}
        onSave={async ({ entry, linkedExercise, typedName }) => {
          await saveEntry({ date: selectedDate, entry, linkedExercise, typedName });
          setEditorOpen(false);
        }}
      />
    </div>
  );
}
