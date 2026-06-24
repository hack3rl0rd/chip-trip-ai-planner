import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Calendar, Eye, Trash2, Plus, Pencil, Check, X, Loader2, Share2,
  Globe, Map, Plane, Camera, Luggage, MapPin, Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { type TripPlan } from "@/features/planning/trip-data";
import type { TripLifecycleStatus } from "@/integrations/api/types";
import { getPlaceImage } from "@/features/planning/place-image";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import { tripsApi } from "@/integrations/api";
import { useMyTrips, useDeleteTrip } from "@/hooks/useApi";
import { parseTripStyles } from "@/lib/trip-mapper";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SavedPlans = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: tripsData, isLoading, refetch } = useMyTrips();
  const deleteMutation = useDeleteTrip();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [tab, setTab] = useState<TripLifecycleStatus>("UPCOMING");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/saved" } });
    }
  }, [user, authLoading]);

  const trips = (tripsData || []).map((t) => ({
    id: String(t.id),
    imageUrl: t.imageUrl || null,
    isPublic: !!t.isPublic,
    status: (t.status || "UPCOMING") as TripLifecycleStatus,
    trip: {
      id: String(t.id),
      destination: t.destination,
      title: t.title,
      days: [],
      totalCost: t.totalCostVnd ? `${(t.totalCostVnd / 1_000_000).toFixed(1)}M` : "~0",
      rating: 4.8,
      duration: "",
      image: t.imageUrl || "/placeholder.svg",
      tags: parseTripStyles(t.styles),
      dateRange: t.dateStart && t.dateEnd
        ? `${new Date(t.dateStart).toLocaleDateString("vi-VN")} - ${new Date(t.dateEnd).toLocaleDateString("vi-VN")}`
        : new Date(t.createdAt).toLocaleDateString("vi-VN"),
    } as TripPlan,
    created_at: t.createdAt,
  }));

  const counts = {
    UPCOMING: trips.filter((t) => t.status === "UPCOMING").length,
    ONGOING: trips.filter((t) => t.status === "ONGOING").length,
    COMPLETED: trips.filter((t) => t.status === "COMPLETED").length,
  };
  const visibleTrips = trips.filter((t) => t.status === tab);

  // Mở mặc định tab có chuyến phù hợp nhất: Đang đi > Sắp đi > Đã đi (chạy 1 lần khi data về)
  const didInitTab = useRef(false);
  useEffect(() => {
    if (didInitTab.current || !tripsData) return;
    didInitTab.current = true;
    if (counts.ONGOING > 0) setTab("ONGOING");
    else if (counts.UPCOMING > 0) setTab("UPCOMING");
    else if (counts.COMPLETED > 0) setTab("COMPLETED");
  }, [tripsData]);

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(Number(id));
    toast.success("Đã xóa chuyến đi");
  };

  const handleRenameStart = (dbId: string, title: string) => {
    setEditingId(dbId);
    setEditValue(title);
  };

  const handleRenameConfirm = () => {
    setEditingId(null);
    refetch();
  };

  const handleShareTrip = async (id: string) => {
    try {
      const result = await tripsApi.enableShare(Number(id));
      const shareUrl = `${window.location.origin}/result?shared=${result.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép link chia sẻ!", { description: shareUrl });
    } catch (err) {
      toast.error("Lỗi khi tạo link chia sẻ");
    }
  };

  const getImage = (trip: TripPlan, imageUrl?: string | null) => {
    return imageUrl || trip.image || getPlaceImage(trip.destination || trip.title, "attraction", 600, 400);
  };

  const TABS: { key: TripLifecycleStatus; label: string }[] = [
    { key: "UPCOMING", label: "Sắp đi" },
    { key: "ONGOING", label: "Đang đi" },
    { key: "COMPLETED", label: "Đã đi" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero band */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(70% 120% at 85% -20%, hsl(var(--chip-orange) / 0.16), transparent 60%), radial-gradient(60% 100% at 0% 0%, hsl(var(--chip-yellow) / 0.12), transparent 55%)",
          }}
        />
        <div className="relative pt-28 pb-9 px-6">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-chip-orange">
                  <Sparkles className="w-3.5 h-3.5" /> Bộ sưu tập của bạn
                </p>
                <h1 className="font-display font-bold text-foreground text-3xl sm:text-4xl lg:text-5xl leading-[1.06] tracking-tight mt-4">
                  Chuyến đi của tôi
                </h1>
                <p className="text-muted-foreground mt-3 text-[15px]">
                  {trips.length} kế hoạch đã lưu
                </p>
              </div>
              <Link to="/planning" className="shrink-0">
                <Button variant="hero" size="lg">
                  <Plus className="w-4 h-4" /> Tạo chuyến mới
                </Button>
              </Link>
            </motion.div>

            {/* Tabs trạng thái chuyến đi */}
            {!isLoading && trips.length > 0 && (
              <div className="flex gap-2 mt-7 overflow-x-auto pb-1 scrollbar-none">
                {TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      tab === key
                        ? "border-chip-orange bg-chip-orange/10 text-chip-orange"
                        : "border-border bg-card/70 text-muted-foreground hover:border-chip-orange/40 hover:text-foreground"
                    }`}
                  >
                    {key === "ONGOING" && counts.ONGOING > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    {label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === key ? "bg-chip-orange text-white" : "bg-muted text-muted-foreground"}`}>
                      {counts[key]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 pb-14 px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
              <p className="text-muted-foreground">Đang tải…</p>
            </div>
          ) : trips.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="w-16 h-16 rounded-2xl bg-chip-orange/10 border border-chip-orange/20 flex items-center justify-center text-chip-orange">
                <Map className="w-7 h-7" />
              </span>
              <p className="text-muted-foreground text-lg">Chưa có chuyến đi nào được lưu</p>
              <Link to="/planning"><Button variant="hero" size="lg">Tạo chuyến đi đầu tiên</Button></Link>
            </motion.div>
          ) : visibleTrips.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <span className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                {tab === "UPCOMING" ? <Luggage className="w-6 h-6" /> : tab === "ONGOING" ? <Plane className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
              </span>
              <p className="text-muted-foreground">
                {tab === "UPCOMING" ? "Không có chuyến nào sắp đi" : tab === "ONGOING" ? "Không có chuyến nào đang diễn ra" : "Chưa có chuyến nào đã đi"}
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              <AnimatePresence>
                {visibleTrips.map(({ id, trip, imageUrl, isPublic, status }, i) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
                    className="group relative bg-card rounded-3xl border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1.5"
                  >
                    {/* hover keyline */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r from-transparent via-chip-orange to-chip-yellow opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative h-44 overflow-hidden">
                      <img src={getImage(trip, imageUrl)} alt={trip.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/10" />

                      <div className="absolute top-3 right-3 flex gap-1.5">
                        {trip.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-semibold text-foreground shadow-sm">{tag}</span>
                        ))}
                      </div>
                      <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                        {status === "ONGOING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-semibold shadow-warm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Đang đi
                          </span>
                        )}
                        {status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground/75 text-background text-xs font-semibold backdrop-blur-sm">
                            <Check className="w-3 h-3" /> Đã đi
                          </span>
                        )}
                        {isPublic && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-chip-orange text-white text-xs font-semibold shadow-warm">
                            <Globe className="w-3 h-3" /> Công khai
                          </span>
                        )}
                      </div>

                      {trip.destination && (
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-white font-display font-semibold text-sm drop-shadow truncate max-w-[80%]">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-chip-yellow" />
                          <span className="truncate">{trip.destination}</span>
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {editingId === id ? (
                        <div className="flex items-center gap-1.5">
                          <input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()} className="flex-1 h-8 px-2 rounded-lg border border-chip-orange bg-background text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-chip-orange/20" autoFocus />
                          <button onClick={handleRenameConfirm} className="p-1 rounded-md hover:bg-muted text-chip-orange"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-foreground text-[15px] flex-1 truncate">{trip.title}</h3>
                          <button onClick={() => handleRenameStart(id, trip.title)} className="p-1 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Đổi tên chuyến đi"><Pencil className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">{trip.dateRange}</span>
                        <span className="ml-auto font-display font-bold text-chip-orange tabular-nums">{trip.totalCost}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="soft" size="sm" className="flex-1" onClick={() => navigate(`/result?id=${id}`)}>
                          <Eye className="w-3.5 h-3.5" /> Xem lại
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareTrip(id)} title="Chia sẻ" aria-label="Chia sẻ chuyến đi">
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" aria-label="Xóa chuyến đi"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa chuyến đi?</AlertDialogTitle>
                              <AlertDialogDescription>Bạn có chắc muốn xóa "{trip.title}"? Hành động này không thể hoàn tác.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPlans;
