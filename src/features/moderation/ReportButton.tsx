import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/useAuth";
import { useReportContent } from "@/features/moderation/useModeration";
import type { ReportTargetType } from "@/integrations/api/modules/moderation";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: number;
  /** Kiểu hiển thị: icon nhỏ (comment) hoặc text link (trip). */
  variant?: "icon" | "text";
}

const ReportButton = ({ targetType, targetId, variant = "icon" }: ReportButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const reportMutation = useReportContent();

  if (!user) return null;

  const submit = async () => {
    try {
      await reportMutation.mutateAsync({ targetType, targetId, reason: reason.trim() || null });
      toast.success("Đã gửi báo cáo. Cảm ơn bạn đã giúp giữ cộng đồng an toàn!");
      setReason("");
      setOpen(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.info("Bạn đã báo cáo nội dung này rồi");
        setOpen(false);
      } else {
        toast.error("Không gửi được báo cáo");
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <button
            className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
            aria-label="Báo cáo"
          >
            <Flag className="w-3 h-3" /> Báo cáo
          </button>
        ) : (
          <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors">
            <Flag className="w-4 h-4" /> Báo cáo
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Báo cáo nội dung vi phạm</AlertDialogTitle>
          <AlertDialogDescription>
            Mô tả ngắn lý do (không bắt buộc). Quản trị viên sẽ xem xét và xử lý.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ví dụ: spam, ngôn từ thù ghét, nội dung không phù hợp..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-chip-orange resize-none"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); submit(); }}
            disabled={reportMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {reportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gửi báo cáo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReportButton;
