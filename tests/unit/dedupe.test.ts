import { describe, expect, it } from "vitest";

import {
  createResultHash,
  createSlotsSignature,
  DEFAULT_DEDUPE_WINDOW_MS,
  shouldSendNotification,
} from "@/services/dedupe";

const base = new Date("2026-09-01T10:00:00Z");

describe("dedupe", () => {
  describe("createSlotsSignature", () => {
    it("is order-independent", () => {
      const a = createSlotsSignature([
        { date: "2026-09-10", time: "10:30" },
        { date: "2026-09-15", time: "11:00" },
      ]);
      const b = createSlotsSignature([
        { date: "2026-09-15", time: "11:00" },
        { date: "2026-09-10", time: "10:30" },
      ]);
      expect(a).toBe(b);
    });

    it("distinguishes slot sets", () => {
      const a = createSlotsSignature([{ date: "2026-09-10" }]);
      const b = createSlotsSignature([{ date: "2026-09-11" }]);
      expect(a).not.toBe(b);
    });
  });

  describe("createResultHash", () => {
    it("is stable for identical inputs", () => {
      const input = {
        source: "mock",
        status: "AVAILABLE",
        available: true,
        matchedSlots: [{ date: "2026-09-10", time: "10:30" }],
      };
      expect(createResultHash(input)).toBe(createResultHash(input));
    });

    it("changes when the matched slots change", () => {
      const baseInput = {
        source: "mock",
        status: "AVAILABLE",
        available: true,
        matchedSlots: [{ date: "2026-09-10", time: "10:30" }],
      };
      const changed = createResultHash({
        ...baseInput,
        matchedSlots: [{ date: "2026-09-12", time: "10:30" }],
      });
      expect(changed).not.toBe(createResultHash(baseInput));
    });

    it("produces 64 hex characters", () => {
      const hash = createResultHash({
        source: "mock",
        status: "AVAILABLE",
        available: true,
        matchedSlots: [],
      });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("shouldSendNotification", () => {
    it("always sends when nothing was notified yet", () => {
      expect(shouldSendNotification("abc", { lastNotifiedHash: null, lastNotifiedAt: null })).toBe(
        true
      );
    });

    it("does not re-send for the same hash within the dedupe window", () => {
      expect(
        shouldSendNotification("abc", {
          lastNotifiedHash: "abc",
          lastNotifiedAt: new Date(base.getTime() + 60_000).toISOString(),
        })
      ).toBe(false);
    });

    it("sends again when the hash changes", () => {
      expect(
        shouldSendNotification("xyz", {
          lastNotifiedHash: "abc",
          lastNotifiedAt: new Date(base.getTime() + 60_000).toISOString(),
        })
      ).toBe(true);
    });

    it("sends again after the dedupe window has elapsed", () => {
      const afterWindow = new Date(base.getTime() + DEFAULT_DEDUPE_WINDOW_MS + 1000).toISOString();
      expect(
        shouldSendNotification("abc", {
          lastNotifiedHash: "abc",
          lastNotifiedAt: base.toISOString(),
        }, afterWindow)
      ).toBe(true);
    });
  });
});
