import type { AppointmentCriteria, AppointmentSlot } from "@/types";
import { addDays, todayISO } from "@/utils/dates";

export type MockProviderMode = "realistic" | "always_available" | "never_available";

export type MockProviderConfig = {
  mode?: MockProviderMode;
  availableDaysOfWeek?: number[];
  failureEveryNChecks?: number;
  minIntervalBetweenChecksMs?: number;
  today?: () => string;
};

const DEFAULT_AVAILABLE_DAYS = [1, 3, 5];

const DEFAULT_MIN_INTERVAL_MS = 60_000;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class MockProvider {
  readonly name = "mock" as const;
  private readonly config: MockProviderConfig;
  private readonly failureCounter = new Map<string, number>();
  private readonly lastCheckAt = new Map<string, number>();

  constructor(config: MockProviderConfig = {}) {
    this.config = config;
  }

  private signature(criteria: AppointmentCriteria): string {
    return [criteria.country, criteria.centre, criteria.visaCategory].join("|");
  }

  private assertNotRateLimited(criteria: AppointmentCriteria): void {
    const now = Date.now();
    const sig = this.signature(criteria);
    const last = this.lastCheckAt.get(sig);
    const minInterval = this.config.minIntervalBetweenChecksMs ?? DEFAULT_MIN_INTERVAL_MS;
    if (last !== undefined && now - last < minInterval) {
      throw Object.assign(new Error("Rate limit simulated"), {
        isRateLimited: true,
      });
    }
    this.lastCheckAt.set(sig, now);
  }

  private shouldFail(criteria: AppointmentCriteria): boolean {
    const every = this.config.failureEveryNChecks;
    if (!every || every <= 0) return false;
    const sig = this.signature(criteria);
    const count = (this.failureCounter.get(sig) ?? 0) + 1;
    this.failureCounter.set(sig, count);
    return count % every === 0;
  }

  private generateSlots(criteria: AppointmentCriteria): AppointmentSlot[] {
    const mode = this.config.mode ?? "realistic";
    if (mode === "never_available") return [];

    const availableDays = this.config.availableDaysOfWeek ?? DEFAULT_AVAILABLE_DAYS;
    const today = (this.config.today ?? todayISO)();
    const start = criteria.earliestDate ?? addDays(today, 7);
    const end = criteria.latestDate ?? addDays(start, 60);

    if (mode === "always_available") {
      const slots: AppointmentSlot[] = [];
      let cursor = start;
      let guard = 0;
      while (compare(cursor, end) <= 0 && guard < 120) {
        const day = new Date(`${cursor}T00:00:00Z`).getUTCDay();
        if (availableDays.includes(day)) {
          slots.push({ date: cursor, time: "10:30" });
        }
        cursor = addDays(cursor, 1);
        guard++;
      }
      return slots;
    }

    const slots: AppointmentSlot[] = [];
    const seed = hashString(this.signature(criteria));
    let cursor = start;
    let guard = 0;
    while (compare(cursor, end) <= 0 && guard < 120) {
      const day = new Date(`${cursor}T00:00:00Z`).getUTCDay();
      if (availableDays.includes(day)) {
        const h = (seed + cursor.split("-").join("").charCodeAt(0)) % 10;
        if (h < 3) {
          slots.push({ date: cursor, time: h % 2 === 0 ? "09:30" : "14:00" });
        }
      }
      cursor = addDays(cursor, 1);
      guard++;
    }
    return slots;
  }

  async checkAvailability(
    criteria: AppointmentCriteria,
    options: { signal?: AbortSignal } = {}
  ): Promise<import("@/types").AvailabilityResult> {
    this.assertNotRateLimited(criteria);

    if (this.shouldFail(criteria)) {
      throw new Error("Simulated temporary provider failure");
    }

    if (options.signal?.aborted) {
      throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    }

    const checkedAt = new Date().toISOString();
    const slots = this.generateSlots(criteria);
    const available = slots.length > 0;

    return {
      available,
      checkedAt,
      slots,
      sourceStatus: available ? "AVAILABLE" : "NOT_AVAILABLE",
    };
  }
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
