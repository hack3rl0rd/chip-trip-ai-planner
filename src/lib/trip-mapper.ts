import type { TripDetail, TripGenerateResponse, TripSummary } from "@/integrations/api/types";
import type { TripPlan, TripItem, TripDay } from "@/features/planning/trip-data";

function formatVnd(vnd: number | null | undefined): string {
  if (!vnd || vnd === 0) return "Miễn phí";
  if (vnd >= 1_000_000) return `${(vnd / 1_000_000).toFixed(1)}M`;
  return `${vnd / 1000}K`;
}

// Backend ActivityType enum (UPPERCASE) → frontend bookingType key
function mapBookingType(type: string | null | undefined): TripItem["bookingType"] {
  switch (type) {
    case "ACCOMMODATION": return "hotel";
    case "FOOD": return "restaurant";
    case "TRANSPORT": return "transport";
    case "ATTRACTION": return "attraction";
    default: return "attraction";
  }
}

function parseLocalTime(time: string): string {
  if (!time) return "09:00";
  const parts = time.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return "09:00";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return "";
  }
}

function formatDateRange(start: string | null, end: string | null): string {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  return e;
}

export function parseTripStyles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export function mapTripDetailToPlan(detail: TripDetail | TripGenerateResponse): TripPlan {
  const days: TripDay[] = (detail.days || []).map((day) => {
    const items: TripItem[] = (day.activities || []).map((act) => ({
      id: String(act.id),
      time: parseLocalTime(act.startTime),
      title: act.name,
      desc: act.description || "",
      cost: formatVnd(act.costVnd),
      costVnd: act.costVnd ?? 0,
      image: act.imageUrl || "/placeholder.svg",
      address: act.address || (act.latitude && act.longitude ? `${act.latitude}, ${act.longitude}` : undefined),
      lat: act.latitude ?? undefined,
      lng: act.longitude ?? undefined,
      rating: undefined,
      tips: undefined,
      bookingUrl: act.bookingUrl || undefined,
      bookingType: mapBookingType(act.type),
      placeCacheId: act.placeCacheId ?? undefined,
    }));

    return {
      day: `Ngày ${day.dayNumber}`,
      date: formatDate(day.date),
      items,
    };
  });

  const start = detail.dateStart;
  const end = detail.dateEnd;
  let numDays = days.length;
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    numDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  const numNights = Math.max(0, numDays - 1);

  const styles = parseTripStyles(detail.styles);

  return {
    id: String(detail.id),
    destination: detail.destination,
    title: detail.title || `${detail.destination} ${numDays}N${numNights}Đ`,
    days,
    totalCost: formatVnd(detail.totalCostVnd),
    rating: 4.8,
    duration: `${numDays} ngày ${numNights} đêm`,
    image: days[0]?.items[0]?.image || "/placeholder.svg",
    tags: styles,
    dateRange: formatDateRange(start, end),
  };
}

export function mapTripSummaryToCard(summary: TripSummary): { id: string; title: string; destination: string; dateRange: string; totalCost: string; tags: string[]; image: string } {
  return {
    id: String(summary.id),
    title: summary.title || `${summary.destination} trip`,
    destination: summary.destination,
    dateRange: formatDateRange(summary.dateStart, summary.dateEnd),
    totalCost: formatVnd(summary.totalCostVnd),
    tags: parseTripStyles(summary.styles),
    image: "/placeholder.svg",
  };
}
