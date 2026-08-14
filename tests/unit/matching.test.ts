import { describe, expect, it } from "vitest";

import {
  filterSlotsByRange,
  hasMatchingSlots,
  matchSlots,
  sortSlotsByDate,
} from "@/services/matching";

const slots = [
  { date: "2026-08-25", time: "09:00" },
  { date: "2026-09-10", time: "10:30" },
  { date: "2026-09-15", time: "11:00" },
  { date: "2026-10-05", time: "14:00" },
];

describe("matching", () => {
  describe("filterSlotsByRange", () => {
    it("returns all slots when no preferred range is set", () => {
      expect(filterSlotsByRange(slots, {})).toHaveLength(4);
    });

    it("filters slots inside the preferred window", () => {
      const filtered = filterSlotsByRange(slots, {
        earliestDate: "2026-09-01",
        latestDate: "2026-09-30",
      });
      expect(filtered.map((s) => s.date)).toEqual(["2026-09-10", "2026-09-15"]);
    });

    it("handles only an earliest bound", () => {
      const filtered = filterSlotsByRange(slots, { earliestDate: "2026-09-01" });
      expect(filtered).toHaveLength(3);
    });

    it("handles only a latest bound", () => {
      const filtered = filterSlotsByRange(slots, { latestDate: "2026-09-30" });
      expect(filtered).toHaveLength(3);
    });
  });

  describe("hasMatchingSlots", () => {
    it("is false when there are no slots", () => {
      expect(hasMatchingSlots(undefined, {})).toBe(false);
      expect(hasMatchingSlots([], {})).toBe(false);
    });

    it("is false when slots are outside the preferred window", () => {
      expect(
        hasMatchingSlots(slots, { earliestDate: "2026-11-01", latestDate: "2026-12-01" })
      ).toBe(false);
    });

    it("is true when a slot falls in the window", () => {
      expect(
        hasMatchingSlots(slots, { earliestDate: "2026-09-01", latestDate: "2026-09-30" })
      ).toBe(true);
    });
  });

  describe("matchSlots", () => {
    it("returns matched and unmatched slots", () => {
      const result = matchSlots(slots, { earliestDate: "2026-09-01", latestDate: "2026-09-30" });
      expect(result.matched).toBe(true);
      expect(result.matchedSlots).toHaveLength(2);
      expect(result.allSlots).toHaveLength(4);
    });

    it("treats missing slots as no match", () => {
      const result = matchSlots(undefined, {});
      expect(result.matched).toBe(false);
      expect(result.matchedSlots).toEqual([]);
    });
  });

  describe("sortSlotsByDate", () => {
    it("sorts by date then time without mutating input", () => {
      const shuffled = [
        { date: "2026-10-05", time: "14:00" },
        { date: "2026-09-10", time: "10:30" },
      ];
      const sorted = sortSlotsByDate(shuffled);
      expect(sorted[0].date).toBe("2026-09-10");
      expect(shuffled[0].date).toBe("2026-10-05");
    });
  });
});
