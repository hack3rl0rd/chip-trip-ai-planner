import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, Clock, Wallet, Star, Bookmark, Share2, Check, Download, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Copy, Trash2, RefreshCw, Loader2, ArrowUp, ArrowDown, Plane, Globe, MoreHorizontal } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import GoongMap, { type GoongMapPin } from "@/components/GoongMap";
import SafeImage from "@/components/SafeImage";
import { type TripPlan, type TripItem } from "@/features/planning/trip-data";
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
import { authStorage } from "@/integrations/api/client";
import type { ActivityDetail, TripDetail } from "@/integrations/api/types";
import { connectTripEnrichmentSocket } from "@/integrations/ws/tripEnrichmentSocket";
import type { ReplaceActivityResponse } from "@/integrations/api/modules/trips";
import { queryKeys, useTripDetail, useSharedTrip, useCloneTrip, useEnableShare } from "@/hooks/useApi";
import { usePublishTrip } from "@/features/explore/hooks/usePublicFeed";
import { mapTripDetailToPlan } from "@/lib/trip-mapper";
import { getDirection, getConsecutiveTravelTimes, formatDuration, formatDistance } from "@/lib/goong";
import { trackEvent } from "@/lib/analytics";
import ChipMascot from "@/features/result/ChipMascot";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/* On-brand duck mark for the boarding-pass stub (decorative). */
const ChipDuck = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <ellipse cx="28" cy="42" rx="20" ry="15" fill="hsl(var(--chip-yellow))" />
    <path d="M12 44q16 13 32 0-2 12-16 12T12 44Z" fill="hsl(var(--chip-orange))" opacity="0.18" />
    <circle cx="42" cy="26" r="13" fill="hsl(var(--chip-yellow))" />
    <path d="M53 23l9-2q1 4-2 7l-7-1Z" fill="hsl(var(--chip-orange))" />
    <circle cx="45" cy="24" r="2.4" fill="#23170c" />
    <circle cx="45.8" cy="23.2" r="0.7" fill="#fff" />
  </svg>
);

/* Barcode bar heights — pure decoration, echoes the hero boarding pass. */
const BARCODE = [5, 9, 4, 11, 6, 10, 3, 8, 5, 12, 4, 7, 9, 5, 11, 6];

const bookingIcons: Record<string, React.ElementType> = {
  hotel: Hotel, restaurant: UtensilsCrossed, attraction: Ticket, cafe: Coffee, transport: MapPin,
};
const formatVndShort = (vnd: number): string =>
  vnd >= 1_000_000 ? `${(vnd / 1_000_000).toFixed(1)}M` : `${Math.round(vnd / 1000)}K`;
const bookingLabels: Record<string, string> = {
  hotel: "Đặt phòng", restaurant: "Xem quán", attraction: "Mua vé", cafe: "Xem quán", transport: "Đặt xe",
};

const formatActivityCost = (vnd: number | null | undefined): string => {
  if (!vnd) return "Miễn phí";
  return formatVndShort(vnd);
};

const parseActivityTime = (time: string | null | undefined): string => {
  if (!time) return "09:00";
  const parts = time.split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
};

const bookingTypeFromActivityType = (type: string | null | undefined): TripItem["bookingType"] => {
  switch (type) {
    case "ACCOMMODATION":
      return "hotel";
    case "FOOD":
      return "restaurant";
    case "TRANSPORT":
      return "transport";
    case "ATTRACTION":
      return "attraction";
    default:
      return "attraction";
  }
};

const tripItemFromActivity = (activity: ActivityDetail, current: TripItem): TripItem => ({
  ...current,
  id: String(activity.id),
  time: parseActivityTime(activity.startTime),
  title: activity.name,
  desc: activity.description || "",
  cost: formatActivityCost(activity.costVnd),
  costVnd: activity.costVnd ?? 0,
  image: activity.imageUrl || "/placeholder.svg",
  address: activity.address || (
    activity.latitude != null && activity.longitude != null
      ? `${activity.latitude}, ${activity.longitude}`
      : undefined
  ),
  lat: activity.latitude ?? undefined,
  lng: activity.longitude ?? undefined,
  bookingUrl: activity.bookingUrl || undefined,
  bookingType: bookingTypeFromActivityType(activity.type),
  placeCacheId: activity.placeCacheId ?? undefined,
});

const replaceActivityInTripDetail = (detail: TripDetail, activity: ActivityDetail): TripDetail => ({
  ...detail,
  days: detail.days.map((day) => ({
    ...day,
    activities: day.activities.map((item) =>
      item.id === activity.id ? { ...item, ...activity } : item
    ),
  })),
});

const applyActivityOverrides = (
  detail: TripDetail,
  overrides: Record<string, ActivityDetail>
): TripDetail => {
  if (Object.keys(overrides).length === 0) return detail;
  return {
    ...detail,
    days: detail.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => {
        const override = overrides[String(activity.id)];
        return override ? { ...activity, ...override } : activity;
      }),
    })),
  };
};

const Result = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [swapModal, setSwapModal] = useState<{ open: boolean; item: TripItem | null; dayIdx: number; itemIdx: number }>({ open: false, item: null, dayIdx: 0, itemIdx: 0 });
  const [dbTripId, setDbTripId] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [activityOverrides, setActivityOverrides] = useState<Record<string, ActivityDetail>>({});
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [activeDay, setActiveDay] = useState(() => {
    const d = Number(searchParams.get("day"));
    return Number.isInteger(d) && d >= 0 ? d : 0;
  });
  const dayTabsRef = useRef<HTMLDivElement>(null);
  const dayButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const dayListRef = useRef<HTMLDivElement>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [saved, setSaved] = useState(false);
  const [routePolylines, setRoutePolylines] = useState<Array<[number, number][]>>([]);
  const [travelTimes, setTravelTimes] = useState<Record<string, { duration: number; distance: number }>>({});

  const tripIdFromState = (state as any)?.tripId as number | null;
  const tripFromState = (state as any)?.trip as TripPlan | null;
  const sharedToken = searchParams.get("shared");
  const urlTripId = searchParams.get("id");

  const detailTripId = !sharedToken ? (urlTripId ? Number(urlTripId) : (tripIdFromState ?? dbTripId)) : null;
  const { data: remoteTrip, error: remoteError } = useTripDetail(detailTripId);
  const { data: sharedTrip, error: sharedError } = useSharedTrip(sharedToken);
  const cloneMutation = useCloneTrip();
  const enableShareMutation = useEnableShare();
  const publishMutation = usePublishTrip();
  const [isPublic, setIsPublic] = useState(false);
  const userId = user?.id;

  // Backend push khi ảnh/review đã enrich xong; polling trong useTripDetail chỉ còn là fallback.
  useEffect(() => {
    if (!userId || !detailTripId || sharedToken) return;
    const token = authStorage.getAccessToken();
    if (!token) return;
    const socket = connectTripEnrichmentSocket(
      token,
      (result) => {
        if (result.tripId === detailTripId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.tripDetail(detailTripId) });
        }
      },
      { onError: (message) => console.warn("Trip enrichment WS error:", message) }
    );
    return () => socket.disconnect();
  }, [detailTripId, queryClient, sharedToken, userId]);

  // Sync trạng thái công khai từ trip detail
  useEffect(() => {
    if (remoteTrip) setIsPublic(!!remoteTrip.isPublic);
  }, [remoteTrip]);

  const tripStatus = remoteTrip?.status ?? sharedTrip?.status ?? null;

  // Chuyến ONGOING: auto-focus đúng ngày hôm nay thay vì luôn mở Ngày 1
  // (chỉ khi người dùng chưa tự chọn ngày qua URL ?day=)
  useEffect(() => {
    if (searchParams.get("day") != null) return;
    const detail = remoteTrip ?? sharedTrip;
    if (!detail || detail.status !== "ONGOING" || !detail.days?.length) return;
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const idx = detail.days.findIndex((d) => d.date === todayIso);
    if (idx >= 0) setActiveDay(idx);
  }, [remoteTrip, sharedTrip, searchParams]);

  // Giữ activeDay trong khoảng hợp lệ khi trip đã tải (tránh ngày trong URL vượt số ngày)
  useEffect(() => {
    if (trip && activeDay > trip.days.length - 1) {
      setActiveDay(Math.max(0, trip.days.length - 1));
    }
  }, [trip, activeDay]);

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
    if (sharedTrip) {
      const plan = mapTripDetailToPlan(sharedTrip);
      setTrip(plan);
      setDbTripId(sharedTrip.id);
      setSaved(true);
      setIsSharedView(true);
      return;
    }

    if (remoteTrip) {
      const plan = mapTripDetailToPlan(applyActivityOverrides(remoteTrip, activityOverrides));
      setTrip(plan);
      setDbTripId(remoteTrip.id);
      setSaved(true);
      return;
    }

    if (tripFromState) {
      setTrip(tripFromState);
      if (tripIdFromState) setDbTripId(tripIdFromState);
      setSaved(!!tripIdFromState);
      return;
    }
  }, [tripFromState, sharedTrip, remoteTrip, tripIdFromState, activityOverrides]);

  // Ghim tripId vào URL (?id=) khi đã biết chuyến nhưng URL chưa có id (vd: vào bằng state, hoặc
  // param bị rớt). Nhờ vậy khi mở /location rồi back → Result remount vẫn còn id để tải lại,
  // tránh kẹt mãi ở màn "Đang dựng lịch trình…". Giữ nguyên state để không mất context điều hướng.
  useEffect(() => {
    if (sharedToken || !dbTripId || urlTripId) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("id", String(dbTripId));
      return next;
    }, { replace: true, state });
  }, [dbTripId, urlTripId, sharedToken, setSearchParams, state]);

  // Map và route chỉ cần dữ liệu của ngày đang xem, tránh gọi Directions cho toàn bộ chuyến đi.
  const activeDayGeoItems = useMemo(
    () => (trip?.days[activeDay]?.items ?? [])
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.lat != null && item.lng != null),
    [trip, activeDay]
  );
  const mapPins: GoongMapPin[] = useMemo(
    () => activeDayGeoItems.map(({ item }) => ({ lat: item.lat!, lng: item.lng!, title: item.title })),
    [activeDayGeoItems]
  );
  const routeCoordinateKey = useMemo(
    () => mapPins.map(pin => `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`).join("|"),
    [mapPins]
  );
  const travelCoordinateKey = useMemo(
    () => activeDayGeoItems
      .map(({ item, idx }) => `${idx}:${item.lat!.toFixed(5)},${item.lng!.toFixed(5)}`)
      .join("|"),
    [activeDayGeoItems]
  );

  // Hash tọa độ ổn định: refresh ảnh/review không làm gọi lại Directions.
  useEffect(() => {
    const points = routeCoordinateKey
      ? routeCoordinateKey.split("|").map((pair) => {
          const [lat, lng] = pair.split(",").map(Number);
          return { lat, lng };
        })
      : [];
    setRoutePolylines([]);
    if (points.length < 2) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        points.slice(0, -1).map((point, i) =>
          getDirection(point, points[i + 1])
        )
      );
      if (!cancelled) setRoutePolylines(results.map(r => r?.polyline ?? []));
    })();
    return () => { cancelled = true; };
  }, [routeCoordinateKey]);

  // Fetch Distance Matrix for the active day's consecutive geocoded activities
  useEffect(() => {
    const geoItems = travelCoordinateKey
      ? travelCoordinateKey.split("|").map((entry) => {
          const [rawIndex, coordinates] = entry.split(":");
          const [lat, lng] = coordinates.split(",").map(Number);
          return { idx: Number(rawIndex), lat, lng };
        })
      : [];
    setTravelTimes(prev => Object.fromEntries(
      Object.entries(prev).filter(([key]) => !key.startsWith(`${activeDay}-`))
    ));
    if (geoItems.length < 2) return;
    let cancelled = false;
    (async () => {
      const segments = await getConsecutiveTravelTimes(
        geoItems.map(({ lat, lng }) => ({ lat, lng }))
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
  }, [activeDay, travelCoordinateKey]);

  const handleDayClick = useCallback((dayIdx: number) => {
    setActiveDay(dayIdx);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("day", String(dayIdx));
      return next;
    }, { replace: true, state });
    const btn = dayButtonRefs.current[dayIdx];
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [setSearchParams, state]);

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

  const checklistItems = sharedTrip?.checklist ?? remoteTrip?.checklist ?? [];

  const handleSave = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập để lưu lịch trình"); navigate("/auth", { state: { from: "/result" } }); return; }
    // Trip is already saved via backend during generation — just mark as saved
    setSaved(true);
    setDbTripId(tripFromState?.id ? Number(tripFromState.id) : dbTripId);
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

  const handleSwapItem = async (response: ReplaceActivityResponse) => {
    const activity = response.activity;
    if (!activity) return;

    setActivityOverrides((prev) => ({
      ...prev,
      [String(activity.id)]: activity,
    }));

    setTrip(prev => {
      if (!prev) return prev;
      const days = prev.days.map((day, di) => {
        if (di !== swapModal.dayIdx) return day;
        return {
          ...day,
          items: day.items.map((current, ii) =>
            ii === swapModal.itemIdx || current.id === String(activity.id)
              ? tripItemFromActivity(activity, current)
              : current
          ),
        };
      });
      const totalCostVnd = days.reduce(
        (sum, day) => sum + day.items.reduce((daySum, item) => daySum + (item.costVnd ?? 0), 0),
        0
      );
      return { ...prev, days, totalCost: formatActivityCost(totalCostVnd) };
    });

    if (dbTripId) {
      queryClient.setQueryData<TripDetail | undefined>(
        queryKeys.tripDetail(dbTripId),
        (current) => current ? replaceActivityInTripDetail(current, activity) : current
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.myTrips });
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
    }
    toast.success("Đã đổi hoạt động!");
  };

  /* ── page-load entrance + scroll reveals (runs once trip is ready) ── */
  useGSAP(
    () => {
      if (!trip) return;
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          // Reduced-motion users get the page in its final, visible state.
          if (!(ctx.conditions as { motion: boolean }).motion) return;

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.from(".bp-stub", { opacity: 0, y: 10, duration: 0.45 }, 0)
            .from(".bp-meta", { opacity: 0, y: 14, stagger: 0.06, duration: 0.5 }, 0.18)
            .from(".bp-barcode", { opacity: 0, duration: 0.5 }, 0.3)
            .from(".bp-barcode span", { scaleY: 0, transformOrigin: "bottom", stagger: 0.015, duration: 0.3 }, 0.34);

          // Title: masked-line reveal — guarded + reverted so a failure can never strand the H1 hidden.
          let split: SplitText | null = null;
          try {
            split = SplitText.create(".bp-title", { type: "lines", mask: "lines", linesClass: "leading-[1.18] pb-[0.08em]" });
            tl.from(split.lines, { yPercent: 120, duration: 0.8, stagger: 0.12, clearProps: "transform" }, 0.12);
          } catch {
            /* SplitText unavailable — leave the title in its natural, visible state. */
          }

          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
            gsap.from(el, {
              opacity: 0, y: 24, duration: 0.6, ease: "power3.out",
              clearProps: "opacity,transform",
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
            });
          });

          if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
          return () => { split?.revert(); };
        }
      );
    },
    { scope: rootRef, dependencies: [!!trip] }
  );

  /* ── route-spine draws + stops stagger in on each day change ── */
  useGSAP(
    () => {
      if (!trip) return;
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          if (!(ctx.conditions as { motion: boolean }).motion) return;
          gsap.timeline({ defaults: { ease: "power3.out" } })
            .fromTo(".route-spine", { scaleY: 0 }, { scaleY: 1, duration: 0.55, ease: "power2.out" }, 0)
            .from(".stop", { opacity: 0, x: 16, stagger: 0.07, duration: 0.4 }, 0.1);
        }
      );
    },
    { scope: dayListRef, dependencies: [activeDay, !!trip], revertOnUpdate: true }
  );

  const loadError = remoteError || sharedError;
  if (loadError && !trip) {
    const status = (loadError as any)?.response?.status;
    const message =
      status === 403 ? "Bạn không có quyền xem lịch trình này"
      : status === 404 ? "Không tìm thấy lịch trình"
      : (loadError as any)?.response?.data?.message || "Đã có lỗi xảy ra khi tải lịch trình";
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4 px-6 text-center">
          <div className="text-5xl">{status === 403 ? "🔒" : status === 404 ? "🔍" : "⚠️"}</div>
          <h2 className="text-xl font-display font-bold text-foreground">{message}</h2>
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

  // URL mất ?id= (và không có shared/state/dbTripId) → không có nguồn nào để tải → báo lỗi rõ ràng
  // thay vì spin "Đang dựng lịch trình…" vô hạn. Chuyến KHÔNG mất, chỉ cần mở lại từ "Chuyến đi của tôi".
  if (!sharedToken && detailTripId == null && !trip) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4 px-6 text-center">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-display font-bold text-foreground">Không xác định được lịch trình</h2>
          <p className="text-muted-foreground max-w-sm">
            Liên kết bị thiếu mã chuyến. Lịch trình của bạn vẫn còn — mở lại từ “Chuyến đi của tôi” nhé.
          </p>
          <div className="flex gap-3">
            <Button variant="hero" onClick={() => navigate("/saved")}>Chuyến đi của tôi</Button>
            <Button variant="soft" onClick={() => navigate("/")}>Về trang chủ</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-muted-foreground">Đang dựng lịch trình…</p>
        </div>
      </div>
    );
  }

  const numDays = trip.days.length;
  const totalCostVnd = trip.days.reduce(
    (s, day) => s + day.items.reduce((ds, item) => ds + (item.costVnd ?? 0), 0), 0);
  const departDate = trip.days[0]?.date || trip.dateRange?.split(" - ")[0] || "—";
  const tripCode = dbTripId ? `CT-${String(dbTripId).padStart(4, "0")}` : "CT-NEW";

  return (
    <div ref={rootRef} className="min-h-screen bg-paper pb-28">
      <Navbar />
      <div className="pt-20 pb-12">
        {!isSharedView && tripStatus === "ONGOING" && (
          <div className="container mx-auto px-5 sm:px-6 mb-4">
            <div className="rounded-2xl bg-green-500/10 border border-dashed border-green-500/40 px-5 py-3 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-success motion-safe:animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="font-display font-semibold text-foreground text-sm">Chuyến đi đang diễn ra 🎒</p>
                <p className="text-xs text-muted-foreground">Đang mở lịch trình hôm nay — chạm vào chấm tròn để đóng dấu “đã đi ✓” mỗi hoạt động.</p>
              </div>
            </div>
          </div>
        )}
        {isSharedView && (
          <div className="container mx-auto px-5 sm:px-6 mb-4">
            <div className="rounded-2xl bg-chip-yellow-light border border-dashed border-chip-yellow/40 px-5 py-3 flex items-center gap-3">
              <span className="text-lg">👀</span>
              <div className="flex-1">
                <p className="font-display font-semibold text-foreground text-sm">Bạn đang xem lịch trình được chia sẻ</p>
                <p className="text-xs text-muted-foreground">Lịch trình này ở chế độ chỉ xem</p>
              </div>
              <Button variant="hero" size="sm" onClick={() => handleClone()}>
                <Copy className="w-3.5 h-3.5" /> Clone về tài khoản
              </Button>
            </div>
          </div>
        )}
        <div className="container mx-auto px-5 sm:px-6">
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            {/* ── Left: map + costs + add-ons (after the itinerary on mobile) ── */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24 space-y-4">
                <div data-reveal className="rounded-2xl overflow-hidden border border-border bg-card shadow-ticket">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-dashed border-border">
                    <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-chip-teal-ink flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Bản đồ hành trình
                    </span>
                    <span className="font-data text-[11px] text-muted-foreground">{mapPins.length} điểm</span>
                  </div>
                  <div className="h-[46vh]">
                    <GoongMap
                      pins={mapPins}
                      routes={routePolylines}
                      className="w-full h-full"
                      onPinClick={(idx) => handleItemClick(activeDayGeoItems[idx].item)}
                    />
                  </div>
                </div>

                <div data-reveal className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-chip-teal-ink flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Dự toán chi phí
                    </h3>
                    <span className="font-data text-[11px] text-muted-foreground">VNĐ</span>
                  </div>
                  {/* Single source of truth: item.costVnd (số thô từ backend) — tự cập nhật khi xóa/đổi activity */}
                  <div className="space-y-1.5">
                    {trip.days.map(day => {
                      const dayCost = day.items.reduce((sum, item) => sum + (item.costVnd ?? 0), 0);
                      return (
                        <div key={day.day} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{day.day}</span>
                          <span className="font-data font-bold text-foreground">{dayCost > 0 ? formatVndShort(dayCost) : "Miễn phí"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-dashed border-border pt-3 flex items-baseline justify-between">
                    <span className="font-display font-semibold text-foreground">Tổng ước tính</span>
                    <span className="font-data text-xl font-bold text-chip-orange-ink">{formatVndShort(totalCostVnd)}</span>
                  </div>
                </div>

                {!isSharedView && dbTripId && <div data-reveal><FlightCard tripId={dbTripId} createdAsPremium={remoteTrip?.createdAsPremium} /></div>}

                <div data-reveal>
                  <WeatherWidget destination={trip.destination} dates={trip.days.map(d => d.date).filter(Boolean)} />
                </div>

                {/* Upsell — kept quiet and last so utility (cost / flight / weather) outranks it. */}
                <div data-reveal className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <p className="font-display font-semibold text-foreground text-sm">Bảo hiểm du lịch</p>
                      <p className="text-xs text-muted-foreground">Bảo vệ chuyến đi từ <span className="font-data">49K</span>/ngày</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="soft" size="sm" className="flex-1 text-xs">Mua bảo hiểm</Button>
                    <Button variant="ghost" size="sm" className="text-xs">Tìm hiểu</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: boarding-pass header + itinerary (first on mobile) ── */}
            <div className="lg:col-span-3 space-y-6 order-1 lg:order-2">
              {/* Boarding pass — the deliverable, made real */}
              <header className="relative overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-ticket">
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
                  background: "radial-gradient(60% 80% at 92% 0%, hsl(var(--chip-yellow) / 0.22), transparent 60%), radial-gradient(50% 70% at 2% 100%, hsl(var(--chip-teal) / 0.12), transparent 60%)",
                }} />
                <div className="relative p-5 sm:p-7">
                  <div className="bp-stub flex items-center justify-between font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-chip-teal-ink"><ChipDuck className="w-4 h-4" /> Chip Trip</span>
                    <span>Hành trình · Itinerary</span>
                  </div>

                  <div className="mt-5 flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="bp-meta font-mono text-[11px] text-muted-foreground tracking-wide">ĐIỂM ĐẾN</p>
                      <h1 className="bp-title font-display text-3xl sm:text-[2.6rem] font-bold leading-[1.12] tracking-tight text-foreground mt-1">
                        {trip.title}
                      </h1>
                    </div>
                    {!isSharedView && (
                      <div className="flex gap-2 flex-wrap shrink-0">
                        {dbTripId && <GroupPanel tripId={dbTripId} isOwner={true} />}
                        {dbTripId && <SplitBill tripId={dbTripId} memberNames={user ? { [user.id]: profile?.fullName || user.email?.split("@")[0] || "Bạn" } : {}} travelerCount={trip?.days?.[0]?.items ? undefined : 2} />}
                      </div>
                    )}
                  </div>

                  <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 border-t border-dashed border-border pt-5">
                    <div className="bp-meta">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Thời lượng</dt>
                      <dd className="font-data text-base sm:text-lg font-bold text-foreground mt-1">{numDays} ngày</dd>
                    </div>
                    <div className="bp-meta">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Plane className="w-3 h-3" /> Khởi hành</dt>
                      <dd className="font-data text-base sm:text-lg font-bold text-foreground mt-1">{departDate}</dd>
                    </div>
                    <div className="bp-meta">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Chi phí</dt>
                      <dd className="font-data text-base sm:text-lg font-bold text-chip-orange-ink mt-1">{totalCostVnd > 0 ? formatVndShort(totalCostVnd) : trip.totalCost}</dd>
                    </div>
                    <div className="bp-meta">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3" /> Đánh giá</dt>
                      <dd className="font-data text-base sm:text-lg font-bold text-foreground mt-1 flex items-center gap-1">
                        {trip.rating}<Star className="w-3.5 h-3.5 fill-chip-yellow text-chip-yellow" />
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* perforation */}
                <div className="relative h-5 ticket-perf border-y border-dashed border-border bg-card">
                  <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-paper" />
                  <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-paper" />
                </div>

                <div className="relative flex items-center justify-between px-5 sm:px-7 py-4">
                  <div className="font-mono text-[11px] text-muted-foreground tracking-wide">
                    MÃ CHUYẾN · <span className="text-foreground font-bold font-data">{tripCode}</span>
                  </div>
                  <div className="bp-barcode flex items-end gap-[3px] h-6" aria-hidden="true">
                    {BARCODE.map((h, i) => (
                      <span key={i} className="w-[3px] bg-foreground/80" style={{ height: h * 2 }} />
                    ))}
                  </div>
                </div>
              </header>

              <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="itinerary">📋 Lịch trình</TabsTrigger>
                  <TabsTrigger value="packing">🎒 Chuẩn bị đồ</TabsTrigger>
                </TabsList>

                <TabsContent value="itinerary" className="space-y-4 mt-4">
                  {/* Day legs */}
                  <div ref={dayTabsRef} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                    {trip.days.map((day, dayIdx) => {
                      const completedCount = day.items.filter((_, idx) => completedItems.has(`${dayIdx}-${idx}`)).length;
                      const allDone = completedCount === day.items.length && day.items.length > 0;
                      const active = activeDay === dayIdx;
                      return (
                        <button
                          key={dayIdx}
                          ref={(el) => { dayButtonRefs.current[dayIdx] = el; }}
                          onClick={() => handleDayClick(dayIdx)}
                          aria-pressed={active}
                          className={`flex-shrink-0 flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-xl border-2 transition-all ${
                            active
                              ? "border-chip-orange bg-chip-orange/10 shadow-warm"
                              : "border-border bg-card hover:border-chip-teal/50"
                          }`}
                        >
                          <span className={`grid place-items-center w-8 h-8 rounded-lg font-data text-sm font-bold ${active ? "bg-chip-orange text-white" : "bg-muted text-muted-foreground"}`}>
                            {dayIdx + 1}
                          </span>
                          <span className="text-left leading-tight">
                            <span className={`block text-[13px] font-display font-semibold ${active ? "text-chip-orange-ink" : "text-foreground"}`}>{day.day}</span>
                            {day.date && <span className="hidden sm:block font-data text-[10px] text-muted-foreground">{day.date}</span>}
                          </span>
                          {allDone ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : completedCount > 0 ? (
                            <span className="font-data text-[10px] text-muted-foreground">{completedCount}/{day.items.length}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active day route */}
                  {trip.days[activeDay] && (
                    <div ref={dayListRef} className="relative pt-1">
                      {/* the route ink threading the day's stops */}
                      <div className="route-spine pointer-events-none absolute top-9 bottom-10 left-7 -translate-x-1/2 w-[2px] rounded-full" aria-hidden="true" />
                      <ol key={activeDay} className="space-y-2.5">
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
                          const nodeColor = isCompleted ? "bg-green-500" : idx === 0 ? "bg-chip-orange" : "bg-chip-teal";
                          const isLast = idx === trip.days[activeDay].items.length - 1;

                          return (
                            <li key={idx} className="stop">
                              <div className="flex gap-3 sm:gap-4">
                                {/* rail: time + the route node (tap = stamp "đã đi"); 44px hit area */}
                                <div className="relative w-14 shrink-0 flex flex-col items-center pt-1.5">
                                  <span className="font-data text-[13px] font-bold text-chip-teal-ink leading-none">{item.time}</span>
                                  <button
                                    onClick={(e) => toggleCompleted(activeDay, idx, e)}
                                    title={isCompleted ? "Bỏ dấu đã đi" : "Đóng dấu đã đi"}
                                    aria-label={isCompleted ? "Bỏ dấu đã đi" : "Đóng dấu đã đi"}
                                    aria-pressed={isCompleted}
                                    className="relative z-10 mt-1 grid place-items-center w-11 h-11 rounded-full group/node focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chip-orange/40"
                                  >
                                    <span className={`grid place-items-center w-4 h-4 rounded-full border-2 border-card ring-2 ring-paper transition-colors ${nodeColor} ${!isCompleted ? "group-hover/node:ring-chip-orange/40" : ""}`}>
                                      {isCompleted && <Check className="w-2.5 h-2.5 text-white" />}
                                    </span>
                                  </button>
                                </div>

                                {/* journal entry card — content is one keyboard-reachable nav button; edits sit outside it */}
                                <div className={`group/item flex-1 min-w-0 rounded-2xl bg-card border border-border p-3 sm:p-4 shadow-card hover:shadow-warm hover:-translate-y-0.5 hover:border-chip-orange/30 transition-all ${isCompleted ? "opacity-60" : ""}`}>
                                  <button
                                    onClick={() => handleItemClick(item)}
                                    className="w-full flex gap-3 sm:gap-4 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chip-orange/50"
                                  >
                                    <SafeImage
                                      src={item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType)}
                                      fallbackSrc={getPlaceImage(item.title, item.bookingType)}
                                      alt={item.title}
                                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 ${isCompleted ? "grayscale" : ""}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className={`font-display font-bold text-foreground leading-snug group-hover/item:text-chip-orange-ink transition-colors ${isCompleted ? "line-through" : ""} line-clamp-2`}>{item.title}</h4>
                                        <span className="font-data text-sm font-bold text-foreground whitespace-nowrap shrink-0">{item.cost}</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{item.desc}</p>
                                      {isCompleted && (
                                        <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">Đã đi ✓</span>
                                      )}
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                                    <button
                                      onClick={(e) => {
                                        if (isFlight && !isSharedView) {
                                          document.getElementById("flight-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                        } else {
                                          handleBooking(e, item);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-chip-yellow-light hover:bg-chip-orange/10 border border-chip-yellow/40 text-[11px] font-semibold text-chip-orange-ink transition-all"
                                    >
                                      <BookingIcon className="w-3 h-3 shrink-0" /> <span className="truncate max-w-[8rem]">{bookingLabel}</span> {!isFlight && <ExternalLink className="w-3 h-3 shrink-0" />}
                                    </button>
                                    <button
                                      onClick={() => setSwapModal({ open: true, item, dayIdx: activeDay, itemIdx: idx })}
                                      disabled={isSharedView || !dbTripId || !remoteTrip}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-chip-teal/10 border border-border text-[11px] font-medium text-muted-foreground hover:text-chip-teal-ink transition-all disabled:opacity-40 disabled:hover:text-muted-foreground disabled:hover:bg-muted"
                                      title={isSharedView ? "Không thể đổi trong chế độ xem chia sẻ" : "Đổi"}
                                    >
                                      <RefreshCw className="w-3 h-3" /> Đổi
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted hover:bg-chip-teal/10 border border-border text-muted-foreground hover:text-chip-teal-ink transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chip-orange/40"
                                          aria-label="Thao tác khác"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem onClick={() => handleMoveItem(activeDay, idx, "up")} disabled={idx === 0} className="gap-2">
                                          <ArrowUp className="w-4 h-4" /> Chuyển lên
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMoveItem(activeDay, idx, "down")} disabled={isLast} className="gap-2">
                                          <ArrowDown className="w-4 h-4" /> Chuyển xuống
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteItem(activeDay, idx)} disabled={isSharedView} className="gap-2 text-destructive focus:text-destructive">
                                          <Trash2 className="w-4 h-4" /> Xóa hoạt động
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>

                              {/* travel time between stops — a dashed leg of the route */}
                              {travel && !isLast && (
                                <div className="flex items-center gap-2 pl-14 py-1.5">
                                  <span className="font-data text-[11px] text-chip-teal-ink whitespace-nowrap flex items-center gap-1.5">
                                    🚗 ~{formatDuration(travel.duration)} · {formatDistance(travel.distance)}
                                  </span>
                                  <span className="flex-1 border-t border-dashed border-chip-teal/30" />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="packing" className="mt-4">
                  <PackingList
                    tripId={dbTripId}
                    items={checklistItems}
                    readOnly={isSharedView || !dbTripId}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-paper/85 backdrop-blur-lg border-t border-dashed border-border">
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
              <ExportDialog trip={trip} dbTripId={dbTripId} createdAsPremium={remoteTrip?.createdAsPremium}>
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
        previousItem={trip?.days?.[swapModal.dayIdx]?.items?.[swapModal.itemIdx - 1] ?? null}
        tripId={dbTripId}
        dayId={remoteTrip?.days?.[swapModal.dayIdx]?.id ?? null}
        activityId={swapModal.item ? Number(swapModal.item.id) : null}
        createdAsPremium={remoteTrip?.createdAsPremium}
        onApplied={handleSwapItem}
      />
    </div>
  );
};

export default Result;
