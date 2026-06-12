import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Wallet, Star, Bookmark, Share2, Check, Download, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Copy, Trash2, RefreshCw, Loader2, ArrowUp, ArrowDown, Plane, Globe } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import GoongMap, { type GoongMapPin } from "@/components/GoongMap";
import { generatePackingList, type TripPlan, type TripItem } from "@/features/planning/trip-data";
import { getPlaceImage } from "@/features/planning/place-image";
import PackingList from "@/features/result/PackingList";
import ExportDialog from "@/features/result/ExportDialog";
import SuggestAlternativeModal from "@/features/result/SuggestAlternativeModal";
import WeatherWidget from "@/features/result/WeatherWidget";
import FlightCard from "@/features/result/FlightCard";
import GroupPanel from "@/features/result/GroupPanel";
import SplitBill from "@/features/result/SplitBill";
import { useAuth } from "@/features/auth/useAuth";
import { tripsApi } from "@/integrations/api";
import { useTripDetail, useSharedTrip, useCloneTrip, useEnableShare } from "@/hooks/useApi";
import { usePublishTrip } from "@/features/explore/hooks/usePublicFeed";
import { mapTripDetailToPlan } from "@/lib/trip-mapper";
import { getDirection, getConsecutiveTravelTimes, formatDuration, formatDistance } from "@/lib/goong";
import { trackEvent } from "@/lib/analytics";
import ChipMascot from "@/features/result/ChipMascot";

const bookingIcons: Record<string, React.ElementType> = {
  hotel: Hotel, restaurant: UtensilsCrossed, attraction: Ticket, cafe: Coffee, transport: MapPin,
};
const formatVndShort = (vnd: number): string =>
  vnd >= 1_000_000 ? `${(vnd / 1_000_000).toFixed(1)}M` : `${Math.round(vnd / 1000)}K`;
const bookingLabels: Record<string, string> = {
  hotel: "Đặt phòng", restaurant: "Xem quán", attraction: "Mua vé", cafe: "Xem quán", transport: "Đặt xe",
};

const Result = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [swapModal, setSwapModal] = useState<{ open: boolean; item: TripItem | null; dayIdx: number; itemIdx: number }>({ open: false, item: null, dayIdx: 0, itemIdx: 0 });
  const [dbTripId, setDbTripId] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [activeDay, setActiveDay] = useState(0);
  const dayTabsRef = useRef<HTMLDivElement>(null);
  const dayButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isSharedView, setIsSharedView] = useState(false);
  const [saved, setSaved] = useState(false);
  const [routePolylines, setRoutePolylines] = useState<Array<[number, number][]>>([]);
  const [travelTimes, setTravelTimes] = useState<Record<string, { duration: number; distance: number }>>({});

  const tripIdFromState = (state as any)?.tripId as number | null;
  const tripFromState = (state as any)?.trip as TripPlan | null;
  const sharedToken = searchParams.get("shared");
  const urlTripId = searchParams.get("id");

  const { data: remoteTrip, isLoading: loadingRemote, error: remoteError } = useTripDetail(
    !sharedToken && !tripFromState ? (urlTripId ? Number(urlTripId) : tripIdFromState) : null
  );
  const { data: sharedTrip, isLoading: loadingShared, error: sharedError } = useSharedTrip(sharedToken);
  const cloneMutation = useCloneTrip();
  const enableShareMutation = useEnableShare();
  const publishMutation = usePublishTrip();
  const [isPublic, setIsPublic] = useState(false);

  // Sync trạng thái công khai từ trip detail
  useEffect(() => {
    if (remoteTrip) setIsPublic(!!remoteTrip.isPublic);
  }, [remoteTrip]);

  const tripStatus = remoteTrip?.status ?? sharedTrip?.status ?? null;

  // Chuyến ONGOING: auto-focus đúng ngày hôm nay thay vì luôn mở Ngày 1
  useEffect(() => {
    const detail = remoteTrip ?? sharedTrip;
    if (!detail || detail.status !== "ONGOING" || !detail.days?.length) return;
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const idx = detail.days.findIndex((d) => d.date === todayIso);
    if (idx >= 0) setActiveDay(idx);
  }, [remoteTrip, sharedTrip]);

  const handlePublishToggle = async () => {
    if (!dbTripId) {
      toast.error("Vui lòng lưu lịch trình trước khi đăng công khai");
      return;
    }
    const next = !isPublic;
    try {
      await publishMutation.mutateAsync({ tripId: dbTripId, isPublic: next });
      setIsPublic(next);
      trackEvent("publish", { tripId: dbTripId, isPublic: next });
      toast.success(next ? "Đã đăng công khai! 🌏" : "Đã hủy công khai", {
        description: next ? "Mọi người có thể xem lịch trình này ở trang Khám phá" : undefined,
        action: next ? { label: "Xem Khám phá", onClick: () => navigate("/explore") } : undefined,
      });
    } catch {
      toast.error(next ? "Đăng công khai thất bại" : "Hủy công khai thất bại");
    }
  };

  // Set trip from navigation state or API
  useEffect(() => {
    if (tripFromState) {
      setTrip(tripFromState);
      if (tripIdFromState) setDbTripId(tripIdFromState);
      setSaved(!!tripIdFromState);
      return;
    }

    if (sharedTrip) {
      const plan = mapTripDetailToPlan(sharedTrip);
      setTrip(plan);
      setDbTripId(sharedTrip.id);
      setSaved(true);
      setIsSharedView(true);
      return;
    }

    if (remoteTrip) {
      const plan = mapTripDetailToPlan(remoteTrip);
      setTrip(plan);
      setDbTripId(remoteTrip.id);
      setSaved(true);
      return;
    }
  }, [tripFromState, sharedTrip, remoteTrip, tripIdFromState]);

  // Hiện tất cả địa điểm của cả hành trình trên map
  const mappableItems = useMemo(
    () => (trip ? trip.days.flatMap(d => d.items).filter(i => i.lat != null && i.lng != null) : []),
    [trip]
  );
  const mapPins: GoongMapPin[] = useMemo(
    () => mappableItems.map(i => ({ lat: i.lat!, lng: i.lng!, title: i.title })),
    [mappableItems]
  );

  // Fetch Direction polylines cho toàn bộ pins của hành trình
  useEffect(() => {
    if (mapPins.length < 2) { setRoutePolylines([]); return; }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        mapPins.slice(0, -1).map((pin, i) =>
          getDirection({ lat: pin.lat, lng: pin.lng }, { lat: mapPins[i + 1].lat, lng: mapPins[i + 1].lng })
        )
      );
      if (!cancelled) setRoutePolylines(results.map(r => r?.polyline ?? []));
    })();
    return () => { cancelled = true; };
  }, [mapPins]);

  // Fetch Distance Matrix for the active day's consecutive geocoded activities
  useEffect(() => {
    if (!trip) return;
    const dayItems = trip.days[activeDay]?.items ?? [];
    const geoItems = dayItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.lat && item.lng);
    if (geoItems.length < 2) return;
    let cancelled = false;
    (async () => {
      const segments = await getConsecutiveTravelTimes(
        geoItems.map(({ item }) => ({ lat: item.lat!, lng: item.lng! }))
      );
      if (cancelled) return;
      setTravelTimes(prev => {
        const next = { ...prev };
        geoItems.slice(0, -1).forEach(({ idx }, i) => {
          if (segments[i]) next[`${activeDay}-${idx}`] = segments[i]!;
        });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [trip, activeDay]);

  const handleDayClick = useCallback((dayIdx: number) => {
    setActiveDay(dayIdx);
    const btn = dayButtonRefs.current[dayIdx];
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  useEffect(() => {
    if (dbTripId) {
      try {
        const stored = localStorage.getItem(`chip-completed-${dbTripId}`);
        if (stored) setCompletedItems(new Set(JSON.parse(stored)));
      } catch {
        // Ignore corrupt local completion cache.
      }
    }
  }, [dbTripId]);

  const packingItems = trip ? generatePackingList(
    trip.destination, trip.days.length,
    trip.tags.map(t => {
      const map: Record<string, string> = { "Chữa lành": "healing", "Ẩm thực": "food", "Sống ảo": "photo", "Mạo hiểm": "adventure" };
      return map[t] || "";
    }).filter(Boolean)
  ) : [];

  const handleSave = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập để lưu lịch trình"); navigate("/auth", { state: { from: "/result" } }); return; }
    // Trip is already saved via backend during generation — just mark as saved
    setSaved(true);
    setDbTripId(tripFromState?.id ? Number(tripFromState.id) : dbTripId);
    trackEvent("trip_saved", { tripId: tripFromState?.id ? Number(tripFromState.id) : dbTripId });
    toast.success("Đã lưu kế hoạch!", {
      description: "Xem lại trong \"Chuyến đi của tôi\"",
      action: { label: "Xem ngay", onClick: () => navigate("/saved") },
    });
  };

  const handleShare = async () => {
    if (!dbTripId) {
      toast.error("Vui lòng lưu lịch trình trước khi chia sẻ");
      return;
    }

    try {
      const result = await enableShareMutation.mutateAsync(dbTripId);
      const shareToken = result.shareToken;
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
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép link chia sẻ!", { description: shareUrl });
    } catch (err: any) {
      toast.error("Lỗi khi tạo link chia sẻ");
    }
  };

  const handleItemClick = (item: TripItem) => { navigate("/location", { state: { item, destination: trip?.destination } }); };
  const handleBooking = (e: React.MouseEvent, item: TripItem) => {
    e.stopPropagation();
    trackEvent("booking_click", {
      tripId: dbTripId,
      itemTitle: item.title,
      bookingType: item.bookingType,
      hasBookingUrl: Boolean(item.bookingUrl),
    });
    if (item.bookingUrl) window.open(item.bookingUrl, "_blank");
    else window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title + " " + (item.address || trip!.destination))}`, "_blank");
  };

  const handleClone = async () => {
    if (!dbTripId) { toast.error("Vui lòng lưu lịch trình trước"); return; }
    try {
      await cloneMutation.mutateAsync(dbTripId);
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
      if (dbTripId) {
        localStorage.setItem(`chip-completed-${dbTripId}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleDeleteItem = async (dayIdx: number, itemIdx: number) => {
    const day = remoteTrip?.days?.[dayIdx];
    const item = trip?.days[dayIdx]?.items[itemIdx];
    if (dbTripId && !isSharedView && day && item) {
       try {
         await tripsApi.deleteActivity(dbTripId, day.id, Number(item.id));
       } catch (err) {
         toast.error("Không thể xóa hoạt động trên server");
         return;
       }
    }
    setTrip(prev => prev ? ({ ...prev, days: prev.days.map((d, di) => di === dayIdx ? { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) } : d) }) : prev);
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
      
      const newTrip = { ...prev, days: newDays };

      if (dbTripId && !isSharedView) {
        const day = remoteTrip?.days?.[dayIdx];
        if (day) {
           const orderedIds = items.map(i => Number(i.id));
           tripsApi.reorderActivities(dbTripId, day.id, orderedIds).catch(() => {
              toast.error("Lỗi đồng bộ thứ tự trên server");
           });
        }
      }

      return newTrip;
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

  const loadError = remoteError || sharedError;
  if (loadError && !trip) {
    const status = (loadError as any)?.response?.status;
    const message =
      status === 403 ? "Bạn không có quyền xem lịch trình này"
      : status === 404 ? "Không tìm thấy lịch trình"
      : (loadError as any)?.response?.data?.message || "Đã có lỗi xảy ra khi tải lịch trình";
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4 px-6 text-center">
          <div className="text-5xl">{status === 403 ? "🔒" : status === 404 ? "🔍" : "⚠️"}</div>
          <h2 className="text-xl font-bold text-foreground">{message}</h2>
          <p className="text-muted-foreground max-w-sm">
            Lịch trình này có thể thuộc về người khác hoặc đã bị xóa.
          </p>
          <div className="flex gap-3">
            <Button variant="hero" onClick={() => navigate("/saved")}>Chuyến đi của tôi</Button>
            <Button variant="soft" onClick={() => navigate("/")}>Về trang chủ</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingRemote || loadingShared || !trip) {
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
        {!isSharedView && tripStatus === "ONGOING" && (
          <div className="container mx-auto px-6 mb-4">
            <div className="rounded-2xl bg-green-500/10 border border-green-500/30 px-5 py-3 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Chuyến đi đang diễn ra 🎒</p>
                <p className="text-xs text-muted-foreground">Đang mở lịch trình hôm nay — tick "Đã đi ✓" khi hoàn thành mỗi hoạt động</p>
              </div>
            </div>
          </div>
        )}
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
                  <GoongMap
                    pins={mapPins}
                    routes={routePolylines}
                    className="w-full h-full"
                    onPinClick={(idx) => handleItemClick(mappableItems[idx])}
                  />
                </div>

                <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
                  <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-chip-orange" /> Dự toán chi phí
                  </h3>
                  {/* Single source of truth: item.costVnd (số thô từ backend) — tự cập nhật khi xóa/đổi activity */}
                  <div className="space-y-2">
                    {trip.days.map(day => {
                      const dayCost = day.items.reduce((sum, item) => sum + (item.costVnd ?? 0), 0);
                      return (
                        <div key={day.day} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{day.day}</span>
                          <span className="font-semibold text-foreground">{dayCost > 0 ? formatVndShort(dayCost) : "Miễn phí"}</span>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const total = trip.days.reduce(
                      (s, day) => s + day.items.reduce((ds, item) => ds + (item.costVnd ?? 0), 0), 0);
                    return (
                      <div className="border-t border-border pt-3 flex items-center justify-between">
                        <span className="font-semibold text-foreground">Tổng ước tính</span>
                        <span className="text-lg font-bold text-gradient">{formatVndShort(total)} VNĐ</span>
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

                {!isSharedView && dbTripId && <FlightCard tripId={dbTripId} />}

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
                      {dbTripId && <SplitBill tripId={dbTripId} memberNames={user ? { [user.id]: profile?.fullName || user.email?.split("@")[0] || "Bạn" } : {}} travelerCount={trip?.days?.[0]?.items ? undefined : 2} />}
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
                          // Chuyến bay: TRANSPORT có tên/desc chỉ chuyến bay → trỏ tới card vé máy bay thay vì "Đặt xe trên Grab"
                          const isFlight = item.bookingType === "transport"
                            && /chuyến bay|máy bay|vé bay|bay từ|bay đi|sân bay/i.test(`${item.title} ${item.desc}`);
                          const BookingIcon = isFlight ? Plane : (bookingIcons[item.bookingType || "attraction"] || Ticket);
                          let bookingLabel = isFlight ? "Vé máy bay" : (bookingLabels[item.bookingType || "attraction"] || "Xem thêm");
                          if (!isFlight && item.bookingUrl) {
                            if (item.bookingUrl.toLowerCase().includes("trip.com")) bookingLabel = "Trip.com";
                            else if (item.bookingUrl.toLowerCase().includes("agoda.com")) bookingLabel = "Agoda";
                            else if (item.bookingUrl.toLowerCase().includes("booking.com")) bookingLabel = "Booking.com";
                            else if (item.bookingUrl.toLowerCase().includes("traveloka.com")) bookingLabel = "Traveloka";
                            else if (item.bookingUrl.toLowerCase().includes("hopegoo.com")) bookingLabel = "HOPEGOO";
                            else if (item.bookingUrl.toLowerCase().includes("edreams.net")) bookingLabel = "eDreams";
                          }
                          const isCompleted = completedItems.has(`${activeDay}-${idx}`);
                          const travel = travelTimes[`${activeDay}-${idx}`];

                          return (
                            <div key={idx}>
                            <div
                              onClick={() => handleItemClick(item)}
                              className={`relative flex gap-4 bg-card rounded-xl p-4 border border-border shadow-card hover:shadow-warm transition-all ml-4 cursor-pointer hover:-translate-y-0.5 group/item ${isCompleted ? "opacity-60" : ""}`}
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


                              <img src={item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType)} alt={item.title} className={`w-16 h-16 rounded-xl object-cover flex-shrink-0 ${isCompleted ? "grayscale" : ""}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-chip-orange">{item.time}</span>
                                  {isCompleted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã đi ✓</span>}
                                </div>
                                <h4 className={`font-semibold text-foreground truncate ${isCompleted ? "line-through" : ""}`}>{item.title}</h4>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isFlight && !isSharedView) {
                                        document.getElementById("flight-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                      } else {
                                        handleBooking(e, item);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chip-yellow-light hover:bg-chip-orange/10 border border-chip-yellow/30 text-xs font-semibold text-chip-orange transition-all hover:shadow-warm"
                                  >
                                    <BookingIcon className="w-3 h-3" /> {bookingLabel} {!isFlight && <ExternalLink className="w-3 h-3" />}
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setSwapModal({ open: true, item, dayIdx: activeDay, itemIdx: idx }); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-chip-orange/10 border border-border text-xs font-medium text-muted-foreground hover:text-chip-orange transition-all" title="Đổi">
                                    <RefreshCw className="w-3 h-3" /> Đổi
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(activeDay, idx); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-destructive/10 border border-border text-xs font-medium text-muted-foreground hover:text-destructive transition-all" title="Xóa">
                                    <Trash2 className="w-3 h-3" /> Xóa
                                  </button>
                                  <div className="flex items-center gap-0.5">
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
                            {travel && idx < trip.days[activeDay].items.length - 1 && (
                              <div className="flex items-center gap-2 ml-8 my-1">
                                <div className="flex-1 border-t border-dashed border-border/50" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  🚗 ~{formatDuration(travel.duration)} · {formatDistance(travel.distance)}
                                </span>
                                <div className="flex-1 border-t border-dashed border-border/50" />
                              </div>
                            )}
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
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
          {isSharedView ? (
            <>
              <Button variant="hero" size="sm" onClick={handleClone} className="gap-1.5">
                <Copy className="w-4 h-4" /> Clone về tài khoản
              </Button>
            </>
          ) : (
            <>
              <Button variant={saved ? "soft" : "hero"} size="sm" onClick={handleSave} disabled={saved} className="gap-1.5 flex-shrink-0">
                {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {saved ? "Đã lưu" : "Lưu"}
              </Button>
              {dbTripId && (
                <SplitBill tripId={dbTripId} memberNames={user ? { [user.id]: profile?.fullName || user.email?.split("@")[0] || "Bạn" } : {}} />
              )}
              <Button variant="soft" size="sm" onClick={handleShare} className="gap-1.5 flex-shrink-0">
                <Share2 className="w-4 h-4" /> Chia sẻ
              </Button>
              <Button
                variant={isPublic ? "hero" : "soft"}
                size="sm"
                onClick={handlePublishToggle}
                disabled={publishMutation.isPending}
                className="gap-1.5 flex-shrink-0"
              >
                <Globe className="w-4 h-4" />
                {isPublic ? "Hủy công khai" : "Đăng công khai"}
              </Button>
              <ExportDialog trip={trip} dbTripId={dbTripId}>
                <Button variant="soft" size="sm" className="gap-1.5 flex-shrink-0">
                  <Download className="w-4 h-4" /> Xuất
                </Button>
              </ExportDialog>
              <Button variant="soft" size="sm" onClick={handleClone} className="gap-1.5 flex-shrink-0">
                <Copy className="w-4 h-4" /> Clone
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mascot with countdown */}
      <ChipMascot
        storageKey={`chip-result-${dbTripId || "new"}`}
        countdown={trip.days[0]?.date ? { label: "Còn lại trước chuyến đi", targetDate: trip.days[0].date } : undefined}
        messages={[
          { 
            text: saved 
              ? `Lịch trình "${trip.destination}" đã lưu! Bấm bên dưới để xem lại bất cứ lúc nào 🐤`
              : "Lịch trình xịn quá! Lưu lại để không mất nha 🐤",
            delay: 1500,
            action: saved 
              ? { label: "Xem chuyến đi đã lưu", onClick: () => navigate("/saved") }
              : { label: "Lưu ngay", onClick: handleSave }
          },
          { text: "Bấm vào hoạt động để xem chi tiết, hoặc dùng nút Đổi / Xóa để chỉnh sửa nhanh! ✏️", delay: 10000 },
          { text: "Thêm bạn bè vào nhóm để chia tiền dễ hơn!", delay: 15000 },
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
