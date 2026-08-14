import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  requests: new Map<string, Record<string, unknown>>(),
  checks: [] as Record<string, unknown>[],
  slots: [] as Record<string, unknown>[],
  notifications: [] as Record<string, unknown>[],
  prefs: { email_enabled: true, push_enabled: false },
};

const { adminClient } = vi.hoisted(() => ({
  adminClient: { from: vi.fn() as (table: string) => unknown },
}));

vi.mock("@/lib/supabase/admin", () => {
  return {
    createAdminClient: vi.fn(() => adminClient),
  };
});

import { runCheckForRequest } from "@/services/monitoring/runner";
import { MockProvider } from "@/services/providers/mock";
import { ProviderError } from "@/services/providers/types";

type Q = Record<string, unknown>;

function monitoringRequestTable() {
  return {
    select: (cols: string) => {
      if (cols === "consecutive_errors") {
        return {
          eq: () => ({
            maybeSingle: async () => ({
              data: { consecutive_errors: 0 },
              error: null,
            }),
          }),
        };
      }
      return {
        eq: () => ({
          maybeSingle: async () => ({ data: state.requests.get("req-1") ?? null, error: null }),
        }),
      };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  } as unknown as Q;
}

function availabilityCheckTable() {
  return {
    insert: (payload: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          state.checks.push({
            ...payload,
            checked_at: new Date().toISOString(),
            id: `check-${state.checks.length + 1}`,
          });
          return { data: { id: `check-${state.checks.length}` }, error: null };
        },
      }),
    }),
  } as unknown as Q;
}

function notificationsTable() {
  return {
    insert: (payload: Record<string, unknown>) => {
      state.notifications.push({ ...payload, id: `notif-${state.notifications.length + 1}` });
      return Promise.resolve({ error: null });
    },
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => {
                    const last = [...state.notifications]
                      .reverse()
                      .find((n) => n.type === "APPOINTMENT_AVAILABLE" && n.result_hash);
                    return last
                      ? { data: { result_hash: last.result_hash, sent_at: last.sent_at }, error: null }
                      : { data: null, error: null };
                  },
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as Q;
}

function baseMock() {
  return (table: string) => {
    switch (table) {
      case "monitoring_requests":
        return monitoringRequestTable();
      case "availability_checks":
        return availabilityCheckTable();
      case "appointment_slots":
        return { insert: async () => ({ error: null }) } as unknown as Q;
      case "notification_preferences":
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: state.prefs, error: null }) }),
          }),
        } as unknown as Q;
      case "notifications":
        return notificationsTable();
      default:
        throw new Error(`unexpected table ${table}`);
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.requests.clear();
  state.checks = [];
  state.slots = [];
  state.notifications = [];
  state.prefs = { email_enabled: true, push_enabled: false };

  state.requests.set("req-1", {
    id: "req-1",
    user_id: "user-1",
    country: "TN",
    destination: "FR",
    centre: "TUNIS",
    visa_category: "FR_TOURIST_SHORT_STAY",
    earliest_date: "2026-09-01",
    latest_date: "2026-09-30",
    status: "ACTIVE",
    check_interval_minutes: 5,
    last_checked_at: null,
    last_available_at: null,
    last_error_code: null,
    consecutive_errors: 0,
  });
});

describe("monitoring runner", () => {
  it("skips requests that are not active", async () => {
    state.requests.set("req-1", { ...state.requests.get("req-1")!, status: "PAUSED" });
    adminClient.from = vi.fn(baseMock()) as never;

    const result = await runCheckForRequest("req-1", {
      provider: new MockProvider({ mode: "always_available", minIntervalBetweenChecksMs: 0 }),
    });
    expect(result.outcome).toBe("SKIPPED");
  });

  it("reports no match when nothing is available", async () => {
    adminClient.from = vi.fn(baseMock()) as never;

    const result = await runCheckForRequest("req-1", {
      provider: new MockProvider({ mode: "never_available", minIntervalBetweenChecksMs: 0 }),
    });
    expect(result.outcome).toBe("CHECKED_NO_MATCH");
    expect(result.available).toBe(false);
    expect(state.checks.length).toBe(1);
  });

  it("notifies when a matching slot appears and transitions to MATCH_FOUND", async () => {
    adminClient.from = vi.fn(baseMock()) as never;

    const result = await runCheckForRequest("req-1", {
      provider: new MockProvider({ mode: "always_available", minIntervalBetweenChecksMs: 0 }),
    });
    expect(result.outcome).toBe("CHECKED_MATCH_NOTIFIED");
    expect(result.available).toBe(true);
    expect(state.checks.length).toBe(1);
    expect(state.checks[0].available).toBe(true);
  });

  it("does not re-notify for the same availability event (dedupe)", async () => {
    adminClient.from = vi.fn(baseMock()) as never;

    const provider = new MockProvider({ mode: "always_available", minIntervalBetweenChecksMs: 0 });

    const first = await runCheckForRequest("req-1", { provider });
    expect(first.outcome).toBe("CHECKED_MATCH_NOTIFIED");

    const second = await runCheckForRequest("req-1", { provider });
    expect(second.outcome).toBe("CHECKED_MATCH_ALREADY_NOTIFIED");
    expect(state.checks.length).toBe(2);
  });

  it("marks a request fatal when the provider is not configured", async () => {
    adminClient.from = vi.fn(baseMock()) as never;

    const provider = {
      name: "official" as const,
      checkAvailability: async () => {
        throw new ProviderError("PROVIDER_NOT_CONFIGURED", "not configured", {
          retryable: false,
        });
      },
    };
    const result = await runCheckForRequest("req-1", { provider });
    expect(result.outcome).toBe("PROVIDER_ERROR_FATAL");
    expect(result.errorCode).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("keeps the request active on retryable provider errors", async () => {
    adminClient.from = vi.fn(baseMock()) as never;

    const provider = {
      name: "mock" as const,
      checkAvailability: async () => {
        throw new Error("network down");
      },
    };
    const result = await runCheckForRequest("req-1", { provider });
    expect(result.outcome).toBe("PROVIDER_ERROR_RETRYABLE");
    expect(result.errorCode).toBe("PROVIDER_UNAVAILABLE");
  });
});
