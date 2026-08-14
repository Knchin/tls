import type { NotificationMessage } from "@/services/notifications/types";
import { logger } from "@/lib/logging";

/**
 * InAppNotificationProvider
 *
 * In-app notifications are persisted to the notifications table by the
 * notification dispatcher; this provider marks them as SENT and tracks the
 * delivery so the dashboard bell can render them.
 */
export class InAppNotificationProvider {
  readonly channel = "IN_APP" as const;

  async send(notification: NotificationMessage): Promise<{ sent: boolean }> {
    logger.debug("inapp_notification_delivered", {
      userId: notification.user_id,
      type: notification.type,
    });
    return { sent: true };
  }
}
