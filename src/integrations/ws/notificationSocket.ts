import type { NotificationDto } from "@/integrations/api/types";
import { subscribeUserSocket, type UserSocketHandle } from "@/integrations/ws/userSocketClient";

/**
 * STOMP client wrap WebSocket (SockJS) cho notification realtime.
 *
 * BE config:
 *   - Endpoint:        /ws (SockJS)
 *   - Destination:     /user/queue/notifications
 *   - Auth:            CONNECT frame header `Authorization: Bearer <jwt>`
 *
 * Dùng shared STOMP client; token được refresh trước CONNECT và client tự reconnect khi cần.
 */

export type NotificationHandler = (notification: NotificationDto) => void;

export type NotificationSocketHandle = UserSocketHandle;

export function connectNotificationSocket(
  token: string,
  onNotification: NotificationHandler,
  options?: { onError?: (msg: string) => void; debug?: boolean }
): NotificationSocketHandle {
  return subscribeUserSocket(
    "/user/queue/notifications",
    token,
    (msg) => {
      try {
        const dto = JSON.parse(msg.body) as NotificationDto;
        onNotification(dto);
      } catch (e) {
        console.warn("Failed to parse notification payload:", e);
      }
    },
    options
  );
}
