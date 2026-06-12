import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ExternalLink, Trash2, Check, MessageSquare, Map } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminReports, useResolveReport } from "@/features/moderation/useModeration";
import type { ContentReport, ReportStatus } from "@/integrations/api/modules/moderation";

const STATUS_TABS: { key: ReportStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Chờ xử lý" },
  { key: "RESOLVED", label: "Đã xóa" },
  { key: "DISMISSED", label: "Đã bỏ qua" },
  { key: "ALL", label: "Tất cả" },
];

function statusBadge(status: ReportStatus) {
  if (status === "PENDING") return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">Chờ xử lý</Badge>;
  if (status === "RESOLVED") return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15">Đã xóa</Badge>;
  return <Badge variant="secondary">Đã bỏ qua</Badge>;
}

function ReportCard({ report }: { report: ContentReport }) {
  const resolveMutation = useResolveReport();
  const isComment = report.targetType === "TRIP_COMMENT";

  const handle = async (action: "DELETE_CONTENT" | "DISMISS") => {
    try {
      await resolveMutation.mutateAsync({ reportId: report.id, action });
      toast.success(action === "DELETE_CONTENT" ? "Đã xóa nội dung vi phạm" : "Đã bỏ qua báo cáo");
    } catch {
      toast.error("Xử lý báo cáo thất bại");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {isComment ? <MessageSquare className="w-3.5 h-3.5" /> : <Map className="w-3.5 h-3.5" />}
          {isComment ? "Bình luận" : "Lịch trình công khai"}
        </span>
        {statusBadge(report.status)}
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground break-words">
        {report.targetPreview ?? <span className="italic text-muted-foreground">[Nội dung đã bị xóa]</span>}
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Người báo cáo: <span className="font-medium text-foreground">{report.reporterName ?? `#${report.reporterUserId}`}</span></p>
        {report.reason && <p>Lý do: {report.reason}</p>}
        <p>{new Date(report.createdAt).toLocaleString("vi-VN")}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {report.tripId != null && (
          <Link to={`/trips/${report.tripId}/public`} target="_blank">
            <Button variant="soft" size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Xem
            </Button>
          </Link>
        )}
        {report.status === "PENDING" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => handle("DELETE_CONTENT")}
              disabled={resolveMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" /> {isComment ? "Xóa bình luận" : "Gỡ công khai"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handle("DISMISS")} disabled={resolveMutation.isPending}>
              <Check className="w-3.5 h-3.5" /> Bỏ qua
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const AdminReports = () => {
  const [tab, setTab] = useState<ReportStatus | "ALL">("PENDING");
  const { data, isLoading } = useAdminReports(tab);
  const reports = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Kiểm duyệt nội dung</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Xử lý báo cáo bình luận & lịch trình công khai vi phạm</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
              tab === key
                ? "border-chip-orange bg-chip-orange/10 text-chip-orange"
                : "border-border bg-card text-muted-foreground hover:border-chip-orange/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-5xl">🛡️</span>
          <p className="text-muted-foreground">
            {tab === "PENDING" ? "Không có báo cáo nào chờ xử lý — cộng đồng đang sạch! 🎉" : "Không có báo cáo nào"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
