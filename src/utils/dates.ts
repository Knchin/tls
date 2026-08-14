import { format, isAfter, isBefore, isEqual, parseISO } from "date-fns";

export const DATE_FORMAT = "yyyy-MM-dd";

export function toISODate(date: Date): string {
  return format(date, DATE_FORMAT);
}

export function parseDate(value: string): Date {
  return parseISO(value);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISO(value);
  return !Number.isNaN(date.getTime());
}

export function compareDates(a: string, b: string): number {
  const da = parseDate(a).getTime();
  const db = parseDate(b).getTime();
  return da === db ? 0 : da < db ? -1 : 1;
}

export function isDateInRange(
  date: string,
  earliest?: string | null,
  latest?: string | null
): boolean {
  if (!isValidDateString(date)) return false;
  if (earliest && isAfter(parseDate(earliest), parseDate(date))) return false;
  if (latest && isBefore(parseDate(latest), parseDate(date))) return false;
  return true;
}

export function isSameDay(a: string, b: string): boolean {
  return isEqual(parseDate(a), parseDate(b));
}

export function addDays(isoDate: string, days: number): string {
  const date = parseDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}
