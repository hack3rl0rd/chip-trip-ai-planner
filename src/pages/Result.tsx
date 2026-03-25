import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Wallet, Star, Bookmark, Share2, Check, Download, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Copy, Trash2, GripVertical, RefreshCw, Loader2, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { generateTrip, generatePackingList, type TripPlan, type TripItem } from "@/lib/trip-data";
import { getPlaceImage } from "@/lib/place-image";
import PackingList from "@/components/PackingList";
import ExportDialog from "@/components/ExportDialog";
import SuggestAlternativeModal from "@/components/SuggestAlternativeModal";
import WeatherWidget from "@/components/WeatherWidget";
import GroupPanel from "@/components/GroupPanel";
import SplitBill from "@/components/SplitBill";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ChipMascot from "@/components/ChipMascot";

const bookingIcons: Record<string, React.ElementType> = {
  hotel: Hotel, restaurant: UtensilsCrossed, attraction: Ticket, cafe: Coffee, transport: MapPin,
};
const bookingLabels: Record<string, string> = {
  hotel: "Đặt phòng", restaurant: "Xem quán", attraction: "Mua vé", cafe: "Xem quán", transport: "Đặt xe",
};

const Result = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [swapModal, setSwapModal] = useState<{ open: boolean; item: TripItem | null; dayIdx: number; itemIdx: number }>({ open: false, item: null, dayIdx: 0, itemIdx: 0 });
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [dbTripId, setDbTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [activeDay, setActiveDay] = useState(0);
  const dayTabsRef = useRef<HTMLDivElement>(null);
  const dayButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isSharedView, setIsSharedView] = useState(false);

  const handleDayClick = useCallback((dayIdx: number) => {
    setActiveDay(dayIdx);
    const btn = dayButtonRefs.current[dayIdx];
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  // Initialize expanded days - first 3 open by default
  useEffect(() => {
    if (trip) {
      const initial = new Set<number>();
      const limit = Math.min(3, trip.days.length);
      for (let i = 0; i < limit; i++) initial.add(i);
      setExpandedDays(initial);
      setAllExpanded(trip.days.length <= 3);
    }
  }, [trip]);

  const toggleDay = (idx: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAllDays = () => {
    if (allExpanded) {
      const initial = new Set<number>();
      for (let i = 0; i < Math.min(3, (trip?.days.length || 0)); i++) initial.add(i);
      setExpandedDays(initial);
    } else {
      const all = new Set<number>();
      trip?.days.forEach((_, i) => all.add(i));
      setExpandedDays(all);
    }
    setAllExpanded(!allExpanded);
  };

  useEffect(() => {
    const tripId = searchParams.get("id");
    const shareToken = searchParams.get("shared");
    
    if (shareToken) {
      // Shared view - load by share_token
      setLoadingTrip(true);
      setIsSharedView(true);
      supabase.from("trips").select("id, trip_data").eq("share_token", shareToken).maybeSingle().then(({ data }) => {
        if (data?.trip_data) {
          setTrip(data.trip_data as unknown as TripPlan);
          setDbTripId(data.id);
          setSaved(true);
        } else {
          toast.error("Link chia sẻ không hợp lệ hoặc đã hết hạn");
          navigate("/");
        }
        setLoadingTrip(false);
      });
    } else if (tripId) {
      setLoadingTrip(true);
      setDbTripId(tripId);
      supabase.from("trips").select("id, trip_data").eq("id", tripId).maybeSingle().then(({ data }) => {
        if (data?.trip_data) {
          setTrip(data.trip_data as unknown as TripPlan);
          setSaved(true);
        } else {
          setTrip(state?.trip || generateTrip("Đà Nẵng", "2026-03-15", "2026-03-17", 3, []));
        }
        setLoadingTrip(false);
      });
    } else if (state?.trip) {
      setTrip(state.trip as TripPlan);
    } else {
      setTrip(generateTrip("Đà Nẵng", "2026-03-15", "2026-03-17", 3, []));
    }
  }, []);

  const packingItems = trip ? generatePackingList(
    trip.destination, trip.days.length,
    trip.tags.map(t => {
      const map: Record<string, string> = { "Chữa lành": "healing", "Ẩm thực": "food", "Sống ảo": "photo", "Mạo hiểm": "adventure" };
      return map[t] || "";
    }).filter(Boolean)
  ) : [];

  const mapPins = trip ? trip.days.flatMap(d => d.items).filter(i => i.address) : [];
  const mapQuery = mapPins.length > 0
    ? mapPins.map(i => i.address || i.title).join("|")
    : (trip?.destination || "Việt Nam") + " du lịch";
  const mapSrc = `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(mapQuery)}&zoom=12`;

  const handleSave = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập để lưu lịch trình"); navigate("/auth", { state: { from: "/result" } }); return; }
    try {
      const { data, error } = await supabase.from("trips").insert({
        user_id: user.id, destination: trip!.destination,
        start_date: trip!.days[0]?.date || null, end_date: trip!.days[trip!.days.length - 1]?.date || null,
        trip_data: trip as any,
      }).select("id").single();
      if (error) throw error;
      setSaved(true);
      if (data) { setDbTripId(data.id); window.history.replaceState(null, "", `/result?id=${data.id}`); }
      toast.success("Đã lưu kế hoạch!", {
        description: "Xem lại trong \"Chuyến đi của tôi\"",
        action: { label: "Xem ngay", onClick: () => navigate("/saved") },
      });
    } catch (error: any) { toast.error("Lưu thất bại: " + (error.message || "Có lỗi xảy ra")); }
  };

  const handleShare = async () => {
    if (!dbTripId) { toast.error("Vui lòng lưu lịch trình trước khi chia sẻ"); return; }

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from("trips")
        .select("*")
        .eq("id", dbTripId)
        .maybeSingle();

      if (fetchErr) {
        console.error("Fetch error:", fetchErr);
        toast.error("Lỗi khi tạo link chia sẻ");
        return;
      }

      let shareToken = (existing as any)?.share_token;

      if (!shareToken) {
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const { error: updateErr } = await supabase
          .from("trips")
          .update({ share_token: token } as any)
          .eq("id", dbTripId);

        if (updateErr) {
          console.error("Update error:", updateErr);
          toast.error("Không thể tạo link chia sẻ");
          return;
        }

        shareToken = token;
      }

      const shareUrl = `${window.location.origin}/result?shared=${shareToken}`;
      const sharePayload = {
        title: trip!.title,
        text: `Xem lịch trình ${trip!.title} trên Chip Trip! 🐥`,
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

  const handleItemClick = (item: TripItem) => { navigate("/location", { state: { item } }); };
  const handleBooking = (e: React.MouseEvent, item: TripItem) => {
    e.stopPropagation();
    if (item.bookingUrl) window.open(item.bookingUrl, "_blank");
    else window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title + " " + (item.address || trip!.destination))}`, "_blank");
  };

  const handleClone = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập để clone lịch trình"); return; }
    const cloned: TripPlan = { ...trip!, id: Date.now().toString(), title: trip!.title + " (bản sao)" };
    try {
      await supabase.from("trips").insert({ user_id: user.id, destination: cloned.destination, trip_data: cloned as any });
      toast.success("Đã clone lịch trình!", {
        description: "Bản sao đã được lưu vào \"Chuyến đi của tôi\"",
        action: { label: "Xem ngay", onClick: () => navigate("/saved") },
      });
    } catch { toast.error("Clone thất bại"); }
  };

  const toggleCompleted = (dayIdx: number, itemIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${dayIdx}-${itemIdx}`;
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDeleteItem = (dayIdx: number, itemIdx: number) => {
    setTrip(prev => prev ? ({ ...prev, days: prev.days.map((day, di) => di === dayIdx ? { ...day, items: day.items.filter((_, ii) => ii !== itemIdx) } : day) }) : prev);
    toast.success("Đã xóa hoạt động");
  };

  const handleMoveItem = (dayIdx: number, itemIdx: number, direction: "up" | "down") => {
    setTrip(prev => {
      if (!prev) return prev;
      const newDays = [...prev.days];
      const items = [...newDays[dayIdx].items];
      const targetIdx = direction === "up" ? itemIdx - 1 : itemIdx + 1;
      if (targetIdx < 0 || targetIdx >= items.length) return prev;
      [items[itemIdx], items[targetIdx]] = [items[targetIdx], items[itemIdx]];
      newDays[dayIdx] = { ...newDays[dayIdx], items };
      return { ...prev, days: newDays };
    });
  };

  const handleSwapItem = (newItem: TripItem) => {
    const { dayIdx, itemIdx } = swapModal;
    setTrip(prev => prev ? ({
      ...prev,
      days: prev.days.map((day, di) =>
        di === dayIdx ? { ...day, items: day.items.map((item, ii) => ii === itemIdx ? { ...newItem, id: item.id, time: item.time, image: item.image } : item) } : day
      ),
    }) : prev);
    toast.success("Đã đổi hoạt động!");
  };

  if (loadingTrip || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
          <p className="text-muted-foreground">Đang tải lịch trình...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="pt-20 pb-12">
        {isSharedView && (
          <div className="container mx-auto px-6 mb-4">
            <div className="rounded-2xl bg-chip-yellow-light border border-chip-yellow/30 px-5 py-3 flex items-center gap-3">
              <span className="text-lg">👀</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Bạn đang xem lịch trình được chia sẻ</p>
                <p className="text-xs text-muted-foreground">Lịch trình này ở chế độ chỉ xem</p>
              </div>
              <Button variant="hero" size="sm" onClick={() => handleClone()}>
                <Copy className="w-3.5 h-3.5" /> Clone về tài khoản
              </Button>
            </div>
          </div>
        )}
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left - Map */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card h-[50vh]">
                  <iframe title="Bản đồ lịch trình" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapSrc} />
                </div>

                <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
                  <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-chip-orange" /> Dự toán chi phí
                  </h3>
                  <div className="space-y-2">
                    {trip.days.map(day => {
                      const dayCost = day.items.reduce((sum, item) => {
                        const costStr = item.cost.toLowerCase().replace(/[^0-9.km]/g, "");
                        if (!costStr) return sum;
                        const numMatch = costStr.match(/([0-9.]+)/);
                        if (!numMatch) return sum;
                        const num = parseFloat(numMatch[1]);
                        if (isNaN(num)) return sum;
                        if (costStr.includes("m")) return sum + num * 1000;
                        if (costStr.includes("k")) return sum + num;
                        return sum + num;
                      }, 0);
                      return (
                        <div key={day.day} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{day.day}</span>
                          <span className="font-semibold text-foreground">{dayCost > 0 ? `${dayCost >= 1000 ? `${(dayCost / 1000).toFixed(1)}M` : `${dayCost}K`}` : "Miễn phí"}</span>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const total = trip.days.reduce((s, day) => s + day.items.reduce((ds, item) => {
                      const costStr = item.cost.toLowerCase().replace(/[^0-9.km]/g, "");
                      const numMatch = costStr.match(/([0-9.]+)/);
                      if (!numMatch) return ds;
                      const num = parseFloat(numMatch[1]);
                      if (isNaN(num)) return ds;
                      if (costStr.includes("m")) return ds + num * 1000;
                      if (costStr.includes("k")) return ds + num;
                      return ds + num;
                    }, 0), 0);
                    return (
                      <div className="border-t border-border pt-3 flex items-center justify-between">
                        <span className="font-semibold text-foreground">Tổng ước tính</span>
                        <span className="text-lg font-bold text-gradient">{total >= 1000 ? `${(total / 1000).toFixed(1)}M` : `${total}K`} VNĐ</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-2xl border border-chip-yellow/30 bg-gradient-warm p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Bảo hiểm du lịch</p>
                      <p className="text-xs text-muted-foreground">Bảo vệ chuyến đi từ 49K/ngày</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="hero" size="sm" className="flex-1 text-xs">Mua bảo hiểm</Button>
                    <Button variant="ghost" size="sm" className="text-xs">Tìm hiểu</Button>
                  </div>
                </div>

                <WeatherWidget destination={trip.destination} dates={trip.days.map(d => d.date).filter(Boolean)} />
              </div>
            </div>

            {/* Right - Timeline + Tabs */}
            <div className="lg:col-span-3 space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6 border border-border shadow-card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{trip.title} 🏖️</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {trip.duration}</span>
                      <span className="flex items-center gap-1"><Wallet className="w-4 h-4" /> {trip.totalCost} VNĐ</span>
                      <span className="flex items-center gap-1"><Star className="w-4 h-4 text-chip-yellow" /> {trip.rating}</span>
                    </div>
                  </div>
                  {/* Minimal header actions - main actions in floating bar */}
                  {!isSharedView && (
                    <div className="flex gap-2 flex-wrap">
                      {dbTripId && <GroupPanel tripId={dbTripId} isOwner={true} />}
                      {dbTripId && <SplitBill tripId={dbTripId} memberNames={user ? { [user.id]: profile?.display_name || user.email?.split("@")[0] || "Bạn" } : {}} travelerCount={trip?.days?.[0]?.items ? undefined : 2} />}
                      <Button variant={editMode ? "hero" : "soft"} size="sm" onClick={() => setEditMode(!editMode)}>
                        {editMode ? <Check className="w-4 h-4" /> : <GripVertical className="w-4 h-4" />}
                        {editMode ? "Xong" : "Sửa"}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>

              <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="itinerary">📋 Lịch trình</TabsTrigger>
                  <TabsTrigger value="packing">🎒 Chuẩn bị đồ</TabsTrigger>
                </TabsList>

                <TabsContent value="itinerary" className="space-y-4 mt-4">
                  {/* Horizontal day tabs */}
                  <div ref={dayTabsRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {trip.days.map((day, dayIdx) => {
                      const completedCount = day.items.filter((_, idx) => completedItems.has(`${dayIdx}-${idx}`)).length;
                      const allDone = completedCount === day.items.length && day.items.length > 0;
                      return (
                        <button
                          key={dayIdx}
                          ref={(el) => { dayButtonRefs.current[dayIdx] = el; }}
                          onClick={() => handleDayClick(dayIdx)}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                            activeDay === dayIdx
                              ? "border-chip-orange bg-chip-orange/10 text-chip-orange shadow-warm"
                              : "border-border bg-card text-muted-foreground hover:border-chip-orange/40"
                          }`}
                        >
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeDay === dayIdx ? "bg-chip-orange text-white" : "bg-muted text-muted-foreground"}`}>
                            {day.day}
                          </span>
                          <span className="hidden sm:inline">{day.date}</span>
                          {allDone && <Check className="w-3.5 h-3.5 text-green-500" />}
                          {!allDone && completedCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">{completedCount}/{day.items.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active day items */}
                  {trip.days[activeDay] && (
                    <motion.div key={activeDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                      <div className="space-y-3 pl-4 border-l-2 border-chip-orange/20 ml-4">
                        {trip.days[activeDay].items.map((item, idx) => {
                          const BookingIcon = bookingIcons[item.bookingType || "attraction"] || Ticket;
                          const bookingLabel = bookingLabels[item.bookingType || "attraction"] || "Xem thêm";
                          const isCompleted = completedItems.has(`${activeDay}-${idx}`);

                          return (
                            <div
                              key={idx}
                              onClick={() => !editMode && handleItemClick(item)}
                              className={`relative flex gap-4 bg-card rounded-xl p-4 border border-border shadow-card hover:shadow-warm transition-all ml-4 ${editMode ? "" : "cursor-pointer hover:-translate-y-0.5"} group/item ${isCompleted ? "opacity-60" : ""}`}
                            >
                              <div className={`absolute -left-[1.6rem] top-5 w-3 h-3 rounded-full border-2 border-background ${isCompleted ? "bg-green-500" : "bg-chip-orange"}`} />

                              {/* Completion checkbox */}
                              <button
                                onClick={(e) => toggleCompleted(activeDay, idx, e)}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  isCompleted
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-border hover:border-chip-orange"
                                }`}
                              >
                                {isCompleted && <Check className="w-3.5 h-3.5" />}
                              </button>

                              {editMode && (
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); handleMoveItem(activeDay, idx, "up"); }} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-chip-orange/10 text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all text-xs">▲</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMoveItem(activeDay, idx, "down"); }} disabled={idx === trip.days[activeDay].items.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-chip-orange/10 text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all text-xs">▼</button>
                                </div>
                              )}

                              <img src={item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType)} alt={item.title} className={`w-16 h-16 rounded-xl object-cover flex-shrink-0 ${isCompleted ? "grayscale" : ""}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-chip-orange">{item.time}</span>
                                  {isCompleted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã đi ✓</span>}
                                </div>
                                <h4 className={`font-semibold text-foreground truncate ${isCompleted ? "line-through" : ""}`}>{item.title}</h4>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <button onClick={(e) => handleBooking(e, item)} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chip-yellow-light hover:bg-chip-orange/10 border border-chip-yellow/30 text-xs font-semibold text-chip-orange transition-all hover:shadow-warm">
                                    <BookingIcon className="w-3 h-3" /> {bookingLabel} <ExternalLink className="w-3 h-3" />
                                  </button>
                                  <div className="hidden group-hover/item:flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setSwapModal({ open: true, item, dayIdx: activeDay, itemIdx: idx }); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-chip-orange/10 border border-border text-xs font-medium text-muted-foreground hover:text-chip-orange transition-all" title="Đổi">
                                      <RefreshCw className="w-3 h-3" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(activeDay, idx); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-destructive/10 border border-border text-xs font-medium text-muted-foreground hover:text-destructive transition-all" title="Xóa">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMoveItem(activeDay, idx, "up"); }} disabled={idx === 0} className="inline-flex items-center px-1.5 py-1 rounded-lg bg-muted hover:bg-chip-orange/10 border border-border text-xs text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all" title="Lên">
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMoveItem(activeDay, idx, "down"); }} disabled={idx === trip.days[activeDay].items.length - 1} className="inline-flex items-center px-1.5 py-1 rounded-lg bg-muted hover:bg-chip-orange/10 border border-border text-xs text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all" title="Xuống">
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm font-bold text-foreground">{item.cost}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="packing" className="mt-4">
                  <PackingList items={packingItems} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-lg border-t border-border">
        <div className="container mx-auto px-6 py-3 flex items-center justify-center gap-3">
          {isSharedView ? (
            <>
              <Button variant="hero" size="sm" onClick={handleClone} className="gap-1.5">
                <Copy className="w-4 h-4" /> Clone về tài khoản
              </Button>
            </>
          ) : (
            <>
              <Button variant={saved ? "soft" : "hero"} size="sm" onClick={handleSave} disabled={saved} className="gap-1.5">
                {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {saved ? "Đã lưu" : "Lưu"}
              </Button>
              {dbTripId && (
                <SplitBill tripId={dbTripId} memberNames={user ? { [user.id]: profile?.display_name || user.email?.split("@")[0] || "Bạn" } : {}} />
              )}
              <Button variant="soft" size="sm" onClick={handleShare} className="gap-1.5">
                <Share2 className="w-4 h-4" /> Chia sẻ
              </Button>
              <ExportDialog trip={trip} dbTripId={dbTripId}>
                <Button variant="soft" size="sm" className="gap-1.5">
                  <Download className="w-4 h-4" /> Xuất
                </Button>
              </ExportDialog>
              <Button variant="soft" size="sm" onClick={handleClone} className="gap-1.5">
                <Copy className="w-4 h-4" /> Clone
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mascot */}
      <ChipMascot
        storageKey="chip-result-welcome"
        messages={[
          { text: "Lịch trình xịn quá! Lưu lại để không mất nha 🐤", delay: 1500 },
          { text: "Thêm bạn bè vào nhóm để chia tiền dễ hơn!", delay: 10000 },
        ]}
      />

      <SuggestAlternativeModal
        open={swapModal.open}
        onClose={() => setSwapModal(prev => ({ ...prev, open: false }))}
        item={swapModal.item}
        onSelect={handleSwapItem}
      />
    </div>
  );
};

export default Result;
