import apiClient from "../client";
import type { ApiResponse, PageMeta } from "../types";

export type ReportTargetType = "TRIP_COMMENT" | "PUBLIC_TRIP";
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
export type ResolveAction = "DELETE_CONTENT" | "DISMISS";

export interface ContentReport {
  id: number;
  reporterUserId: number;
  reporterName: string | null;
  targetType: ReportTargetType;
  targetId: number;
  targetPreview: string | null;
  tripId: number | null;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReportsPage {
  items: ContentReport[];
  meta: PageMeta;
}

export const moderationApi = {
  /** User báo cáo 1 comment hoặc trip public. */
  createReport: async (payload: { targetType: ReportTargetType; targetId: number; reason?: string | null }) => {
    const { data } = await apiClient.post<ApiResponse<ContentReport>>("/reports", payload);
    return data.data;
  },

  adminList: async (status: ReportStatus | undefined, page = 0, size = 20): Promise<ReportsPage> => {
    const { data } = await apiClient.get<ApiResponse<ContentReport[]>>("/admin/reports", {
      params: { status: status || undefined, page, size },
    });
    return { items: data.data, meta: data.meta as PageMeta };
  },

  adminPendingCount: async () => {
    const { data } = await apiClient.get<ApiResponse<{ count: number }>>("/admin/reports/pending-count");
    return data.data.count;
  },

  adminResolve: async (reportId: number, action: ResolveAction) => {
    const { data } = await apiClient.patch<ApiResponse<ContentReport>>(`/admin/reports/${reportId}/resolve`, { action });
    return data.data;
  },
};
