import { Loader } from '@googlemaps/js-api-loader';

// Singleton loader — cùng key với GoogleMap.tsx, Maps JS API chỉ load 1 lần
const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  version: 'weekly',
});

// String literals cast sang enum để tránh truy cập google.maps.* ở module level
// (API chưa chắc load khi module khởi tạo)
const VEHICLE_TO_MODE: Record<string, google.maps.TravelMode> = {
  car:  'DRIVING'   as google.maps.TravelMode,
  taxi: 'DRIVING'   as google.maps.TravelMode,
  bike: 'BICYCLING' as google.maps.TravelMode,
  hd:   'DRIVING'   as google.maps.TravelMode,
};

// ─── Polyline decoder (Google Encoded Polyline format) ────────────────────────

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
  polyline: [number, number][];  // decoded GeoJSON coords
}

export async function getDirection(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'car',
): Promise<DirectionResult | null> {
  try {
    await loader.load();
    const service = new google.maps.DirectionsService();
    const result = await service.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: dest.lat, lng: dest.lng },
      travelMode: VEHICLE_TO_MODE[vehicle] ?? ('DRIVING' as google.maps.TravelMode),
      language: 'vi',
      region: 'vn',
    });
    const route = result.routes[0];
    if (!route) return null;
    const leg = route.legs[0];
    return {
      distance: leg?.distance?.value ?? 0,
      duration: leg?.duration?.value ?? 0,
      polyline: decodePolyline(route.overview_polyline),
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
  const dests   = points.slice(1);
  try {
    await loader.load();
    const service = new google.maps.DistanceMatrixService();
    const result = await service.getDistanceMatrix({
      origins:      origins.map(p => ({ lat: p.lat, lng: p.lng })),
      destinations: dests.map(p   => ({ lat: p.lat, lng: p.lng })),
      travelMode: VEHICLE_TO_MODE[vehicle] ?? ('DRIVING' as google.maps.TravelMode),
      language: 'vi',
      region: 'vn',
    });
    // rows[i].elements[i] = origins[i] → destinations[i] (diagonal)
    return result.rows.map((row, i) => {
      const el = row.elements[i];
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
    await loader.load();
    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({
      location: { lat, lng },
      language: 'vi',
      region: 'vn',
    } as google.maps.GeocoderRequest);
    const first = result.results[0];
    if (!first) return null;
    const province = first.address_components.find(c =>
      c.types.includes('administrative_area_level_1')
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
