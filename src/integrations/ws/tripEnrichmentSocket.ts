import type { TripEnrichmentResult } from "@/integrations/api/types";
import { subscribeUserSocket, type UserSocketHandle } from "@/integrations/ws/userSocketClient";

export type TripEnrichmentSocketHandle = UserSocketHandle;

export function connectTripEnrichmentSocket(
  token: string,
  onResult: (result: TripEnrichmentResult) => void,
  options?: { onError?: (message: string) => void; debug?: boolean }
): TripEnrichmentSocketHandle {
  return subscribeUserSocket(
    "/user/queue/trip-enrichment",
    token,
    (message) => {
      try {
        onResult(JSON.parse(message.body) as TripEnrichmentResult);
      } catch (error) {
        console.warn("Failed to parse trip-enrichment payload:", error);
      }
    },
    options
  );
}
