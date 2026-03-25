import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Trash2, Plus, Pencil, Check, X, Loader2, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { type TripPlan } from "@/lib/trip-data";
import { getPlaceImage } from "@/lib/place-image";
import tripDanang from "@/assets/trip-danang.jpg";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SavedPlans = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<{ id: string; trip: TripPlan; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/saved" } });
      return;
    }
    if (user) fetchTrips();
  }, [user, authLoading]);

  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("id, trip_data, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTrips(data.map(row => ({
        id: row.id,
        trip: row.trip_data as unknown as TripPlan,
        created_at: row.created_at,
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (!error) {
      setTrips(prev => prev.filter(t => t.id !== id));
      toast.success("Đã xóa chuyến đi");
    }
  };

  const handleRenameStart = (dbId: string, title: string) => {
    setEditingId(dbId);
    setEditValue(title);
  };

  const handleRenameConfirm = async () => {
    if (editingId && editValue.trim()) {
      const tripRow = trips.find(t => t.id === editingId);
      if (tripRow) {
        const updatedTrip = { ...tripRow.trip, title: editValue.trim() };
        await supabase.from("trips").update({ trip_data: updatedTrip as any }).eq("id", editingId);
        setTrips(prev => prev.map(t => t.id === editingId ? { ...t, trip: updatedTrip } : t));
        toast.success("Đã đổi tên chuyến đi");
      }
    }
    setEditingId(null);
  };

  const handleShareTrip = async (id: string, title: string) => {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Fetch error:", fetchErr);
        toast.error("Lỗi khi tạo link chia sẻ");
        return;
      }

      let shareToken = (existing as any)?.share_token;

      if (!shareToken) {
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const { error } = await supabase.from("trips").update({ share_token: token } as any).eq("id", id);
        if (error) {
          console.error("Update error:", error);
          toast.error("Không thể tạo link chia sẻ");
          return;
        }
        shareToken = token;
      }

      const shareUrl = `${window.location.origin}/result?shared=${shareToken}`;
      const sharePayload = {
        title,
        text: `Xem lịch trình ${title} trên Chip Trip! 🐥`,
        url: shareUrl,
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare({ url: shareUrl }))) {
        try {
          await navigator.share(sharePayload);
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.warn("Web Share failed, falling back to clipboard:", err);
        }
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Đã sao chép link chia sẻ!", { description: shareUrl });
      } catch (clipboardErr) {
        console.error("Clipboard error:", clipboardErr);
        window.prompt("Copy link lịch trình:", shareUrl);
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Lỗi khi tạo link chia sẻ");
    }
  };

  const getImage = (trip: TripPlan) => {
    return trip.image || trip.days?.[0]?.items?.[0]?.image || getPlaceImage(trip.destination || trip.title, "attraction", 600, 400);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Chuyến đi của tôi 🐥</h1>
              <p className="text-muted-foreground mt-1">{trips.length} kế hoạch đã lưu</p>
            </div>
            <Link to="/planning">
              <Button variant="hero" size="default">
                <Plus className="w-4 h-4" /> Tạo chuyến mới
              </Button>
            </Link>
          </motion.div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : trips.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="text-6xl">🗺️</span>
              <p className="text-muted-foreground text-lg">Chưa có chuyến đi nào được lưu</p>
              <Link to="/planning"><Button variant="hero">Tạo chuyến đi đầu tiên</Button></Link>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {trips.map(({ id, trip }, i) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-card rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img src={getImage(trip)} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        {trip.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {editingId === id ? (
                        <div className="flex items-center gap-1.5">
                          <input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()} className="flex-1 h-8 px-2 rounded-lg border border-chip-orange bg-background text-foreground text-sm font-semibold focus:outline-none" autoFocus />
                          <button onClick={handleRenameConfirm} className="p-1 rounded-md hover:bg-muted text-chip-orange"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-foreground flex-1 truncate">{trip.title}</h3>
                          <button onClick={() => handleRenameStart(id, trip.title)} className="p-1 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{trip.dateRange}</span>
                        <span className="ml-auto font-semibold text-chip-orange">{trip.totalCost}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="soft" size="sm" className="flex-1" onClick={() => navigate(`/result?id=${id}`, { state: { trip } })}>
                          <Eye className="w-3.5 h-3.5" /> Xem lại
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareTrip(id, trip.title)} title="Chia sẻ">
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm"><Trash2 className="w-3.5 h-3.5" /></Button>
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
