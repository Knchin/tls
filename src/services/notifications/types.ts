import type { NotificationChannel, NotificationType } from "@/types";

export type NotificationMessage = {
  user_id: string;
  monitoring_request_id: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(notification: NotificationMessage): Promise<{ sent: boolean; externalId?: string }>;
}
