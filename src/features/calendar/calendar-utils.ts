import { addMonths, parseISO, startOfMonth, subMonths } from "date-fns";

export function goToPreviousMonth(current: Date) {
  return subMonths(current, 1);
}

export function goToNextMonth(current: Date) {
  return addMonths(current, 1);
}

export function monthFromDateKey(dateKey: string) {
  return startOfMonth(parseISO(dateKey));
}
