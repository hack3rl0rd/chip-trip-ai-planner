const STORAGE_PREFIX = "chiptrip_pending_generation_";
const MAX_PENDING_AGE_MS = 15 * 60_000;

export interface PendingTripGeneration {
  generationId: string;
  startedAt: number;
  destination: string;
  analyticsPayload: Record<string, unknown>;
}

const storageKey = (userId: number) => `${STORAGE_PREFIX}${userId}`;

export function savePendingTripGeneration(userId: number, pending: PendingTripGeneration): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(pending));
  } catch {
    // Storage có thể bị chặn ở private mode; WS + polling trong phiên hiện tại vẫn hoạt động.
  }
}

export function loadPendingTripGeneration(
  userId: number,
  now = Date.now(),
): PendingTripGeneration | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<PendingTripGeneration>;
    const valid =
      typeof value.generationId === "string" &&
      value.generationId.length > 0 &&
      Number.isFinite(value.startedAt) &&
      typeof value.destination === "string" &&
      value.analyticsPayload != null &&
      typeof value.analyticsPayload === "object" &&
      !Array.isArray(value.analyticsPayload);
    if (!valid || now - (value.startedAt as number) > MAX_PENDING_AGE_MS) {
      localStorage.removeItem(storageKey(userId));
      return null;
    }

    return value as PendingTripGeneration;
  } catch {
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      // Storage bị chặn hoàn toàn.
    }
    return null;
  }
}

export function clearPendingTripGeneration(userId: number): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Không còn gì cần xử lý nếu storage không khả dụng.
  }
}
