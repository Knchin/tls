import type {
  AppointmentCriteria,
  AvailabilityResult,
  CheckErrorCode,
  ProviderName,
} from "@/types";

export type CheckOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export interface AppointmentAvailabilityProvider {
  readonly name: ProviderName;
  checkAvailability(
    criteria: AppointmentCriteria,
    options?: CheckOptions
  ): Promise<AvailabilityResult>;
}

export class ProviderError extends Error {
  readonly code: CheckErrorCode;
  readonly retryable: boolean;
  readonly userMessage: string;

  constructor(
    code: CheckErrorCode,
    message: string,
    options: { retryable?: boolean; userMessage?: string } = {}
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable ?? true;
    this.userMessage = options.userMessage ?? message;
  }

  static notConfigured(message = "The appointment provider is not configured."): ProviderError {
    return new ProviderError("PROVIDER_NOT_CONFIGURED", message, {
      retryable: false,
      userMessage:
        "Availability checking is not yet connected to the appointment provider. No external system was contacted.",
    });
  }
}
