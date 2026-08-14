import type { AppointmentAvailabilityProvider } from "@/services/providers/types";
import { MockProvider, type MockProviderConfig } from "@/services/providers/mock";
import { OfficialTLSProvider } from "@/services/providers/official";

export type ProviderSelection = "mock" | "official";

export function getConfiguredProvider(): ProviderSelection {
  const value = (process.env.TLS_PROVIDER ?? "mock").toLowerCase();
  return value === "official" ? "official" : "mock";
}

export function createProvider(selection?: ProviderSelection): AppointmentAvailabilityProvider {
  const provider = selection ?? getConfiguredProvider();

  switch (provider) {
    case "official":
      return new OfficialTLSProvider();
    case "mock":
      return createMockProviderFromEnv();
  }
}

function createMockProviderFromEnv(): MockProvider {
  const mode = (process.env.MOCK_PROVIDER_MODE ?? "realistic").toLowerCase();
  const config: MockProviderConfig = {};

  if (mode === "always_available") config.mode = "always_available";
  else if (mode === "never_available") config.mode = "never_available";
  else config.mode = "realistic";

  const every = Number.parseInt(process.env.MOCK_PROVIDER_FAIL_EVERY ?? "", 10);
  if (Number.isInteger(every) && every > 0) config.failureEveryNChecks = every;

  const minInterval = Number.parseInt(
    process.env.MOCK_PROVIDER_MIN_INTERVAL_MS ?? "",
    10
  );
  if (Number.isInteger(minInterval) && minInterval > 0) {
    config.minIntervalBetweenChecksMs = minInterval;
  }

  return new MockProvider(config);
}
