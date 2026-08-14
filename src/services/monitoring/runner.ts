import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";
import type { AppointmentAvailabilityProvider } from "@/services/providers/types";
import { ProviderError } from "@/services/providers/types";
import { createProvider } from "@/services/providers";
import { matchSlots, sortSlotsByDate } from "@/services/matching";
import { createResultHash, shouldSendNotification, DEFAULT_DEDUPE_WINDOW_MS } from "@/services/dedupe";
import { NotificationService, getLastAvailabilityNotification } from "@/services/notifications/service";
import type { AppointmentCriteria, CheckErrorCode } from "@/types";
import type { Database } from "@/types/database";

type MonitoringRequestUpdate = Database["public"]["Tables"]["monitoring_requests"]["Update"];

export type RunOutcome =
  | "SKIPPED"
  | "NOT_FOUND"
  | "CHECKED_NO_MATCH"
  | "CHECKED_MATCH_NOTIFIED"
  | "CHECKED_MATCH_ALREADY_NOTIFIED"
  | "PROVIDER_ERROR_RETRYABLE"
  | "PROVIDER_ERROR_FATAL";

export type RunResult = {
  outcome: RunOutcome;
  requestId: string;
  available?: boolean;
  errorCode?: CheckErrorCode;
  responseTimeMs?: number;
  checkId?: string;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function buildCriteria(
  request: {
    country: string;
    centre: string;
    visa_category: string;
    earliest_date: string | null;
    latest_date: string | null;
  }
): AppointmentCriteria {
  return {
    country: request.country,
    centre: request.centre,
    visaCategory: request.visa_category,
    earliestDate: request.earliest_date ?? undefined,
    latestDate: request.latest_date ?? undefined,
  };
}

function errorToCode(error: unknown): CheckErrorCode {
  if (error instanceof ProviderError) return error.code;
  if (error instanceof DOMException && error.name === "TimeoutError") return "NETWORK_TIMEOUT";
  if (error instanceof Error && error.name === "TimeoutError") return "NETWORK_TIMEOUT";
  if (error instanceof Error && (error.message.includes("rate") || error.message.includes("429"))) {
    return "RATE_LIMITED";
  }
  if (error instanceof Error && error.message.includes("Abort")) return "NETWORK_TIMEOUT";
  return "PROVIDER_UNAVAILABLE";
}

export async function runCheckForRequest(
  requestId: string,
  options: { provider?: AppointmentAvailabilityProvider } = {}
): Promise<RunResult> {
  const admin = createAdminClient();
  const provider = options.provider ?? createProvider();

  const { data: request, error } = await admin
    .from("monitoring_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    logger.error("monitoring_request_load_failed", { requestId, error: error.message });
    return { outcome: "NOT_FOUND", requestId };
  }

  if (!request) {
    logger.warn("monitoring_request_not_found", { requestId });
    return { outcome: "NOT_FOUND", requestId };
  }

  if (request.status !== "ACTIVE") {
    logger.debug("monitoring_request_skipped_not_active", { requestId, status: request.status });
    return { outcome: "SKIPPED", requestId };
  }

  const criteria = buildCriteria(request);
  const startedAt = Date.now();

  try {
    const result = await provider.checkAvailability(criteria, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const responseTimeMs = Date.now() - startedAt;

    if (result.sourceStatus === "TEMPORARY_ERROR") {
      await recordCheck({
        admin,
        requestId,
        status: "TEMPORARY_ERROR",
        available: false,
        errorCode: "PROVIDER_UNAVAILABLE",
        responseTimeMs,
      });
      await updateRequestAfterFailure(admin, requestId, "PROVIDER_UNAVAILABLE");
      logger.warn("monitoring_check_temporary_error", { requestId, responseTimeMs });
      return { outcome: "PROVIDER_ERROR_RETRYABLE", requestId, responseTimeMs };
    }

    const { matched, matchedSlots } = matchSlots(result.slots, criteria);
    const sortedMatched = sortSlotsByDate(matchedSlots);
    const currentHash = createResultHash({
      source: provider.name,
      status: result.sourceStatus,
      available: result.available,
      matchedSlots: sortedMatched,
    });

    const checkRow = await recordCheck({
      admin,
      requestId,
      status: result.sourceStatus,
      available: result.available,
      resultHash: result.available ? currentHash : null,
      slots: sortedMatched,
      responseTimeMs,
    });

    await admin
      .from("monitoring_requests")
      .update({
        last_checked_at: new Date().toISOString(),
        last_error_code: null,
        consecutive_errors: 0,
        last_available_at: result.available ? new Date().toISOString() : undefined,
      })
      .eq("id", requestId);

    if (!result.available || !matched) {
      logger.info("monitoring_check_no_match", {
        requestId,
        available: result.available,
        matched,
        responseTimeMs,
      });
      return {
        outcome: "CHECKED_NO_MATCH",
        requestId,
        available: false,
        responseTimeMs,
        checkId: checkRow?.id,
      };
    }

    const last = await getLastAvailabilityNotification(requestId);
    const now = new Date().toISOString();
    const shouldNotify = shouldSendNotification(
      currentHash,
      { lastNotifiedHash: last?.resultHash ?? null, lastNotifiedAt: last?.sentAt ?? null },
      now,
      DEFAULT_DEDUPE_WINDOW_MS
    );

    if (shouldNotify) {
      const notificationService = new NotificationService();
      const officialUrl =
        process.env.TLS_OFFICIAL_BOOKING_URL ??
        "https://tlscontact.com";

      await notificationService.sendAvailabilityNotification({
        userId: request.user_id,
        monitoringRequestId: requestId,
        resultHash: currentHash,
        title: "Appointment available",
        message: `Matching availability detected for ${request.centre} (${request.destination}). Open the official booking page now.`,
        bookedUrl: officialUrl,
      });

      await admin
        .from("monitoring_requests")
        .update({
          status: "MATCH_FOUND",
          last_available_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      logger.info("monitoring_check_match_notified", {
        requestId,
        slots: sortedMatched.length,
        responseTimeMs,
      });
      return { outcome: "CHECKED_MATCH_NOTIFIED", requestId, available: true, responseTimeMs };
    }

    logger.info("monitoring_check_match_already_notified", { requestId, responseTimeMs });
    return {
      outcome: "CHECKED_MATCH_ALREADY_NOTIFIED",
      requestId,
      available: true,
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    const errorCode = errorToCode(error);
    const fatal = error instanceof ProviderError && !error.retryable;

    await recordCheck({
      admin,
      requestId,
      status: "TEMPORARY_ERROR",
      available: false,
      errorCode,
      responseTimeMs,
    });
    await updateRequestAfterFailure(admin, requestId, errorCode, fatal);

    logger.error("monitoring_check_failed", {
      requestId,
      errorCode,
      retryable: !fatal,
      responseTimeMs,
      error: error instanceof Error ? error.message : "unknown",
    });

    return {
      outcome: fatal ? "PROVIDER_ERROR_FATAL" : "PROVIDER_ERROR_RETRYABLE",
      requestId,
      errorCode,
      responseTimeMs,
    };
  }
}

type RecordCheckInput = {
  admin: ReturnType<typeof createAdminClient>;
  requestId: string;
  status: "AVAILABLE" | "NOT_AVAILABLE" | "TEMPORARY_ERROR";
  available: boolean;
  resultHash?: string | null;
  slots?: { date: string; time?: string }[];
  errorCode?: CheckErrorCode;
  responseTimeMs?: number;
};

async function recordCheck(input: RecordCheckInput): Promise<{ id?: string }> {
  const { data, error } = await input.admin
    .from("availability_checks")
    .insert({
      monitoring_request_id: input.requestId,
      status: input.status,
      available: input.available,
      result_hash: input.resultHash ?? null,
      error_code: input.errorCode ?? null,
      response_time_ms: input.responseTimeMs ?? null,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("availability_check_persist_failed", {
      requestId: input.requestId,
      error: error.message,
    });
    return {};
  }

  if (input.slots && input.slots.length > 0 && data) {
    const { error: slotError } = await input.admin.from("appointment_slots").insert(
      input.slots.map((slot) => ({
        availability_check_id: data.id,
        appointment_date: slot.date,
        appointment_time: slot.time ?? null,
      }))
    );
    if (slotError) {
      logger.error("appointment_slots_persist_failed", {
        requestId: input.requestId,
        error: slotError.message,
      });
    }
  }

  return { id: data?.id };
}

async function updateRequestAfterFailure(
  admin: ReturnType<typeof createAdminClient>,
  requestId: string,
  errorCode: CheckErrorCode,
  fatal = false
): Promise<void> {
  const patch: MonitoringRequestUpdate = {
    last_checked_at: new Date().toISOString(),
    last_error_code: errorCode,
  };

  const { data: current } = await admin
    .from("monitoring_requests")
    .select("consecutive_errors")
    .eq("id", requestId)
    .maybeSingle();

  patch.consecutive_errors = (current?.consecutive_errors ?? 0) + 1;

  if (fatal) {
    patch.status = "ERROR";
  }

  await admin.from("monitoring_requests").update(patch).eq("id", requestId);
}
