"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/data-context";
import { getTrainingDays } from "@/lib/data";
import clsx from "clsx";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];

interface TrainingCalendarProps {
  userId: string;
}

export function TrainingCalendar({ userId }: TrainingCalendarProps) {
  const { supabase } = useData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [trainingDays, setTrainingDays] = useState<Set<number>>(new Set());

  const loadDays = useCallback(async () => {
    if (!supabase) return;
    const days = await getTrainingDays(supabase, userId, year, month);
    setTrainingDays(days);
  }, [userId, year, month, supabase]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = now.getDate();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="rounded-[16px] bg-[var(--background-secondary)] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 tap-highlight-transparent active:opacity-70"
        >
          <ChevronLeft className="size-5 text-[var(--accent)]" />
        </button>
        <span className="text-[15px] font-semibold">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 tap-highlight-transparent active:opacity-70"
        >
          <ChevronRight className="size-5 text-[var(--accent)]" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-medium text-[var(--label-secondary)] py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center py-1">
            {day ? (
              <div
                className={clsx(
                  "flex size-8 items-center justify-center rounded-full text-[13px]",
                  trainingDays.has(day) &&
                    "bg-[var(--accent)] text-white font-semibold",
                  isCurrentMonth &&
                    day === today &&
                    !trainingDays.has(day) &&
                    "border border-[var(--accent)] text-[var(--accent)]",
                )}
              >
                {day}
              </div>
            ) : (
              <div className="size-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
