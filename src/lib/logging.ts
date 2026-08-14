export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): LogLevel {
  const value = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return value in LEVEL_ORDER ? (value as LogLevel) : "info";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[configuredLevel()];
}

type LogContext = Record<string, unknown>;

function serialize(level: LogLevel, message: string, context?: LogContext): string {
  const entry: LogContext = {
    level,
    ts: new Date().toISOString(),
    msg: message,
    ...context,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog("debug")) console.debug(serialize("debug", message, context));
  },
  info(message: string, context?: LogContext) {
    if (shouldLog("info")) console.info(serialize("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    if (shouldLog("warn")) console.warn(serialize("warn", message, context));
  },
  error(message: string, context?: LogContext) {
    if (shouldLog("error")) console.error(serialize("error", message, context));
  },
};

export type { LogContext };
