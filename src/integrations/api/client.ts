import axios from "axios";
import { handleUpgradeError } from "@/features/premium/upgradeStore";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "chiptrip_access_token";
const REFRESH_KEY = "chiptrip_refresh_token";
const USER_KEY = "chiptrip_user";

export const authStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: object) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

let refreshPromise: Promise<string> | null = null;

/**
 * Dùng chung cho HTTP interceptor và STOMP beforeConnect. Mọi request 401 xảy ra
 * cùng lúc chỉ tạo đúng một request refresh token (single-flight).
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    const newAccessToken = data.data.accessToken as string;
    authStorage.setAccessToken(newAccessToken);
    if (data.data.refreshToken) {
      authStorage.setRefreshToken(data.data.refreshToken);
    }
    window.dispatchEvent(new Event("chiptrip-auth-change"));
    return newAccessToken;
  })()
    .catch((error) => {
      authStorage.clear();
      window.dispatchEvent(new Event("chiptrip-auth-change"));
      if (window.location.pathname !== "/auth") window.location.href = "/auth";
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function isJwtExpiring(token: string, withinSeconds = 30): boolean {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return true;
    const encodedPayload = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp <= Date.now() / 1000 + withinSeconds;
  } catch {
    return true;
  }
}

/** Trả token còn hạn cho STOMP; refresh trước CONNECT nếu JWT sắp/hết hạn. */
export function getValidAccessToken(): Promise<string> {
  const token = authStorage.getAccessToken();
  if (token && !isJwtExpiring(token)) return Promise.resolve(token);
  return refreshAccessToken();
}

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && authStorage.getRefreshToken()) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Lưới an toàn cuối: lỗi credit/premium (402/403) → mở UpgradeDialog đúng lý do.
    // Pre-check ở FE là UX; đây là chốt chặn khi pre-check lệch (nhiều tab, vừa hết trial...).
    handleUpgradeError(error);

    return Promise.reject(error);
  }
);

export default apiClient;
