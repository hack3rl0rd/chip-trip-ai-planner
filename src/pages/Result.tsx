import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Wallet, Star, Bookmark, Share2, Crown, Check, Download, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Copy, Trash2, Plus, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { generateTrip, saveTrip, generatePackingList, type TripPlan, type TripItem } from "@/lib/trip-data";
import PackingList from "@/components/PackingList";
import ExportDialog from "@/components/ExportDialog";

const bookingIcons: Record<string, React.ElementType> = {
  hotel: Hotel,
  restaurant: UtensilsCrossed,
  attraction: Ticket,
  cafe: Coffee,
  transport: MapPin,
};

const bookingLabels: Record<string, string> = {
  hotel: "Đặt phòng",
  restaurant: "Xem quán",
  attraction: "Mua vé",
  cafe: "Xem quán",
  transport: "Đặt xe",
};

const Result = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

  const handleSave = () => {
    saveTrip(trip);
    setSaved(true);
    toast.success("Đã lưu kế hoạch!", {
      description: "Xem lại trong \"Chuyến đi của tôi\"",
      action: { label: "Xem ngay", onClick: () => navigate("/saved") },
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: trip.title,
      text: `Xem lịch trình ${trip.title} trên Chip Trip! 🐥`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast.success("Đã sao chép link!");
      }
    } catch {
      // User cancelled share
    }
  };

  const handleItemClick = (item: TripItem) => {
    navigate("/location", { state: { item } });
  };

  const handleBooking = (e: React.MouseEvent, item: TripItem) => {
    e.stopPropagation();
    if (item.bookingUrl) {
      window.open(item.bookingUrl, "_blank");
    } else {
      const searchQuery = encodeURIComponent(item.title + " " + (item.address || trip.destination));
      window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
    }
  };

  const handleClone = () => {
    const cloned: TripPlan = { ...trip, id: Date.now().toString(), title: trip.title + " (bản sao)" };
    saveTrip(cloned);
    toast.success("Đã clone lịch trình!", {
      description: "Bản sao đã được lưu vào \"Chuyến đi của tôi\"",
      action: { label: "Xem ngay", onClick: () => navigate("/saved") },
    });
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

  // Calculate detailed costs
  const allItems = trip.days.flatMap(d => d.items);
  const costBreakdown = allItems.reduce((sum, item) => {
    const num = parseInt(item.cost.replace(/[^0-9]/g, ""), 10);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left - Map (40%) */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card h-[50vh]">
                  <iframe
                    title="Bản đồ lịch trình"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(trip.destination + " du lịch")}&zoom=12`}
                  />
                </div>

                {/* Cost breakdown card */}
                <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
                  <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-chip-orange" /> Dự toán chi phí
                  </h3>
                  <div className="space-y-2">
                    {trip.days.map(day => {
                      const dayCost = day.items.reduce((sum, item) => {
                        const num = parseInt(item.cost.replace(/[^0-9]/g, ""), 10);
                        return sum + (isNaN(num) ? 0 : num);
                      }, 0);
                      return (
                        <div key={day.day} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{day.day}</span>
                          <span className="font-semibold text-foreground">{dayCost > 0 ? `${dayCost >= 1000 ? `${(dayCost / 1000).toFixed(1)}M` : `${dayCost}K`}` : "Miễn phí"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-semibold text-foreground">Tổng ước tính</span>
                    <span className="text-lg font-bold text-gradient">{trip.totalCost} VNĐ</span>
                  </div>
                </div>

                {/* Insurance upsell */}
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
              </div>
            </div>

            {/* Right - Timeline (60%) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-card"
              >
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
                    <ExportDialog trip={trip}>
                      <Button variant="soft" size="sm"><Download className="w-4 h-4" /></Button>
                    </ExportDialog>
                    <Button variant="soft" size="sm" onClick={handleClone}><Copy className="w-4 h-4" /> Clone</Button>
                    <Button
                      variant={editMode ? "hero" : "soft"}
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? <Check className="w-4 h-4" /> : <GripVertical className="w-4 h-4" />}
                      {editMode ? "Xong" : "Sửa"}
                    </Button>
                    <Button
                      variant={saved ? "soft" : "hero"}
                      size="sm"
                      onClick={handleSave}
                      disabled={saved}
                    >
                      {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {saved ? "Đã lưu" : "Lưu"}
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Timeline */}
              {trip.days.map((day, dayIdx) => (
                <motion.div
                  key={day.day}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIdx * 0.15 }}
                  className="space-y-3"
                >
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

                          {/* Edit controls */}
                          {editMode && (
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveItem(dayIdx, idx, "up"); }}
                                disabled={idx === 0}
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-chip-orange/10 text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all text-xs"
                              >▲</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveItem(dayIdx, idx, "down"); }}
                                disabled={idx === day.items.length - 1}
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-chip-orange/10 text-muted-foreground hover:text-chip-orange disabled:opacity-30 transition-all text-xs"
                              >▼</button>
                            </div>
                          )}

                          <img src={item.image} alt={item.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-chip-orange">{item.time}</span>
                            </div>
                            <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                            {/* Affiliate CTA */}
                            {!editMode && (
                              <button
                                onClick={(e) => handleBooking(e, item)}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chip-yellow-light hover:bg-chip-orange/10 border border-chip-yellow/30 text-xs font-semibold text-chip-orange transition-all hover:shadow-warm"
                              >
                                <BookingIcon className="w-3 h-3" />
                                {bookingLabel}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                            <span className="text-sm font-bold text-foreground">{item.cost}</span>
                            {editMode && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(dayIdx, idx); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Upsell banner after day 1 */}
                  {dayIdx === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-warm rounded-2xl p-5 border border-chip-yellow/30 ml-8"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center flex-shrink-0">
                          <Crown className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">Mở khóa Premium ✨</p>
                          <p className="text-xs text-muted-foreground">AI đề xuất chính xác quán ăn 5 sao với giá ẩn!</p>
                        </div>
                        <Button variant="hero" size="sm">Nâng cấp</Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {/* Packing List */}
              <PackingList items={packingItems} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
