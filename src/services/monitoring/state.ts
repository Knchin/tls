import type { MonitoringStatus } from "@/types";

export type StatusTransition = {
  from: MonitoringStatus;
  to: MonitoringStatus;
};

export const ALLOWED_TRANSITIONS: StatusTransition[] = [
  { from: "ACTIVE", to: "PAUSED" },
  { from: "ACTIVE", to: "DISABLED" },
  { from: "ACTIVE", to: "MATCH_FOUND" },
  { from: "ACTIVE", to: "ERROR" },
  { from: "PAUSED", to: "ACTIVE" },
  { from: "PAUSED", to: "DISABLED" },
  { from: "MATCH_FOUND", to: "ACTIVE" },
  { from: "MATCH_FOUND", to: "DISABLED" },
  { from: "MATCH_FOUND", to: "PAUSED" },
  { from: "ERROR", to: "ACTIVE" },
  { from: "ERROR", to: "PAUSED" },
  { from: "ERROR", to: "DISABLED" },
];

export type TransitionError = {
  code: "INVALID_TRANSITION";
  message: string;
};

export function canTransition(from: MonitoringStatus, to: MonitoringStatus): boolean {
  return ALLOWED_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function assertTransition(from: MonitoringStatus, to: MonitoringStatus): void {
  if (!canTransition(from, to)) {
    throw Object.assign(new Error(`Invalid status transition: ${from} -> ${to}`), {
      code: "INVALID_TRANSITION",
    }) as Error & TransitionError;
  }
}

export function applyTransition(from: MonitoringStatus, to: MonitoringStatus): MonitoringStatus {
  assertTransition(from, to);
  return to;
}

export function isTerminalStatus(status: MonitoringStatus): boolean {
  return status === "DISABLED";
}

export function isActiveStatus(status: MonitoringStatus): boolean {
  return status === "ACTIVE";
}
