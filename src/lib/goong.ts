// ─── Goong route helpers ──────────────────────────────────────────────────────
// Direction/DistanceMatrix/Reverse Geocode đều proxy qua BE (/api/v1/routes/*).
// Maptiles token vẫn ở FE (VITE_GOONG_MAPTILES_KEY) cho map JS render trong GoongMap.tsx.

import apiClient from "@/integrations/api/client";
import type { ApiResponse } from "@/integrations/api/types";

// ─── Polyline decoder (Google Encoded Polyline format — Goong dùng cùng format) ─

export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]); // GeoJSON order: [lng, lat]
  }
  return coords;
}

// ─── Direction A→B ────────────────────────────────────────────────────────────

export interface DirectionResult {
  distance: number;  // metres
  duration: number;  // seconds
  polyline: [number, number][];  // decoded GeoJSON coords [lng, lat]
}

interface DirectionResponse {
  distanceMeters: number;
  durationSeconds: number;
  overviewPolyline: string;
}

// Map page vẽ polyline cho mọi cặp pin của cả chuyến bằng Promise.all — nếu bắn thẳng sẽ là
// ~N call /routes/direction cùng lúc → Goong 429. Giới hạn concurrency để drain theo từng đợt nhỏ,
// và cache (CHỈ kết quả non-null) theo toạ độ làm tròn ~1m để khỏi gọi lại leg đã có.
const MAX_DIRECTION_CONCURRENCY = 3;
let activeDirections = 0;
const directionWaiters: Array<() => void> = [];

function acquireDirectionSlot(): Promise<void> {
  if (activeDirections < MAX_DIRECTION_CONCURRENCY) {
    activeDirections++;
    return Promise.resolve();
  }
  return new Promise((resolve) => directionWaiters.push(resolve));
}

function releaseDirectionSlot(): void {
  const next = directionWaiters.shift();
  if (next) next();      // chuyển slot cho thread đang chờ — slot vẫn được tính, KHÔNG giảm
  else activeDirections--;
}

const directionCache = new Map<string, DirectionResult>();
const dirKey = (
  o: { lat: number; lng: number },
  d: { lat: number; lng: number },
  v: string,
) => `${o.lat.toFixed(5)},${o.lng.toFixed(5)}|${d.lat.toFixed(5)},${d.lng.toFixed(5)}|${v}`;

export async function getDirection(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'car',
): Promise<DirectionResult | null> {
  const key = dirKey(origin, dest, vehicle);
  const cached = directionCache.get(key);
  if (cached) return cached;

  await acquireDirectionSlot();
  try {
    const { data } = await apiClient.get<ApiResponse<DirectionResponse | null>>('/routes/direction', {
      params: { oLat: origin.lat, oLng: origin.lng, dLat: dest.lat, dLng: dest.lng, vehicle },
    });
    if (!data.data) return null; // leg fail (Goong 429 → BE trả null): KHÔNG cache, thử lại lần render sau
    const result: DirectionResult = {
      distance: data.data.distanceMeters,
      duration: data.data.durationSeconds,
      polyline: decodePolyline(data.data.overviewPolyline ?? ''),
    };
    directionCache.set(key, result);
    return result;
  } catch {
    return null;
  } finally {
    releaseDirectionSlot();
  }
}

// ─── Distance Matrix (consecutive points: A→B, B→C, …) ───────────────────────

export interface TravelSegment {
  distance: number;  // metres
  duration: number;  // seconds
}

interface DistanceMatrixResponse {
  segments: Array<{ distanceMeters: number; durationSeconds: number } | null>;
}

export async function getConsecutiveTravelTimes(
  points: Array<{ lat: number; lng: number }>,
  vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'car',
): Promise<Array<TravelSegment | null>> {
  if (points.length < 2) return [];
  try {
    const { data } = await apiClient.post<ApiResponse<DistanceMatrixResponse>>(
      '/routes/distance-matrix',
      { points, vehicle },
    );
    const segs = data.data?.segments ?? [];
    return segs.map(s => s ? { distance: s.distanceMeters, duration: s.durationSeconds } : null);
  } catch {
    return new Array(points.length - 1).fill(null);
  }
}

// ─── Reverse Geocode → province name ─────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const { data } = await apiClient.get<ApiResponse<string | null>>('/routes/reverse-geocode', {
      params: { lat, lng },
    });
    return data.data ?? null;
  } catch {
    return null;
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1 phút';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} phút`;
  return m > 0 ? `${h}h ${m} phút` : `${h}h`;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
