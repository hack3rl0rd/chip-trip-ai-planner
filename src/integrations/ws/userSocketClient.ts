import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { authStorage, getValidAccessToken } from "@/integrations/api/client";

const WS_BASE: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  (() => {
    const api = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8080/api/v1";
    return api.replace(/\/api\/v1\/?$/, "");
  })();

const WS_ENDPOINT = `${WS_BASE}/ws`;

interface SocketListener {
  onMessage: (message: IMessage) => void;
  onError?: (message: string) => void;
}

export interface UserSocketHandle {
  disconnect: () => void;
  isConnected: () => boolean;
}

const listeners = new Map<string, Set<SocketListener>>();
const subscriptions = new Map<string, StompSubscription>();
let client: Client | null = null;
let generation = 0;

function reportError(message: string) {
  listeners.forEach((entries) => entries.forEach((entry) => entry.onError?.(message)));
}

function subscribeDestination(destination: string) {
  if (!client?.connected || subscriptions.has(destination)) return;
  const subscription = client.subscribe(destination, (message) => {
    listeners.get(destination)?.forEach((entry) => entry.onMessage(message));
  });
  subscriptions.set(destination, subscription);
}

function ensureClient(initialToken?: string, debug = false) {
  if (client || listeners.size === 0) return;

  const currentGeneration = generation;
  const nextClient = new Client({
    webSocketFactory: () => new SockJS(WS_ENDPOINT) as unknown as WebSocket,
    connectHeaders: initialToken ? { Authorization: `Bearer ${initialToken}` } : {},
    reconnectDelay: 5_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    debug: debug ? (message) => console.debug("[STOMP]", message) : () => {},
  });

  nextClient.beforeConnect = async () => {
    try {
      const token = await getValidAccessToken();
      nextClient.connectHeaders = { Authorization: `Bearer ${token}` };
    } catch (error) {
      reportError(error instanceof Error ? error.message : "Không thể làm mới phiên đăng nhập");
      throw error;
    }
  };
  nextClient.onConnect = () => {
    if (currentGeneration !== generation) return;
    subscriptions.clear();
    listeners.forEach((_entries, destination) => subscribeDestination(destination));
  };
  nextClient.onStompError = (frame) => reportError(frame.headers.message || "STOMP error");
  nextClient.onWebSocketError = (event) =>
    reportError((event as ErrorEvent).message || "WebSocket error");

  client = nextClient;
  nextClient.activate();
}

function restartClient() {
  const previous = client;
  client = null;
  subscriptions.clear();
  const currentGeneration = ++generation;

  const reconnect = () => {
    if (currentGeneration === generation && listeners.size > 0 && authStorage.getAccessToken()) {
      ensureClient();
    }
  };

  if (previous) void previous.deactivate().finally(reconnect);
  else reconnect();
}

window.addEventListener("chiptrip-auth-change", restartClient);

export function subscribeUserSocket(
  destination: string,
  token: string,
  onMessage: (message: IMessage) => void,
  options?: { onError?: (message: string) => void; debug?: boolean }
): UserSocketHandle {
  const entry: SocketListener = { onMessage, onError: options?.onError };
  const destinationListeners = listeners.get(destination) ?? new Set<SocketListener>();
  destinationListeners.add(entry);
  listeners.set(destination, destinationListeners);

  ensureClient(token, options?.debug);
  subscribeDestination(destination);

  return {
    disconnect: () => {
      const current = listeners.get(destination);
      current?.delete(entry);
      if (current?.size === 0) {
        listeners.delete(destination);
        subscriptions.get(destination)?.unsubscribe();
        subscriptions.delete(destination);
      }
      if (listeners.size === 0 && client) {
        const previous = client;
        client = null;
        subscriptions.clear();
        generation++;
        void previous.deactivate();
      }
    },
    isConnected: () => client?.connected ?? false,
  };
}
