import type { TripGenerationResult } from "@/integrations/api/types";
import { subscribeUserSocket, type UserSocketHandle } from "@/integrations/ws/userSocketClient";

/**
 * STOMP client cho kết quả sinh lịch trình bất đồng bộ.
 *
 * BE config:
 *   - Endpoint:        /ws (SockJS, dùng chung)
 *   - Destination:     /user/queue/trip-generation
 *   - Auth:            CONNECT frame header `Authorization: Bearer <jwt>`
 *
 * Dùng chung STOMP client với chat/notification, tách payload bằng destination.
 */

export type TripGenerationSocketHandle = UserSocketHandle;

export function connectTripGenerationSocket(
  token: string,
  onResult: (result: TripGenerationResult) => void,
  options?: { onError?: (msg: string) => void; debug?: boolean }
): TripGenerationSocketHandle {
  return subscribeUserSocket(
    "/user/queue/trip-generation",
    token,
    (msg) => {
      try {
        const dto = JSON.parse(msg.body) as TripGenerationResult;
        onResult(dto);
      } catch (e) {
        console.warn("Failed to parse trip-generation payload:", e);
      }
    },
    options
  );
}
