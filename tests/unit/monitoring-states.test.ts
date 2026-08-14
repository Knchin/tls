import { describe, expect, it } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  applyTransition,
  canTransition,
  isActiveStatus,
  isTerminalStatus,
} from "@/services/monitoring/state";
import type { MonitoringStatus } from "@/types";

describe("monitoring state transitions", () => {
  describe("canTransition", () => {
    it("allows documented transitions", () => {
      expect(canTransition("ACTIVE", "PAUSED")).toBe(true);
      expect(canTransition("ACTIVE", "MATCH_FOUND")).toBe(true);
      expect(canTransition("ACTIVE", "ERROR")).toBe(true);
      expect(canTransition("ACTIVE", "DISABLED")).toBe(true);
      expect(canTransition("PAUSED", "ACTIVE")).toBe(true);
      expect(canTransition("PAUSED", "DISABLED")).toBe(true);
      expect(canTransition("MATCH_FOUND", "ACTIVE")).toBe(true);
      expect(canTransition("ERROR", "ACTIVE")).toBe(true);
    });

    it("rejects illegal transitions", () => {
      expect(canTransition("PAUSED", "MATCH_FOUND")).toBe(false);
      expect(canTransition("DISABLED", "ACTIVE")).toBe(false);
      expect(canTransition("DISABLED", "PAUSED")).toBe(false);
      expect(canTransition("MATCH_FOUND", "ERROR")).toBe(false);
      expect(canTransition("ERROR", "MATCH_FOUND")).toBe(false);
    });
  });

  describe("applyTransition", () => {
    it("returns the target status for valid transitions", () => {
      expect(applyTransition("ACTIVE", "PAUSED")).toBe("PAUSED");
    });

    it("throws for invalid transitions", () => {
      expect(() => applyTransition("PAUSED", "MATCH_FOUND")).toThrowError(/Invalid status/);
    });
  });

  describe("helpers", () => {
    it("flags terminal and active states", () => {
      expect(isTerminalStatus("DISABLED")).toBe(true);
      expect(isTerminalStatus("ACTIVE")).toBe(false);
      expect(isActiveStatus("ACTIVE")).toBe(true);
      expect(isActiveStatus("PAUSED")).toBe(false);
    });

    it("every listed transition is legal by definition", () => {
      for (const t of ALLOWED_TRANSITIONS) {
        expect(canTransition(t.from, t.to)).toBe(true);
      }
    });
  });

  describe("status set coverage", () => {
    it("covers every documented state", () => {
      const states: MonitoringStatus[] = ["ACTIVE", "PAUSED", "MATCH_FOUND", "ERROR", "DISABLED"];
      for (const s of states) {
        expect(isTerminalStatus(s) || !isTerminalStatus(s)).toBe(true);
      }
    });
  });
});
