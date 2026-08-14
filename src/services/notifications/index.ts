import type { NotificationChannel, NotificationType } from "@/types";
import type { NotificationMessage, NotificationProvider } from "@/services/notifications/types";
import { logger } from "@/lib/logging";

export type DispatchTarget = {
  channel: NotificationChannel;
  enabled: boolean;
};

export class NotificationDispatcher {
  private readonly providers: NotificationProvider[];

  constructor(providers: NotificationProvider[]) {
    this.providers = providers;
  }

  async dispatch(
    message: Omit<NotificationMessage, "channel">,
    targets: DispatchTarget[]
  ): Promise<{ sentChannels: NotificationChannel[]; failedChannels: NotificationChannel[] }> {
    const sentChannels: NotificationChannel[] = [];
    const failedChannels: NotificationChannel[] = [];

    for (const target of targets) {
      if (!target.enabled) {
        logger.debug("notification_channel_disabled", {
          userId: message.user_id,
          type: message.type,
          channel: target.channel,
        });
        continue;
      }

      const provider = this.providers.find((p) => p.channel === target.channel);
      if (!provider) {
        failedChannels.push(target.channel);
        continue;
      }

      try {
        const result = await provider.send({ ...message, channel: target.channel });
        if (result.sent) {
          sentChannels.push(target.channel);
        } else {
          failedChannels.push(target.channel);
        }
      } catch (error) {
        logger.error("notification_dispatch_failed", {
          userId: message.user_id,
          type: message.type,
          channel: target.channel,
          error: error instanceof Error ? error.message : "unknown",
        });
        failedChannels.push(target.channel);
      }
    }

    return { sentChannels, failedChannels };
  }
}

export function notificationMessage(
  input: {
    userId: string;
    monitoringRequestId: string | null;
    type: NotificationType;
    title: string;
    message: string;
  }
): Omit<NotificationMessage, "channel"> {
  return {
    user_id: input.userId,
    monitoring_request_id: input.monitoringRequestId,
    type: input.type,
    title: input.title,
    message: input.message,
  };
}
