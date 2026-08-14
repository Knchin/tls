import type { AppointmentCriteria } from "@/types";
import { ProviderError } from "@/services/providers/types";

/**
 * OfficialTLSProvider
 *
 * IMPORTANT — INTEGRATION STATUS
 *
 * This provider is intentionally a NON-FUNCTIONING STUB.
 *
 * As of the time this application was written, TLScontact does not expose a
 * public, documented, or officially permitted API for querying appointment
 * availability for the Tunisia centres (Tunis / Sfax). Its booking flows are
 * gated behind per-destination subdomains (e.g. visas-fr.tlscontact.com),
 * applicant authentication, and anti-bot protections (including a published
 * "appointment booking: fraud alert"). No mechanism in this application
 * performs CAPTCHA solving, session reuse, credential harvesting, fingerprint
 * spoofing, or automated booking — and none is provided here.
 *
 * For this provider to become operational, one of the following would have to
 * exist, and would be implemented here:
 *   1. An official TLScontact availability API (public or partner), or
 *   2. A documented, permitted integration channel that does not violate
 *      TLScontact's terms or anti-bot measures.
 *
 * Until then, `checkAvailability` NEVER contacts any external system. It
 * returns a clear "provider not configured" error so the rest of the product
 * can never misrepresent a fake external check as a real one.
 *
 * If you (the operator) obtain a permitted integration, implement it inside
 * this class and set TLS_PROVIDER=official plus your configuration via
 * environment variables. Do NOT add scraping/anti-bot bypass here.
 */
export class OfficialTLSProvider {
  readonly name = "official" as const;

  private readonly configured: boolean;
  private readonly documentationUrl: string;

  constructor(config: { documentationUrl?: string } = {}) {
    this.documentationUrl =
      config.documentationUrl ??
      process.env.TLS_OFFICIAL_INTEGRATION_DOC_URL ??
      "";
    this.configured = process.env.TLS_OFFICIAL_PROVIDER_CONFIGURED === "true";
  }

  async checkAvailability(_criteria: AppointmentCriteria): Promise<never> {
    if (this.configured) {
      throw new ProviderError(
        "PROVIDER_NOT_CONFIGURED",
        "The official provider flag is set, but no permitted integration mechanism has been implemented. No external request was made."
      );
    }

    const detail = this.documentationUrl
      ? ` See ${this.documentationUrl} for integration requirements.`
      : "";

    throw ProviderError.notConfigured(
      "TLScontact does not currently provide an officially permitted availability API for the Tunisia centres. This provider is a stub and performs no external request." +
        detail
    );
  }
}
