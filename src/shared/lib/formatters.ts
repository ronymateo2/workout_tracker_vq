import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { WorkoutEntry } from "@/lib/workout-types";

export function formatCompactDate(dateKey: string) {
  return format(parseISO(dateKey), "EEEE d 'de' MMMM", { locale: es });
}

export function formatShortDate(dateKey: string) {
  return format(parseISO(dateKey), "d MMM", { locale: es });
}

export function describeEntry(entry: WorkoutEntry) {
  const primarySet = entry.sets[0];
  const parts = [`${entry.sets.length} sets`];

  if (entry.exerciseMode === "isometric" && primarySet?.durationSeconds) {
    parts.push(`${primarySet.durationSeconds}s`);
  } else if (primarySet?.reps) {
    parts.push(`${primarySet.reps} rep`);
  }

  if (
    (entry.loadMode === "weight" || entry.loadMode === "mixed") &&
    entry.defaultWeightKg
  ) {
    parts.push(`${entry.defaultWeightKg} kg`);
  }

  if (
    (entry.loadMode === "band" || entry.loadMode === "mixed") &&
    entry.defaultBandColor
  ) {
    const resistance = entry.defaultBandResistance
      ? ` ${entry.defaultBandResistance}`
      : "";
    parts.push(`banda ${entry.defaultBandColor}${resistance}`);
  }

  if (entry.unilateral) {
    parts.push("unilateral");
  }

  return parts.join(" · ");
}
