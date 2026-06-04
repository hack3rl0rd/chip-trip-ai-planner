import apiClient from "../client";
import type { ApiResponse } from "../types";

export interface AdminUserSummary {
  id: number;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  aiCredits: number;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTripSummary {
  id: number;
  title: string;
  departure: string | null;
  destination: string;
  dateStart: string | null;
  dateEnd: string | null;
  peopleCount: number | null;
  budgetVnd: number | null;
  styles: string | null;
  createdAt: string;
}

export interface AdminAiUsageSummary {
  totalCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
}

export interface AdminUserDetail {
  id: number;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  aiCredits: number;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  trips: AdminTripSummary[];
  aiUsage: AdminAiUsageSummary | null;
  activeSessionCount: number;
}

export interface AdminDashboard {
  totalUsers: number;
  totalTrips: number;
  aiCallsThisMonth: number;
  aiCostUsdThisMonth: number;
}

export interface AdminDailyCount {
  date: string;
  count: number;
}

export interface AdminAiUsageLog {
  id: number;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: string;
  userId: number;
  userEmail: string;
  userFullName: string | null;
  tripId: number | null;
  tripTitle: string | null;
}

export interface AdminAiCostByProviderMonth {
  provider: string;
  month: string;
  usageCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
}

export interface GrantCreditsPayload {
  amount: number;
}

export interface AssignRolePayload {
  role: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  aiCredits?: number;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const adminApi = {
  getUsers: async (params?: {
    search?: string;
    isActive?: boolean;
    role?: string;
    page?: number;
    size?: number;
  }) => {
    const { data } = await apiClient.get<ApiResponse<AdminUserSummary[]>>("/admin/users", { params });
    return data.data;
  },

  getUserDetail: async (userId: number) => {
    const { data } = await apiClient.get<ApiResponse<AdminUserDetail>>(`/admin/users/${userId}`);
    return data.data;
  },

  updateUser: async (userId: number, payload: UpdateUserPayload) => {
    const { data } = await apiClient.patch<ApiResponse<AdminUserSummary>>(`/admin/users/${userId}`, payload);
    return data.data;
  },

  toggleStatus: async (userId: number, enabled: boolean) => {
    const { data } = await apiClient.patch<ApiResponse<void>>(`/admin/users/${userId}/status`, { enabled });
    return data;
  },

  activateUser: async (userId: number) => {
    const { data } = await apiClient.patch<ApiResponse<void>>(`/admin/users/${userId}/activate`);
    return data;
  },

  deactivateUser: async (userId: number) => {
    const { data } = await apiClient.patch<ApiResponse<void>>(`/admin/users/${userId}/deactivate`);
    return data;
  },

  grantCredits: async (userId: number, payload: GrantCreditsPayload) => {
    const { data } = await apiClient.post<ApiResponse<AdminUserSummary>>(`/admin/users/${userId}/grant-credits`, payload);
    return data.data;
  },

  assignRole: async (userId: number, payload: AssignRolePayload) => {
    const { data } = await apiClient.post<ApiResponse<AdminUserSummary>>(`/admin/users/${userId}/roles`, payload);
    return data.data;
  },

  removeRole: async (userId: number, roleId: number) => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/admin/users/${userId}/roles/${roleId}`);
    return data;
  },

  getDashboard: async () => {
    const { data } = await apiClient.get<ApiResponse<AdminDashboard>>("/admin/stats/dashboard");
    return data.data;
  },

  getUserStats: async (from: string, to: string) => {
    const { data } = await apiClient.get<ApiResponse<AdminDailyCount[]>>("/admin/stats/users", {
      params: { from, to },
    });
    return data.data;
  },

  getTripStats: async (from: string, to: string) => {
    const { data } = await apiClient.get<ApiResponse<AdminDailyCount[]>>("/admin/stats/trips", {
      params: { from, to },
    });
    return data.data;
  },

  getAiCostStats: async (from: string, to: string) => {
    const { data } = await apiClient.get<ApiResponse<AdminAiCostByProviderMonth[]>>("/admin/stats/ai-cost", {
      params: { from, to },
    });
    return data.data;
  },

  getAllTrips: async (params?: {
    userId?: number;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) => {
    const { data } = await apiClient.get<ApiResponse<AdminTripSummary[]>>("/admin/trips", { params });
    return data.data;
  },

  getTripDetail: async (tripId: number) => {
    const { data } = await apiClient.get(`/admin/trips/${tripId}`);
    return data;
  },

  deleteTrip: async (tripId: number) => {
    const { data } = await apiClient.delete(`/admin/trips/${tripId}`);
    return data;
  },

  getAiUsages: async (params?: {
    userId?: number;
    provider?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) => {
    const { data } = await apiClient.get<ApiResponse<AdminAiUsageLog[]>>("/admin/ai-usages", { params });
    return data.data;
  },

  getAiUsageSummary: async (from?: string, to?: string) => {
    const { data } = await apiClient.get<ApiResponse<AdminAiCostByProviderMonth[]>>(
      "/admin/ai-usages/summary",
      { params: { from, to } }
    );
    return data.data;
  },
};
