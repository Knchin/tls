import { describe, expect, it } from "vitest";

import {
  addDays,
  compareDates,
  isDateInRange,
  isValidDateString,
  toISODate,
} from "@/utils/dates";

describe("dates", () => {
  describe("isValidDateString", () => {
    it("accepts valid ISO dates", () => {
      expect(isValidDateString("2026-09-01")).toBe(true);
      expect(isValidDateString("2024-02-29")).toBe(true);
    });

    it("rejects malformed dates", () => {
      expect(isValidDateString("2026-13-01")).toBe(false);
      expect(isValidDateString("2026-00-10")).toBe(false);
      expect(isValidDateString("2026-04-31")).toBe(false);
      expect(isValidDateString("20260901")).toBe(false);
      expect(isValidDateString("")).toBe(false);
      expect(isValidDateString("not-a-date")).toBe(false);
    });
  });

  describe("isDateInRange", () => {
    it("returns true when no range is given", () => {
      expect(isDateInRange("2026-09-15")).toBe(true);
    });

    it("respects the earliest bound inclusively", () => {
      expect(isDateInRange("2026-09-15", "2026-09-01", null)).toBe(true);
      expect(isDateInRange("2026-09-01", "2026-09-01", null)).toBe(true);
      expect(isDateInRange("2026-08-31", "2026-09-01", null)).toBe(false);
    });

    it("respects the latest bound inclusively", () => {
      expect(isDateInRange("2026-09-15", null, "2026-09-30")).toBe(true);
      expect(isDateInRange("2026-09-30", null, "2026-09-30")).toBe(true);
      expect(isDateInRange("2026-10-01", null, "2026-09-30")).toBe(false);
    });

    it("requires both bounds", () => {
      expect(isDateInRange("2026-09-15", "2026-09-01", "2026-09-30")).toBe(true);
      expect(isDateInRange("2026-08-01", "2026-09-01", "2026-09-30")).toBe(false);
      expect(isDateInRange("2026-10-01", "2026-09-01", "2026-09-30")).toBe(false);
    });
  });

  describe("compareDates", () => {
    it("orders dates correctly", () => {
      expect(compareDates("2026-09-01", "2026-09-02")).toBe(-1);
      expect(compareDates("2026-09-02", "2026-09-01")).toBe(1);
      expect(compareDates("2026-09-01", "2026-09-01")).toBe(0);
    });
  });

  describe("addDays", () => {
    it("adds and subtracts days", () => {
      expect(addDays("2026-09-01", 7)).toBe("2026-09-08");
      expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
      expect(addDays("2026-01-01", 31)).toBe("2026-02-01");
    });
  });

  describe("toISODate", () => {
    it("formats a date in UTC", () => {
      expect(toISODate(new Date(Date.UTC(2026, 8, 1)))).toBe("2026-09-01");
    });
  });
});
