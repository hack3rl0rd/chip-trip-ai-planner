import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileImage, FileText, Link2, Download, Check } from "lucide-react";
import { toast } from "sonner";
import type { TripPlan } from "@/lib/trip-data";
import { getPlaceImage } from "@/lib/place-image";

interface Props {
  trip: TripPlan;
  children: React.ReactNode;
}

const exportOptions = [
  { id: "image", label: "Ảnh đẹp (Instagram)", desc: "Xuất ảnh dọc story-ready", icon: FileImage, emoji: "📸", color: "bg-pink-100 text-pink-600" },
  { id: "pdf", label: "PDF chi tiết", desc: "Bao gồm bản đồ & chi phí", icon: FileText, emoji: "📄", color: "bg-blue-100 text-blue-600" },
  { id: "link", label: "Link chia sẻ", desc: "Copy link cho bạn bè", icon: Link2, emoji: "🔗", color: "bg-green-100 text-green-600" },
];

const ExportDialog = ({ trip, children }: Props) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string[]>([]);

  const handleExport = async (type: string) => {
    setExporting(type);

    // Simulate export
    await new Promise(r => setTimeout(r, 1500));

    if (type === "link") {
      await navigator.clipboard.writeText(`${window.location.origin}/result?id=${trip.id}`);
      toast.success("Đã sao chép link chia sẻ!");
    } else if (type === "pdf") {
      toast.success("PDF đang được tạo!", { description: "Tính năng sẽ hoạt động đầy đủ khi kết nối backend" });
    } else if (type === "image") {
      toast.success("Ảnh đang được tạo!", { description: "Tính năng sẽ hoạt động đầy đủ khi kết nối backend" });
    }

    setExported(prev => [...prev, type]);
    setExporting(null);
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
