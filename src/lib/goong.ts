// ─── Goong REST API client ────────────────────────────────────────────────────
// Sử dụng Goong REST API thay vì Google Maps API

const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY as string;
const GOONG_API_BASE = 'https://rsapi.goong.io';

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

const VEHICLE_MAP: Record<string, string> = {
  car:  'car',
  taxi: 'car',
  bike: 'bike',
  hd:   'car',
};

export async function getDirection(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'car',
): Promise<DirectionResult | null> {
  try {
    const vehicle_type = VEHICLE_MAP[vehicle] ?? 'car';
    const url = `${GOONG_API_BASE}/Direction?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&vehicle=${vehicle_type}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    const leg = route.legs?.[0];
    return {
      distance: leg?.distance?.value ?? 0,
      duration: leg?.duration?.value ?? 0,
      polyline: decodePolyline(route.overview_polyline?.points ?? ''),
    };
  } catch {
    return null;
  }
}

// ─── Distance Matrix (consecutive points: A→B, B→C, …) ───────────────────────

export interface TravelSegment {
  distance: number;  // metres
  duration: number;  // seconds
}

export async function getConsecutiveTravelTimes(
  points: Array<{ lat: number; lng: number }>,
  vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'car',
): Promise<Array<TravelSegment | null>> {
  if (points.length < 2) return [];

  const origins = points.slice(0, -1);
  const dests = points.slice(1);
  const vehicle_type = VEHICLE_MAP[vehicle] ?? 'car';

  // Goong Distance Matrix: origins và destinations là chuỗi lat,lng ngăn cách bởi |
  const originsStr = origins.map(p => `${p.lat},${p.lng}`).join('|');
  const destsStr = dests.map(p => `${p.lat},${p.lng}`).join('|');

  try {
    const url = `${GOONG_API_BASE}/DistanceMatrix?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destsStr)}&vehicle=${vehicle_type}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return new Array(origins.length).fill(null);
    const data = await res.json();
    // rows[i].elements[i] = origins[i] → destinations[i] (diagonal)
    return (data.rows ?? []).map((row: any, i: number) => {
      const el = row.elements?.[i];
      if (el?.status === 'OK') {
        return { distance: el.distance.value, duration: el.duration.value };
      }
      return null;
    });
  } catch {
    return new Array(origins.length).fill(null);
  }
}

// ─── Reverse Geocode → city name ─────────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${GOONG_API_BASE}/Geocode/reverse?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    // Tìm province trong address_components
    const province = first.address_components?.find((c: any) =>
      c.types?.includes('administrative_area_level_1')
    );
    if (province) return province.long_name;
    const parts = first.formatted_address?.split(',');
    return parts?.at(-1)?.trim() ?? null;
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