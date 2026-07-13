import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { adminApi, type AdminDashboard } from "@/integrations/api/modules/admin";

/* ── Chart data shapes ──────────────────────────────────────────── */
export interface TrendPoint {
  date: string;
  registrations: number;
  trips: number;
}
export interface RevenuePoint {
  date: string;
  revenueVnd: number;
}
export interface OrdersTripsPoint {
  date: string;
  orders: number;
  trips: number;
}
export interface AiCallsPoint {
  date: string;
  calls: number;
}
export interface PublishSlice {
  name: string;
  value: number;
}
export interface PageviewPoint {
  day: string;
  count: number;
}
export interface EventPoint {
  label: string;
  count: number;
}
export interface FunnelStep {
  name: string;
  value: number;
  fill: string;
}

export interface AdminAnalyticsData {
  dashboard: AdminDashboard | null;
  trend: TrendPoint[];
  revenue: RevenuePoint[];
  ordersVsTrips: OrdersTripsPoint[];
  aiCalls: AiCallsPoint[];
  publishSplit: PublishSlice[];
  pageviews: PageviewPoint[];
  events: EventPoint[];
  funnel: FunnelStep[];
  loading: boolean;
  postHogLoading: boolean;
}

/* Nhãn tiếng Việt cho event PostHog (src/lib/analytics.ts) */
export const EVENT_LABELS: Record<string, string> = {
  sign_up: "Đăng ký",
  login_google_succeeded: "Đăng nhập Google",
  generate_started: "Bắt đầu tạo plan",
  generate_succeeded: "Tạo plan thành công",
  generate_failed: "Tạo plan lỗi",
  booking_click: "Click đặt chỗ",
  publish: "Công khai trip",
  purchase_started: "Bắt đầu mua",
  purchase_succeeded: "Mua thành công",
  purchase_failed: "Mua thất bại",
  $pageview: "Lượt xem trang",
};

export const FUNNEL_COLORS = [
  "#f97316", "#fb923c", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
];

/** Số ngày của các biểu đồ xu hướng theo ngày. */
const TREND_DAYS = 30;

/** Gộp hai chuỗi theo ngày (union các mốc ngày) thành map date → giá trị. */
function mergeByDate<T extends { date: string }>(
  rows: T[],
  pick: (row: T) => number
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.date, pick(r));
  return map;
}

/**
 * Tải toàn bộ dữ liệu cho trang Thống kê admin. Fetch khi mount (component chỉ
 * render khi tab analytics đang mở), nên quay lại tab sẽ tự refetch.
 */
export function useAdminAnalytics(): AdminAnalyticsData {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [ordersVsTrips, setOrdersVsTrips] = useState<OrdersTripsPoint[]>([]);
  const [aiCalls, setAiCalls] = useState<AiCallsPoint[]>([]);
  const [publishSplit, setPublishSplit] = useState<PublishSlice[]>([]);
  const [pageviews, setPageviews] = useState<PageviewPoint[]>([]);
  const [events, setEvents] = useState<EventPoint[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [postHogLoading, setPostHogLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadCore = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const to = format(today, "yyyy-MM-dd");
        const from = format(subDays(today, TREND_DAYS), "yyyy-MM-dd");

        const [dash, userStats, tripStats, revenueStats, aiCallStats] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.getUserStats(from, to),
          adminApi.getTripStats(from, to),
          adminApi.getRevenueStats(from, to),
          adminApi.getAiCallStats(from, to),
        ]);
        if (!alive) return;

        setDashboard(dash);

        const tripsByDate = mergeByDate(tripStats, (r) => r.count);
        setTrend(
          userStats.map((u) => ({
            date: u.date,
            registrations: u.count,
            trips: tripsByDate.get(u.date) ?? 0,
          }))
        );

        setRevenue(revenueStats.map((r) => ({ date: r.date, revenueVnd: r.revenueVnd })));

        // Union các ngày có order hoặc có trip để bảng so sánh không khuyết cột.
        const ordersByDate = mergeByDate(revenueStats, (r) => r.orders);
        const allDates = Array.from(new Set([...ordersByDate.keys(), ...tripsByDate.keys()])).sort();
        setOrdersVsTrips(
          allDates.map((date) => ({
            date,
            orders: ordersByDate.get(date) ?? 0,
            trips: tripsByDate.get(date) ?? 0,
          }))
        );

        setAiCalls(aiCallStats.map((r) => ({ date: r.date, calls: r.count })));

        const totalTrips = dash.totalTrips ?? 0;
        const published = dash.publishedTrips ?? 0;
        setPublishSplit([
          { name: "Công khai", value: published },
          { name: "Riêng tư", value: Math.max(totalTrips - published, 0) },
        ]);
      } catch (err) {
        console.error("Failed to load admin analytics:", err);
      }
      if (alive) setLoading(false);
    };

    const loadPostHog = async () => {
      setPostHogLoading(true);
      try {
        const [pv, ev, fn] = await Promise.all([
          adminApi.getAnalyticsPageviews(14),
          adminApi.getAnalyticsEvents(30),
          adminApi.getAnalyticsFunnel(30),
        ]);
        if (!alive) return;
        setPageviews(pv.map((r) => ({ day: r.date.slice(5), count: r.count })));
        setEvents(ev.map((e) => ({ label: EVENT_LABELS[e.event] || e.event, count: e.count })));
        setFunnel(
          fn.map((f, i) => ({
            name: EVENT_LABELS[f.event] || f.event,
            value: f.count,
            fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
          }))
        );
      } catch (err) {
        console.error("Failed to load PostHog analytics:", err);
      }
      if (alive) setPostHogLoading(false);
    };

    loadCore();
    loadPostHog();
    return () => {
      alive = false;
    };
  }, []);

  return {
    dashboard,
    trend,
    revenue,
    ordersVsTrips,
    aiCalls,
    publishSplit,
    pageviews,
    events,
    funnel,
    loading,
    postHogLoading,
  };
}
