import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { TripGenerationResult } from "@/integrations/api/types";

/**
 * STOMP client cho kết quả sinh lịch trình bất đồng bộ.
 *
 * BE config:
 *   - Endpoint:        /ws (SockJS, dùng chung)
 *   - Destination:     /user/queue/trip-generation
 *   - Auth:            CONNECT frame header `Authorization: Bearer <jwt>`
 *
 * Mỗi feature 1 client riêng (không cross-talk) — theo đúng convention của notificationSocket/chatSocket.
 */

const WS_BASE: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  (() => {
    const api = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8080/api/v1";
    return api.replace(/\/api\/v1\/?$/, "");
  })();

const WS_ENDPOINT = `${WS_BASE}/ws`;

export interface TripGenerationSocketHandle {
  disconnect: () => void;
  isConnected: () => boolean;
}

export function connectTripGenerationSocket(
  token: string,
  onResult: (result: TripGenerationResult) => void,
  options?: { onError?: (msg: string) => void; debug?: boolean }
): TripGenerationSocketHandle {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_ENDPOINT) as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    debug: options?.debug ? (str) => console.debug("[STOMP trip-gen]", str) : () => {},
  });

  client.onConnect = () => {
    client.subscribe("/user/queue/trip-generation", (msg: IMessage) => {
      try {
        const dto = JSON.parse(msg.body) as TripGenerationResult;
        onResult(dto);
      } catch (e) {
        console.warn("Failed to parse trip-generation payload:", e);
      }
    });
  };

  client.onStompError = (frame) => {
    options?.onError?.(frame.headers["message"] || "STOMP error");
  };

  client.onWebSocketError = (evt) => {
    options?.onError?.((evt as ErrorEvent).message ?? "WebSocket error");
  };

  client.activate();

  return {
    disconnect: () => {
      void client.deactivate();
    },
    isConnected: () => client.connected,
  };
}
