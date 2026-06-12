import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileImage, FileText, Link2, Download, Check } from "lucide-react";
import { toast } from "sonner";
import type { TripPlan } from "@/features/planning/trip-data";
import { getPlaceImage } from "@/features/planning/place-image";
import { tripsApi } from "@/integrations/api";

interface Props {
  trip: TripPlan;
  dbTripId?: number | string | null;
  children: React.ReactNode;
}

const exportOptions = [
  { id: "image", label: "Ảnh đẹp (Instagram)", desc: "Xuất ảnh dọc story-ready", icon: FileImage, emoji: "📸", color: "bg-pink-100 text-pink-600" },
  { id: "pdf", label: "PDF chi tiết", desc: "Bao gồm bản đồ & chi phí", icon: FileText, emoji: "📄", color: "bg-blue-100 text-blue-600" },
  { id: "link", label: "Link chia sẻ", desc: "Copy link cho bạn bè", icon: Link2, emoji: "🔗", color: "bg-green-100 text-green-600" },
];

const ExportDialog = ({ trip, dbTripId, children }: Props) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string[]>([]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      if (type === "link") {
        const shareId = dbTripId || trip.id;
        await navigator.clipboard.writeText(`${window.location.origin}/result?id=${shareId}`);
        toast.success("Đã sao chép link chia sẻ!");
        setExported(prev => [...prev, type]);
      } else if (type === "pdf") {
        if (!dbTripId) {
          toast.error("Chưa lưu chuyến đi, không thể xuất PDF");
          return;
        }
        const blob = await tripsApi.downloadPdf(Number(dbTripId));
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chuyen-di-${dbTripId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã tải PDF!");
        setExported(prev => [...prev, type]);
      } else if (type === "image") {
        await new Promise(r => setTimeout(r, 1500));
        toast.success("Ảnh đang được tạo!", { description: "Tính năng sẽ hoạt động đầy đủ khi kết nối backend" });
        setExported(prev => [...prev, type]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xuất thất bại, vui lòng thử lại");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Download className="w-5 h-5 text-chip-orange" />
            Xuất & Chia sẻ lịch trình
          </DialogTitle>
        </DialogHeader>

        {/* Trip preview mini */}
        <div className="rounded-xl bg-muted/50 p-4 flex items-center gap-3">
          <img src={trip.image || getPlaceImage(trip.destination, "attraction")} alt={trip.title} className="w-14 h-14 rounded-xl object-cover" />
          <div>
            <p className="font-semibold text-foreground text-sm">{trip.title}</p>
            <p className="text-xs text-muted-foreground">{trip.dateRange} • {trip.totalCost} VNĐ</p>
          </div>
        </div>

        {/* Export options */}
        <div className="space-y-2">
          {exportOptions.map(opt => {
            const isDone = exported.includes(opt.id);
            const isLoading = exporting === opt.id;
            return (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => !isDone && handleExport(opt.id)}
                disabled={isLoading}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  isDone
                    ? "border-chip-orange/30 bg-chip-yellow-light/50"
                    : "border-border bg-card hover:border-chip-orange/40 hover:shadow-warm"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDone ? "bg-chip-orange/10" : ""}`}>
                  {opt.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-chip-orange border-t-transparent rounded-full animate-spin" />
                ) : isDone ? (
                  <Check className="w-5 h-5 text-chip-orange" />
                ) : (
                  <Download className="w-4 h-4 text-muted-foreground" />
                )}
              </motion.button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
