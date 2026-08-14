import { describe, expect, it } from "vitest";

import {
  monitoringCreateSchema,
  monitoringUpdateSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

describe("validation", () => {
  describe("signUpSchema", () => {
    it("accepts a valid signup", () => {
      const result = signUpSchema.safeParse({
        email: "user@example.com",
        password: "strong-password",
        confirmPassword: "strong-password",
        fullName: "Ada",
      });
      expect(result.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const result = signUpSchema.safeParse({
        email: "user@example.com",
        password: "strong-password",
        confirmPassword: "different",
        fullName: "Ada",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short passwords", () => {
      const result = signUpSchema.safeParse({
        email: "user@example.com",
        password: "short",
        confirmPassword: "short",
        fullName: "Ada",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid emails", () => {
      const result = signUpSchema.safeParse({
        email: "not-an-email",
        password: "strong-password",
        confirmPassword: "strong-password",
        fullName: "Ada",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signInSchema", () => {
    it("rejects empty password", () => {
      expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("rejects mismatched confirmation", () => {
      const result = resetPasswordSchema.safeParse({
        password: "new-password",
        confirmPassword: "other",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("monitoringCreateSchema", () => {
    const valid = {
      country: "TN",
      destination: "FR",
      centre: "TUNIS",
      visaCategory: "TOURIST_SHORT_STAY",
      earliestDate: "2026-09-01",
      latestDate: "2026-09-30",
      checkIntervalMinutes: 5,
    };

    it("accepts valid criteria", () => {
      expect(monitoringCreateSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects reversed date ranges", () => {
      const bad = { ...valid, earliestDate: "2026-10-01", latestDate: "2026-09-01" };
      const result = monitoringCreateSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it("rejects intervals below the minimum", () => {
      expect(
        monitoringCreateSchema.safeParse({ ...valid, checkIntervalMinutes: 1 }).success
      ).toBe(false);
    });

    it("rejects invalid dates", () => {
      expect(
        monitoringCreateSchema.safeParse({ ...valid, earliestDate: "01/09/2026" }).success
      ).toBe(false);
    });

    it("allows an empty preferred window", () => {
      const result = monitoringCreateSchema.safeParse({
        ...valid,
        earliestDate: null,
        latestDate: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("monitoringUpdateSchema", () => {
    it("accepts partial updates", () => {
      expect(monitoringUpdateSchema.safeParse({ centre: "SFAX" }).success).toBe(true);
      expect(monitoringUpdateSchema.safeParse({ checkIntervalMinutes: 10 }).success).toBe(true);
    });

    it("rejects reversed ranges on update", () => {
      expect(
        monitoringUpdateSchema.safeParse({ earliestDate: "2026-12-01", latestDate: "2026-01-01" })
          .success
      ).toBe(false);
    });
  });
});
