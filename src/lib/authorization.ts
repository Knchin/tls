import type { CheckErrorCode, MonitoringStatus } from "@/types";

export type UnauthorizedError = {
  code: "UNAUTHORIZED";
  message: string;
};

export function assertOwned(userId: string | undefined | null, ownerId: string): void {
  if (!userId || userId !== ownerId) {
    throw Object.assign(new Error("You do not have access to this resource."), {
      code: "UNAUTHORIZED",
    }) as Error & UnauthorizedError;
  }
}

export function isOwner(userId: string | undefined | null, ownerId: string): boolean {
  return Boolean(userId) && userId === ownerId;
}

export function isAdmin(userId: string | undefined | null): boolean {
  return typeof userId === "string" && userId.length > 0;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export const CHECK_ERROR_MESSAGES: Record<CheckErrorCode, string> = {
  PROVIDER_NOT_CONFIGURED:
    "Availability checking is not yet connected to the appointment provider. No external system was contacted.",
  PROVIDER_UNAVAILABLE:
    "The appointment provider could not be reached right now. We'll retry automatically.",
  RATE_LIMITED:
    "Availability checking is temporarily paused because the appointment provider is limiting requests. We'll retry automatically.",
  NETWORK_TIMEOUT:
    "The appointment provider took too long to respond. We'll retry automatically.",
  AUTH_REQUIRED:
    "The appointment provider requires an account session to check availability. No booking or session access is performed by TLS RADAR.",
  INVALID_CRITERIA:
    "The selected monitoring criteria could not be checked. Review your selection and try again.",
  INTERNAL_ERROR: "An unexpected error occurred while checking availability. We'll retry.",
};

export function userFacingMessage(error: {
  code: CheckErrorCode;
  message?: string;
}): string {
  return CHECK_ERROR_MESSAGES[error.code] ?? error.message ?? CHECK_ERROR_MESSAGES.INTERNAL_ERROR;
}

export function statusToUserLabel(status: MonitoringStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Monitoring";
    case "PAUSED":
      return "Paused";
    case "MATCH_FOUND":
      return "Match found";
    case "ERROR":
      return "Error";
    case "DISABLED":
      return "Disabled";
  }
}
