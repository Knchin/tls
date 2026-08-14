import { afterEach, describe, expect, it } from "vitest";

import { MockProvider } from "@/services/providers/mock";
import { OfficialTLSProvider } from "@/services/providers/official";
import { createProvider } from "@/services/providers";
import type { AppointmentCriteria } from "@/types";

const criteria: AppointmentCriteria = {
  country: "TN",
  centre: "TUNIS",
  visaCategory: "TOURIST_SHORT_STAY",
  earliestDate: "2026-09-01",
  latestDate: "2026-09-30",
};

afterEach(() => {
  delete process.env.TLS_PROVIDER;
  delete process.env.MOCK_PROVIDER_MODE;
  delete process.env.TLS_OFFICIAL_PROVIDER_CONFIGURED;
});

describe("MockProvider", () => {
  it("reports not available with no slots in never mode", async () => {
    const provider = new MockProvider({ mode: "never_available" });
    const result = await provider.checkAvailability(criteria);
    expect(result.sourceStatus).toBe("NOT_AVAILABLE");
    expect(result.available).toBe(false);
    expect(result.slots).toEqual([]);
  });

  it("reports available slots within the preferred window", async () => {
    const provider = new MockProvider({ mode: "always_available" });
    const result = await provider.checkAvailability(criteria);
    expect(result.sourceStatus).toBe("AVAILABLE");
    expect(result.available).toBe(true);
    for (const slot of result.slots ?? []) {
      expect(slot.date >= criteria.earliestDate!).toBe(true);
      expect(slot.date <= criteria.latestDate!).toBe(true);
    }
  });

  it("is deterministic for identical criteria in realistic mode", async () => {
    const a = new MockProvider();
    const b = new MockProvider();
    const ra = await a.checkAvailability(criteria);
    const rb = await b.checkAvailability(criteria);
    expect(JSON.stringify(ra.slots)).toBe(JSON.stringify(rb.slots));
  });

  it("simulates intermittent failures", async () => {
    const provider = new MockProvider({
      failureEveryNChecks: 3,
      minIntervalBetweenChecksMs: 0,
    });
    const results: string[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        await provider.checkAvailability(criteria);
        results.push("ok");
      } catch {
        results.push("error");
      }
    }
    expect(results).toEqual(["ok", "ok", "error"]);
  });

  it("abides by its minimum interval between checks", async () => {
    const provider = new MockProvider({ minIntervalBetweenChecksMs: 60_000 });
    await provider.checkAvailability(criteria);
    await expect(provider.checkAvailability(criteria)).rejects.toThrow();
  });
});

describe("OfficialTLSProvider stub", () => {
  it("never contacts an external system and fails with a clear message", async () => {
    const provider = new OfficialTLSProvider();
    await expect(provider.checkAvailability(criteria)).rejects.toThrowError(
      /officially permitted availability API/i
    );
  });

  it("remains a no-op even when the configured flag is set", async () => {
    process.env.TLS_OFFICIAL_PROVIDER_CONFIGURED = "true";
    const provider = new OfficialTLSProvider();
    await expect(provider.checkAvailability(criteria)).rejects.toThrowError(
      /no external request was made/i
    );
  });
});

describe("createProvider factory", () => {
  it("selects the provider from environment", () => {
    process.env.TLS_PROVIDER = "mock";
    expect(createProvider().name).toBe("mock");
    process.env.TLS_PROVIDER = "official";
    expect(createProvider().name).toBe("official");
    process.env.TLS_PROVIDER = "unknown-value";
    expect(createProvider().name).toBe("mock");
  });
});
