import posthog from "posthog-js";

type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, AnalyticsValue>;

export type AnalyticsEvent =
  | "sign_up"
  | "login_google_succeeded"
  | "generate_started"
  | "generate_succeeded"
  | "generate_failed"
  | "trip_saved"
  | "booking_click"
  | "publish"
  | "purchase_started"
  | "purchase_succeeded"
  | "purchase_failed";

let initialized = false;

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || initialized) return;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

export function trackEvent(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function trackPageView(path: string) {
  if (!initialized) return;
  posthog.capture("$pageview", {
    path,
    $current_url: window.location.href,
  });
}

export function identifyUser(userId: string | number, properties: AnalyticsProperties = {}) {
  if (!initialized) return;
  posthog.identify(String(userId), properties);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

export function analyticsError(error: unknown): AnalyticsProperties {
  if (error instanceof Error) {
    return { errorMessage: error.message.slice(0, 160) };
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return { errorMessage: String((error as { message?: unknown }).message).slice(0, 160) };
  }
  return { errorMessage: String(error).slice(0, 160) };
}
