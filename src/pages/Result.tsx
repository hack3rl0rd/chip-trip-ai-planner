import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Wallet, Star, Bookmark, Share2, Check, Download, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Copy, Trash2, GripVertical, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { generateTrip, generatePackingList, type TripPlan, type TripItem } from "@/lib/trip-data";
import PackingList from "@/components/PackingList";
import ExportDialog from "@/components/ExportDialog";
import SuggestAlternativeModal from "@/components/SuggestAlternativeModal";
import WeatherWidget from "@/components/WeatherWidget";
import GroupPanel from "@/components/GroupPanel";
import SplitBill from "@/components/SplitBill";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const bookingIcons: Record<string, React.ElementType> = {
  hotel: Hotel, restaurant: UtensilsCrossed, attraction: Ticket, cafe: Coffee, transport: MapPin,
};
const bookingLabels: Record<string, string> = {
  hotel: "Đặt phòng", restaurant: "Xem quán", attraction: "Mua vé", cafe: "Xem quán", transport: "Đặt xe",
};

const Result = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, profile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [swapModal, setSwapModal] = useState<{ open: boolean; item: TripItem | null; dayIdx: number; itemIdx: number }>({ open: false, item: null, dayIdx: 0, itemIdx: 0 });

  const initialTrip: TripPlan = state?.trip || generateTrip("Đà Nẵng", "2026-03-15", "2026-03-17", 3, []);
  const [trip, setTrip] = useState<TripPlan>(initialTrip);

  const packingItems = generatePackingList(
    trip.destination,
    trip.days.length,
    trip.tags.map(t => {
      const map: Record<string, string> = { "Chữa lành": "healing", "Ẩm thực": "food", "Sống ảo": "photo", "Mạo hiểm": "adventure" };
      return map[t] || "";
    }).filter(Boolean)
  );

  const mapPins = trip.days.flatMap(d => d.items).filter(i => i.address);
  const mapQuery = mapPins.length > 0
    ? mapPins.map(i => i.address || i.title).join("|")
    : trip.destination + " du lịch";
  const mapSrc = `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(mapQuery)}&zoom=12`;

  const handleSave = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu lịch trình");
      navigate("/auth", { state: { from: "/result" } });
      return;
    }

    try {
      const { error } = await supabase.from("trips").insert({
        user_id: user.id,
        destination: trip.destination,
        start_date: trip.days[0]?.date || null,
        end_date: trip.days[trip.days.length - 1]?.date || null,
        trip_data: trip as any,
      });
      if (error) throw error;
      setSaved(true);
      toast.success("Đã lưu kế hoạch!", {
        description: "Xem lại trong \"Chuyến đi của tôi\"",
        action: { label: "Xem ngay", onClick: () => navigate("/saved") },
      });
    } catch (error: any) {
      toast.error("Lưu thất bại: " + (error.message || "Có lỗi xảy ra"));
    }
  };

  const handleShare = async () => {
    const shareData = { title: trip.title, text: `Xem lịch trình ${trip.title} trên Chip Trip! 🐥`, url: window.location.href };
    try {
      if (navigator.share) { await navigator.share(shareData); }
      else { await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`); toast.success("Đã sao chép link!"); }
    } catch { /* cancelled */ }
  };

  const handleItemClick = (item: TripItem) => {
    navigate("/location", { state: { item } });
  };

  const handleBooking = (e: React.MouseEvent, item: TripItem) => {
    e.stopPropagation();
    if (item.bookingUrl) { window.open(item.bookingUrl, "_blank"); }
    else { window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title + " " + (item.address || trip.destination))}`, "_blank"); }
  };

  const handleClone = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để clone lịch trình");
      return;
    }
    const cloned: TripPlan = { ...trip, id: Date.now().toString(), title: trip.title + " (bản sao)" };
    try {
      await supabase.from("trips").insert({
        user_id: user.id,
        destination: cloned.destination,
        trip_data: cloned as any,
      });
      toast.success("Đã clone lịch trình!", {
        description: "Bản sao đã được lưu vào \"Chuyến đi của tôi\"",
        action: { label: "Xem ngay", onClick: () => navigate("/saved") },
      });
    } catch {
      toast.error("Clone thất bại");
    }
  };

  const handleDeleteItem = (dayIdx: number, itemIdx: number) => {
    setTrip(prev => ({
      ...prev,
      days: prev.days.map((day, di) =>
        di === dayIdx ? { ...day, items: day.items.filter((_, ii) => ii !== itemIdx) } : day
      ),
    }));
    toast.success("Đã xóa hoạt động");
  };

  const handleMoveItem = (dayIdx: number, itemIdx: number, direction: "up" | "down") => {
    setTrip(prev => {
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
    setTrip(prev => ({
      ...prev,
      days: prev.days.map((day, di) =>
        di === dayIdx
          ? { ...day, items: day.items.map((item, ii) => ii === itemIdx ? { ...newItem, id: item.id, time: item.time, image: item.image } : item) }
          : day
      ),
    }));
    toast.success("Đã đổi hoạt động!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
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
                        if (!costStr || costStr === "") return sum;
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

                {/* Weather Widget */}
                <WeatherWidget
                  destination={trip.destination}
                  dates={trip.days.map(d => d.date).filter(Boolean)}
                />
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
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="soft" size="sm" onClick={handleShare}><Share2 className="w-4 h-4" /></Button>
                    <ExportDialog trip={trip}><Button variant="soft" size="sm"><Download className="w-4 h-4" /></Button></ExportDialog>
                    <Button variant="soft" size="sm" onClick={handleClone}><Copy className="w-4 h-4" /> Clone</Button>
                    <GroupPanel tripId={trip.id} isOwner={true} />
                    <SplitBill tripId={trip.id} memberNames={user ? { [user.id]: profile?.display_name || user.email?.split("@")[0] || "Bạn" } : {}} />
                    <Button variant={editMode ? "hero" : "soft"} size="sm" onClick={() => setEditMode(!editMode)}>
                      {editMode ? <Check className="w-4 h-4" /> : <GripVertical className="w-4 h-4" />}
                      {editMode ? "Xong" : "Sửa"}
                    </Button>
                    <Button variant={saved ? "soft" : "hero"} size="sm" onClick={handleSave} disabled={saved}>
                      {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {saved ? "Đã lưu" : "Lưu"}
                    </Button>
                  </div>
                </div>
              </motion.div>

              <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="itinerary">📋 Lịch trình</TabsTrigger>
                  <TabsTrigger value="packing">🎒 Chuẩn bị đồ</TabsTrigger>
                </TabsList>

                <TabsContent value="itinerary" className="space-y-6 mt-4">
                  {trip.days.map((day, dayIdx) => (
                    <motion.div key={day.day} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIdx * 0.15 }} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-1.5 rounded-full bg-gradient-accent">
                          <span className="text-sm font-bold text-accent-foreground">{day.day}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                      </div>

                      <div className="space-y-3 pl-4 border-l-2 border-chip-orange/20 ml-4">
                        {day.items.map((item, idx) => {
                          const BookingIcon = bookingIcons[item.bookingType || "attraction"] || Ticket;
                          const bookingLabel = bookingLabels[item.bookingType || "attraction"] || "Xem thêm";

                          return (
                            <div
                              key={idx}
                              onClick={() => !editMode && handleItemClick(item)}
                              className={`relative flex gap-4 bg-card rounded-xl p-4 border border-border shadow-card hover:shadow-warm transition-all ml-4 ${editMode ? "" : "cursor-pointer hover:-translate-y-0.5"} group`}
                            >
                              <div className="absolute -left-[1.6rem] top-5 w-3 h-3 rounded-full bg-chip-orange border-2 border-background" />

                              {editMode && (
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); handleMoveItem(dayIdx, idx, "up"); }} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-chip-orange/10 text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all text-xs">▲</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMoveItem(dayIdx, idx, "down"); }} disabled={idx === day.items.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-chip-orange/10 text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all text-xs">▼</button>
                                </div>
                              )}

                              <img src={item.image} alt={item.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-chip-orange">{item.time}</span>
                                </div>
                                <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                                {!editMode && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <button onClick={(e) => handleBooking(e, item)} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chip-yellow-light hover:bg-chip-orange/10 border border-chip-yellow/30 text-xs font-semibold text-chip-orange transition-all hover:shadow-warm">
                                      <BookingIcon className="w-3 h-3" /> {bookingLabel} <ExternalLink className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSwapModal({ open: true, item, dayIdx, itemIdx: idx }); }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted hover:bg-chip-orange/10 border border-border text-xs font-medium text-muted-foreground hover:text-chip-orange transition-all"
                                    >
                                      <RefreshCw className="w-3 h-3" /> Đổi
                                    </button>
                                  </div>
                                )}
                                {editMode && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSwapModal({ open: true, item, dayIdx, itemIdx: idx }); }}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chip-yellow-light hover:bg-chip-orange/10 border border-chip-yellow/30 text-xs font-semibold text-chip-orange transition-all hover:shadow-warm"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Đổi gợi ý khác
                                  </button>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                                <span className="text-sm font-bold text-foreground">{item.cost}</span>
                                {editMode && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(dayIdx, idx); }} className="w-7 h-7 rounded-lg flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="packing" className="mt-4">
                  <PackingList items={packingItems} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

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
