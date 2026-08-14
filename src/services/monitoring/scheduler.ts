import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";
import { runCheckForRequest, type RunOutcome } from "@/services/monitoring/runner";
import type { AppointmentAvailabilityProvider } from "@/services/providers/types";

const MAX_BACKOFF_POWER = 4;

export function effectiveBackoffMinutes(request: {
  check_interval_minutes: number;
  consecutive_errors: number;
}): number {
  const power = Math.min(request.consecutive_errors, MAX_BACKOFF_POWER);
  return request.check_interval_minutes * Math.pow(2, power);
}

export function isDue(request: {
  status: string;
  last_checked_at: string | null;
  check_interval_minutes: number;
  consecutive_errors: number;
  now?: Date;
}): boolean {
  if (request.status !== "ACTIVE") return false;
  if (!request.last_checked_at) return true;

  const intervalMs = effectiveBackoffMinutes(request) * 60_000;
  const dueAt = new Date(new Date(request.last_checked_at).getTime() + intervalMs);
  return dueAt.getTime() <= (request.now ?? new Date()).getTime();
}

export async function findDueRequests(limit = 25): Promise<
  {
    id: string;
    check_interval_minutes: number;
    consecutive_errors: number;
    last_checked_at: string | null;
  }[]
> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("monitoring_requests")
    .select("id, status, check_interval_minutes, consecutive_errors, last_checked_at")
    .eq("status", "ACTIVE")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(100);

  if (error) {
    logger.error("scheduler_find_due_failed", { error: error.message });
    return [];
  }

  const now = new Date();
  return (data ?? [])
    .filter((request) => isDue({ ...request, now }))
    .slice(0, limit);
}

export type ProcessingSummary = {
  totalDue: number;
  processed: number;
  outcomes: Record<RunOutcome, number>;
  stoppedByTimeBudget: boolean;
};

export async function processDueRequests(options: {
  limit?: number;
  timeBudgetMs?: number;
  provider?: AppointmentAvailabilityProvider;
} = {}): Promise<ProcessingSummary> {
  const limit = options.limit ?? 25;
  const timeBudgetMs = options.timeBudgetMs ?? 45_000;
  const deadline = Date.now() + timeBudgetMs;

  const due = await findDueRequests(limit);
  const outcomes = Object.create(null) as Record<RunOutcome, number>;
  let processed = 0;
  let stoppedByTimeBudget = false;

  for (const request of due) {
    if (Date.now() >= deadline) {
      stoppedByTimeBudget = true;
      break;
    }

    const result = await runCheckForRequest(request.id, { provider: options.provider });
    outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
    processed += 1;
  }

  logger.info("scheduler_batch_completed", {
    totalDue: due.length,
    processed,
    stoppedByTimeBudget,
    outcomes,
  });

  return {
    totalDue: due.length,
    processed,
    outcomes,
    stoppedByTimeBudget,
  };
}
