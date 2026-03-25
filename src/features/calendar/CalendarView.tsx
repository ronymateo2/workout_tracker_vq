"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkoutSession } from "@/lib/workout-types";
import { toDateKey } from "@/lib/workout-types";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function CalendarView({
  monthCursor,
  selectedDate,
  sessions,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}: {
  monthCursor: Date;
  selectedDate: string;
  sessions: WorkoutSession[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string) => void;
}) {
  const monthStart = startOfMonth(monthCursor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 }),
  });
  const trainedDays = new Set(sessions.map((s) => s.date));

  return (
    <div className="ios-card px-4 py-5">
      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[17px] font-semibold capitalize text-[var(--foreground)]">
          {format(monthCursor, "MMMM yyyy", { locale: es })}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="flex size-8 items-center justify-center rounded-full text-[var(--accent)] transition active:bg-[var(--fill-tertiary)]"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex size-8 items-center justify-center rounded-full text-[var(--accent)] transition active:bg-[var(--fill-tertiary)]"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mt-4 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day + i}
            className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const isSelected = dateKey === selectedDate;
          const isCurrentMonth = isSameMonth(date, monthCursor);
          const hasWorkout = trainedDays.has(dateKey);
          const todayDate = isToday(date);

          return (
            <button
              type="button"
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={clsx(
                "relative mx-auto flex flex-col items-center justify-center py-1",
                "size-10 rounded-full transition-all",
                isSelected
                  ? "bg-[var(--accent)] text-white"
                  : todayDate
                    ? "bg-[var(--fill-tertiary)] text-[var(--foreground)]"
                    : "text-[var(--foreground)] active:bg-[var(--fill-tertiary)]",
                !isCurrentMonth && !isSelected && "opacity-30",
              )}
            >
              <span
                className={clsx(
                  "text-[15px] font-medium leading-none",
                  todayDate && !isSelected && "font-bold text-[var(--accent)]",
                )}
              >
                {format(date, "d")}
              </span>
              {/* Workout dot */}
              <span
                className={clsx(
                  "mt-0.5 size-1 rounded-full",
                  hasWorkout
                    ? isSelected
                      ? "bg-white/70"
                      : "bg-[var(--accent)]"
                    : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
