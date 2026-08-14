import { describe, expect, it } from "vitest";

import { effectiveBackoffMinutes, isDue } from "@/services/monitoring/scheduler";

const baseRequest = {
  status: "ACTIVE",
  check_interval_minutes: 5,
  consecutive_errors: 0,
  last_checked_at: null,
};

describe("scheduler", () => {
  describe("effectiveBackoffMinutes", () => {
    it("uses the base interval with no errors", () => {
      expect(effectiveBackoffMinutes({ check_interval_minutes: 5, consecutive_errors: 0 })).toBe(5);
    });

    it("doubles the interval on each consecutive error", () => {
      expect(effectiveBackoffMinutes({ check_interval_minutes: 5, consecutive_errors: 1 })).toBe(10);
      expect(effectiveBackoffMinutes({ check_interval_minutes: 5, consecutive_errors: 2 })).toBe(20);
      expect(effectiveBackoffMinutes({ check_interval_minutes: 5, consecutive_errors: 3 })).toBe(40);
    });

    it("caps the backoff power", () => {
      expect(effectiveBackoffMinutes({ check_interval_minutes: 5, consecutive_errors: 10 })).toBe(
        5 * Math.pow(2, 4)
      );
    });
  });

  describe("isDue", () => {
    const now = new Date("2026-09-01T12:00:00Z");

    it("is due when never checked", () => {
      expect(isDue({ ...baseRequest, now })).toBe(true);
    });

    it("is not due when checked recently", () => {
      expect(
        isDue({
          ...baseRequest,
          last_checked_at: "2026-09-01T11:59:30Z",
          now,
        })
      ).toBe(false);
    });

    it("is due when the interval has elapsed", () => {
      expect(
        isDue({
          ...baseRequest,
          last_checked_at: "2026-09-01T11:54:00Z",
          now,
        })
      ).toBe(true);
    });

    it("is never due when paused", () => {
      expect(
        isDue({
          ...baseRequest,
          status: "PAUSED",
          last_checked_at: "2026-08-01T00:00:00Z",
          now,
        })
      ).toBe(false);
    });

    it("respects backoff after errors", () => {
      expect(
        isDue({
          ...baseRequest,
          consecutive_errors: 1,
          last_checked_at: "2026-09-01T11:51:00Z",
          now,
        })
      ).toBe(false);
      expect(
        isDue({
          ...baseRequest,
          consecutive_errors: 1,
          last_checked_at: "2026-09-01T11:49:00Z",
          now,
        })
      ).toBe(true);
    });
  });
});
