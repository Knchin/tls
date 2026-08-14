import type { AppointmentCriteria, AppointmentSlot } from "@/types";
import { isDateInRange } from "@/utils/dates";

export type MatchResult = {
  matched: boolean;
  matchedSlots: AppointmentSlot[];
  allSlots: AppointmentSlot[];
};

export function isWithinPreferredRange(
  slotDate: string,
  earliestDate?: string | null,
  latestDate?: string | null
): boolean {
  return isDateInRange(slotDate, earliestDate, latestDate);
}

export function filterSlotsByRange(
  slots: AppointmentSlot[],
  criteria: Pick<AppointmentCriteria, "earliestDate" | "latestDate">
): AppointmentSlot[] {
  return slots.filter((slot) =>
    isWithinPreferredRange(slot.date, criteria.earliestDate, criteria.latestDate)
  );
}

export function hasMatchingSlots(
  slots: AppointmentSlot[] | undefined,
  criteria: Pick<AppointmentCriteria, "earliestDate" | "latestDate">
): boolean {
  if (!slots || slots.length === 0) return false;
  return filterSlotsByRange(slots, criteria).length > 0;
}

export function matchSlots(
  slots: AppointmentSlot[] | undefined,
  criteria: Pick<AppointmentCriteria, "earliestDate" | "latestDate">
): MatchResult {
  const allSlots = slots ?? [];
  const matchedSlots = filterSlotsByRange(allSlots, criteria);
  return { matched: matchedSlots.length > 0, matchedSlots, allSlots };
}

export function sortSlotsByDate(slots: AppointmentSlot[]): AppointmentSlot[] {
  return [...slots].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}
