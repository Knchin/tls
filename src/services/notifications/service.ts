import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";
import { NotificationDispatcher, notificationMessage } from "@/services/notifications/index";
import { InAppNotificationProvider } from "@/services/notifications/inapp";
import { EmailNotificationProvider } from "@/services/notifications/email";
import type { NotificationChannel, NotificationType } from "@/types";
import type { NotificationMessage } from "@/services/notifications/types";

type AvailabilityNotifyInput = {
  userId: string;
  monitoringRequestId: string;
  resultHash: string;
  title: string;
  message: string;
  bookedUrl: string;
};

export class NotificationService {
  private readonly dispatcher: NotificationDispatcher;

  constructor(dispatcher?: NotificationDispatcher) {
    this.dispatcher =
      dispatcher ??
      new NotificationDispatcher([new InAppNotificationProvider(), new EmailNotificationProvider()]);
  }

  async sendAvailabilityNotification(input: AvailabilityNotifyInput): Promise<void> {
    const admin = createAdminClient();

    const { data: preferences } = await admin
      .from("notification_preferences")
      .select("email_enabled, push_enabled")
      .eq("user_id", input.userId)
      .maybeSingle();

    const emailEnabled = preferences?.email_enabled ?? true;

    const base = notificationMessage({
      userId: input.userId,
      monitoringRequestId: input.monitoringRequestId,
      type: "APPOINTMENT_AVAILABLE",
      title: input.title,
      message: `${input.message} Complete your appointment through the official TLScontact booking process: ${input.bookedUrl}`,
    });

    const targets: { channel: NotificationChannel; enabled: boolean }[] = [
      { channel: "IN_APP", enabled: true },
      { channel: "EMAIL", enabled: emailEnabled },
    ];

    const result = await this.dispatcher.dispatch(base, targets);

    await this.persist(base, targets, result.sentChannels, result.failedChannels, input.resultHash);
  }

  async sendMonitoringError(input: {
    userId: string;
    monitoringRequestId: string | null;
    title: string;
    message: string;
  }): Promise<void> {
    const base = notificationMessage({
      userId: input.userId,
      monitoringRequestId: input.monitoringRequestId,
      type: "MONITORING_ERROR",
      title: input.title,
      message: input.message,
    });

    const result = await this.dispatcher.dispatch(base, [
      { channel: "IN_APP", enabled: true },
      { channel: "EMAIL", enabled: false },
    ]);

    await this.persist(
      base,
      [{ channel: "IN_APP", enabled: true }],
      result.sentChannels,
      result.failedChannels
    );
  }

  private async persist(
    base: Omit<NotificationMessage, "channel">,
    targets: { channel: NotificationChannel; enabled: boolean }[],
    sentChannels: NotificationChannel[],
    failedChannels: NotificationChannel[],
    resultHash?: string
  ): Promise<void> {
    const admin = createAdminClient();

    for (const target of targets) {
      if (!target.enabled) continue;
      const failed = failedChannels.includes(target.channel);

      const { error } = await admin.from("notifications").insert({
        user_id: base.user_id,
        monitoring_request_id: base.monitoring_request_id,
        type: base.type as NotificationType,
        channel: target.channel,
        title: base.title,
        message: base.message,
        status: failed ? "FAILED" : "SENT",
        result_hash: resultHash ?? null,
        sent_at: failed ? null : new Date().toISOString(),
      });

      if (error) {
        logger.error("notification_persist_failed", {
          userId: base.user_id,
          channel: target.channel,
          error: error.message,
        });
      }
    }
  }
}

export async function getLastAvailabilityNotification(
  monitoringRequestId: string
): Promise<{ resultHash: string | null; sentAt: string | null } | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("notifications")
    .select("result_hash, sent_at")
    .eq("monitoring_request_id", monitoringRequestId)
    .eq("type", "APPOINTMENT_AVAILABLE")
    .eq("channel", "IN_APP")
    .eq("status", "SENT")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.result_hash) return null;
  return { resultHash: data.result_hash, sentAt: data.sent_at };
}

export async function hasUnreadAvailabilityAlert(
  monitoringRequestId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("monitoring_request_id", monitoringRequestId)
    .eq("type", "APPOINTMENT_AVAILABLE")
    .eq("status", "SENT")
    .maybeSingle();

  return Boolean(data);
}
