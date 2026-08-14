import { createHash } from "node:crypto";

import type { AppointmentSlot } from "@/types";

export const DEFAULT_DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;

export type NotificationDedupeState = {
  lastNotifiedHash: string | null;
  lastNotifiedAt: string | null;
};

export function normalizeSlot(slot: AppointmentSlot): string {
  return `${slot.date}|${slot.time ?? ""}`;
}

export function createSlotsSignature(slots: AppointmentSlot[]): string {
  const normalized = [...slots].map(normalizeSlot).sort();
  return normalized.join(",");
}

export function createResultHash(input: {
  source: string;
  status: string;
  available: boolean;
  matchedSlots: AppointmentSlot[];
}): string {
  const signature = createSlotsSignature(input.matchedSlots);
  return createHash("sha256")
    .update(
      [input.source, input.status, String(input.available), signature].join("::")
    )
    .digest("hex");
}

export function shouldSendNotification(
  currentHash: string,
  state: NotificationDedupeState,
  now: string = new Date().toISOString(),
  dedupeWindowMs: number = DEFAULT_DEDUPE_WINDOW_MS
): boolean {
  if (!state.lastNotifiedHash) return true;
  if (state.lastNotifiedHash !== currentHash) return true;
  if (!state.lastNotifiedAt) return true;

  const elapsed = new Date(now).getTime() - new Date(state.lastNotifiedAt).getTime();
  return elapsed > dedupeWindowMs;
}

export function hasUnconsumedAvailabilityNotification(records: {
  hasMatchFoundNotification: boolean;
}): boolean {
  return records.hasMatchFoundNotification;
}
