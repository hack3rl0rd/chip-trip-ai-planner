import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { moderationApi } from "@/integrations/api/modules/moderation";
import type { ReportStatus, ResolveAction, ReportTargetType } from "@/integrations/api/modules/moderation";

export const moderationKeys = {
  list: (status: ReportStatus | "ALL") => ["adminReports", status] as const,
  pendingCount: ["adminReportsPendingCount"] as const,
};

export function useReportContent() {
  return useMutation({
    mutationFn: (payload: { targetType: ReportTargetType; targetId: number; reason?: string | null }) =>
      moderationApi.createReport(payload),
  });
}

export function useAdminReports(status: ReportStatus | "ALL") {
  return useQuery({
    queryKey: moderationKeys.list(status),
    queryFn: () => moderationApi.adminList(status === "ALL" ? undefined : status),
  });
}

export function useReportsPendingCount(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.pendingCount,
    queryFn: () => moderationApi.adminPendingCount(),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action }: { reportId: number; action: ResolveAction }) =>
      moderationApi.adminResolve(reportId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminReports"] });
      qc.invalidateQueries({ queryKey: moderationKeys.pendingCount });
    },
  });
}
