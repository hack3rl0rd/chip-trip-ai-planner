import type { MessageDto } from "@/integrations/api/types";
import { subscribeUserSocket, type UserSocketHandle } from "@/integrations/ws/userSocketClient";

/**
 * STOMP client cho chat realtime.
 *
 * Destinations:
 *   - /user/queue/messages   → tin nhắn của chính user (cả user gửi & admin reply)
 *   - /topic/support         → admin pool nhận MỌI tin (chỉ subscribe được khi token có ROLE_ADMIN)
 *
 * Auth: CONNECT header `Authorization: Bearer <jwt>` (verify ở BE JwtChannelInterceptor).
 *
 * Chat/notification/trip-generation dùng chung một STOMP client, tách nhau bằng destination.
 */

export type MessageHandler = (m: MessageDto) => void;

export type ChatSocketHandle = UserSocketHandle;

export interface ChatSocketOptions {
  /** true = subscribe /topic/support (admin); false = subscribe /user/queue/messages (user). */
  asAdmin: boolean;
  onError?: (msg: string) => void;
  debug?: boolean;
}

export function connectChatSocket(
  token: string,
  onMessage: MessageHandler,
  options: ChatSocketOptions
): ChatSocketHandle {
  const destination = options.asAdmin ? "/topic/support" : "/user/queue/messages";
  return subscribeUserSocket(
    destination,
    token,
    (msg) => {
      try {
        const dto = JSON.parse(msg.body) as MessageDto;
        onMessage(dto);
      } catch (e) {
        console.warn("Failed to parse chat message:", e);
      }
    },
    options
  );
}
