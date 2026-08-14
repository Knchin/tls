import { describe, expect, it } from "vitest";

import {
  assertOwned,
  isOwner,
  userFacingMessage,
} from "@/lib/authorization";

describe("authorization helpers", () => {
  describe("assertOwned", () => {
    it("passes when the user owns the resource", () => {
      expect(() => assertOwned("user-1", "user-1")).not.toThrow();
    });

    it("throws when the resource belongs to another user", () => {
      expect(() => assertOwned("user-1", "user-2")).toThrowError(/do not have access/);
    });

    it("throws when no user is present", () => {
      expect(() => assertOwned(undefined, "user-2")).toThrowError(/do not have access/);
    });

    it("throws with the UNAUTHORIZED code", () => {
      try {
        assertOwned("user-1", "user-2");
      } catch (error) {
        expect((error as { code: string }).code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("isOwner", () => {
    it("returns true only for the matching owner", () => {
      expect(isOwner("user-1", "user-1")).toBe(true);
      expect(isOwner("user-1", "user-2")).toBe(false);
      expect(isOwner(null, "user-2")).toBe(false);
    });
  });

  describe("userFacingMessage", () => {
    it("maps provider errors to user-friendly text without exposing internals", () => {
      expect(userFacingMessage({ code: "RATE_LIMITED" })).not.toContain("429");
      expect(userFacingMessage({ code: "RATE_LIMITED" })).toContain("retry automatically");
    });

    it("falls back to a generic message", () => {
      expect(userFacingMessage({ code: "INTERNAL_ERROR" })).toContain("unexpected error");
    });
  });
});
