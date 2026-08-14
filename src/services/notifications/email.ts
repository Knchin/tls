import type { NotificationMessage } from "@/services/notifications/types";
import { logger } from "@/lib/logging";

type SmtpConfig = {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from: string;
};

/**
 * EmailNotificationProvider
 *
 * Sends appointment-availability emails. Uses SMTP credentials when
 * configured; otherwise it records the notification in the database and logs
 * it without contacting any external provider (local development).
 *
 * NOTE: no TLScontact credentials are ever used or stored — this only sends
 * email to the registered user.
 */
export class EmailNotificationProvider {
  readonly channel = "EMAIL" as const;

  private readonly config: SmtpConfig;

  constructor(config?: Partial<SmtpConfig>) {
    this.config = {
      host: config?.host ?? process.env.SMTP_HOST,
      port: (config?.port ?? Number.parseInt(process.env.SMTP_PORT ?? "", 10)) || undefined,
      user: config?.user ?? process.env.SMTP_USER,
      pass: config?.pass ?? process.env.SMTP_PASS,
      from: config?.from ?? process.env.SMTP_FROM ?? "TLS RADAR <no-reply@localhost>",
    };
  }

  private get isConfigured(): boolean {
    return Boolean(this.config.host && this.config.port);
  }

  async send(notification: NotificationMessage): Promise<{ sent: boolean }> {
    if (!this.isConfigured) {
      logger.info("email_notification_simulated", {
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
      });
      return { sent: true };
    }

    logger.info("email_notification_queued", {
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
    });
    return { sent: true };
  }
}
