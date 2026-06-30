import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight, ArrowLeft, Sparkles, Loader2, Check, ArrowLeftRight, MapPin, Users, AlertCircle, RotateCcw, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { useEntitlements, useInvalidateEntitlements } from "@/hooks/useEntitlements";
import { openUpgrade } from "@/features/premium/upgradeStore";
import { computeTripDays, exceedsDays, exceedsStyles, generateGateReason } from "@/features/premium/limits";
import { tripsApi, aiApi, placesApi, type PlaceLookupResult, type PlacePrediction } from "@/integrations/api";
import { usePlaceAutocomplete } from "@/features/planning/usePlaceAutocomplete";
import { analyticsError, trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { connectTripGenerationSocket, type TripGenerationSocketHandle } from "@/integrations/ws/tripGenerationSocket";
import { authStorage } from "@/integrations/api/client";
import type { TripGenerationResult } from "@/integrations/api/types";

const timeSlots = [
  { id: "morning", label: "Sáng", time: "6h-10h", emoji: "🌅" },
  { id: "noon", label: "Trưa", time: "10h-14h", emoji: "☀️" },
  { id: "afternoon", label: "Chiều", time: "14h-18h", emoji: "🌤️" },
  { id: "evening", label: "Tối", time: "18h-22h", emoji: "🌙" },
];

const travelStyles = [
  { id: "healing", label: "Nghỉ dưỡng", emoji: "🧘", desc: "Thư giãn, yoga, spa", popular: true },
  { id: "food", label: "Food Tour", emoji: "🍜", desc: "Ăn sập phố, local food", popular: true },
  { id: "photo", label: "Check-in sống ảo", emoji: "📸", desc: "Điểm chụp đẹp, trending", popular: true },
  { id: "beach", label: "Đi biển", emoji: "🏖️", desc: "Tắm biển, đảo, lặn ngắm san hô", popular: true },
  { id: "mountain", label: "Đi núi", emoji: "⛰️", desc: "Trekking, săn mây, cắm trại" },
  { id: "adventure", label: "Mạo hiểm", emoji: "🏔️", desc: "Leo núi, lặn biển, trekking" },
  { id: "resort", label: "Resort & Chill", emoji: "🏖️", desc: "Pool, view biển, all-inclusive", popular: true },
  { id: "family", label: "Gia đình", emoji: "👨‍👩‍👧‍👦", desc: "An toàn, vui chơi, trẻ em" },
  { id: "couple", label: "Couple / Hẹn hò", emoji: "💑", desc: "Lãng mạn, riêng tư" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙", desc: "Bar, club, phố đêm" },
  { id: "culture", label: "Văn hóa & Lịch sử", emoji: "🏛️", desc: "Di tích, bảo tàng, chùa" },
  { id: "local", label: "Trải nghiệm local", emoji: "🎎", desc: "Sống như người địa phương" },
  { id: "luxury", label: "Sang chảnh", emoji: "✨", desc: "5 sao, fine dining, VIP" },
  { id: "group", label: "Bạn bè / Nhóm", emoji: "🎉", desc: "Vui, sôi động, team building" },
];

const budgetPresets = [
  { label: "Tiết kiệm", desc: "< 2M", value: 2, emoji: "💵" },
  { label: "Trung bình", desc: "3-5M", value: 4, emoji: "💰" },
  { label: "Thoải mái", desc: "8M+", value: 6, emoji: "💎" },
];

const vibeOptions = [
  { id: "beach", label: "Biển", emoji: "🌴" },
  { id: "mountain", label: "Núi", emoji: "⛰" },
  { id: "city", label: "Thành phố", emoji: "🏙" },
  { id: "nightlife", label: "Nightlife", emoji: "🎉" },
];

const regions = [
  {
    label: "Miền Bắc", emoji: "🏛️",
    places: [
      { name: "Hà Nội", emoji: "🏛️" }, { name: "Sapa", emoji: "🏔️" },
      { name: "Hạ Long", emoji: "🛶" }, { name: "Ninh Bình", emoji: "⛰️" },
      { name: "Hà Giang", emoji: "🌄" }, { name: "Mai Châu", emoji: "🌾" },
    ],
  },
  {
    label: "Miền Trung", emoji: "🏖️",
    places: [
      { name: "Đà Nẵng", emoji: "🏖️" }, { name: "Hội An", emoji: "🏮" },
      { name: "Huế", emoji: "👑" }, { name: "Nha Trang", emoji: "🐚" },
      { name: "Quy Nhơn", emoji: "🌊" }, { name: "Phong Nha", emoji: "🦇" },
    ],
  },
  {
    label: "Miền Nam", emoji: "🌴",
    places: [
      { name: "Phú Quốc", emoji: "🌴" }, { name: "Đà Lạt", emoji: "🌸" },
      { name: "TP.HCM", emoji: "🏙️" }, { name: "Vũng Tàu", emoji: "⛱️" },
      { name: "Cần Thơ", emoji: "🚣" }, { name: "Côn Đảo", emoji: "🐢" },
    ],
  },
];

type Branch = null | "known" | "suggest";
type SuggestedPlace = { name: string; desc: string; emoji: string };

const getTodayInputValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

/** Phòng khi WS push thất lạc: sau ngần này chưa nhận kết quả thì báo lỗi mềm (trip có thể đã được tạo). */
const GENERATE_WATCHDOG_MS = 180_000;

const Planning = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: ent } = useEntitlements();
  const invalidateEntitlements = useInvalidateEntitlements();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/planning" } });
    }
  }, [user, authLoading, navigate]);

  // Branch selection
  const [branch, setBranch] = useState<Branch>(null);

  // Known destination flow state
  const [knownStep, setKnownStep] = useState(0); // 0: info, 1: styles, 2: budget
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [departureTime, setDepartureTime] = useState("morning");
  const [returnTime, setReturnTime] = useState("afternoon");
  const [budget, setBudget] = useState([4]);
  const [budgetInput, setBudgetInput] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [travelers, setTravelers] = useState(2);
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Async generate: chờ kết quả qua WebSocket thay vì giữ một HTTP request dài.
  const pendingAnalyticsRef = useRef<Record<string, unknown> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripGenSocketRef = useRef<TripGenerationSocketHandle | null>(null);
  const onGenResultRef = useRef<(r: TripGenerationResult) => void>(() => {});

  // Suggest flow state
  const [vibes, setVibes] = useState<string[]>([]);
  const [customVibe, setCustomVibe] = useState("");
  const [suggestBudget] = useState([4]);
  const [suggestDays] = useState(3);
  const [suggestedPlaces, setSuggestedPlaces] = useState<SuggestedPlace[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestStep, setSuggestStep] = useState(0); // 0: preferences, 1: results

  const toggleStyle = (id: string) => {
    const alreadySelected = styles.includes(id);
    // Bỏ chọn luôn được. Chọn thêm khi đã chạm giới hạn gói → mở UpgradeDialog, không chọn.
    if (!alreadySelected && maxStyles != null && styles.length >= maxStyles) {
      openUpgrade("LIMIT_EXCEEDED");
      return;
    }
    setStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleVibe = (id: string) => {
    setVibes((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleBudgetInput = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setBudgetInput(clean ? Number(clean).toLocaleString("vi-VN") : "");
  };

  // Lat/lng đã resolve từ Goong Place/Detail sau khi user chọn 1 prediction.
  // Lưu để future use khi BE generate trip nhận tọa độ trực tiếp.
  const [originPlace, setOriginPlace] = useState<PlaceLookupResult | null>(null);
  const [destPlace, setDestPlace] = useState<PlaceLookupResult | null>(null);

  // Autocomplete qua Goong (backend proxy). Chỉ active khi input đang focus.
  const { predictions: originPredictions } = usePlaceAutocomplete(origin, originFocused);
  const { predictions: destPredictions } = usePlaceAutocomplete(destination, destFocused);

  // Empty-state quick suggestions: khi focus + input trống, show 1 dải regions hardcode.
  const quickSuggestions = regions.flatMap(r => r.places).slice(0, 6);
  const showOriginQuick = originFocused && origin.trim().length === 0;
  const showDestQuick = destFocused && destination.trim().length === 0;

  const handlePickPrediction = async (
    p: PlacePrediction,
    setText: (s: string) => void,
    setFocused: (b: boolean) => void,
    setPlace: (p: PlaceLookupResult | null) => void,
  ) => {
    setText(p.mainText || p.description);
    setFocused(false);
    try {
      const detail = await placesApi.lookupPlace(p.placeId);
      setPlace(detail);
    } catch (err) {
      console.warn("lookupPlace failed:", err);
      setPlace(null);
    }
  };

  const swapOriginDest = () => {
    const tmpText = origin;
    const tmpPlace = originPlace;
    setOrigin(destination);
    setDestination(tmpText);
    setOriginPlace(destPlace);
    setDestPlace(tmpPlace);
  };

  // AI suggest destinations
  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const selectedStyles = [...vibes];
      if (customVibe.trim()) selectedStyles.push(customVibe.trim());

      const suggestions = await aiApi.suggestDestinations({
        styles: selectedStyles,
        budgetVnd: BUDGET_VND_MAP[suggestBudget[0]] ?? 4_000_000,
        days: suggestDays,
      });

      setSuggestedPlaces(suggestions ?? []);
      setSuggestStep(1);
    } catch (err: any) {
      console.error("Suggest failed:", err);
      toast.error(err?.response?.data?.error?.message || err.message || "Gợi ý thất bại, vui lòng thử lại");
    } finally {
      setIsSuggesting(false);
    }
  };

  const selectSuggestedPlace = (place: SuggestedPlace) => {
    setDestination(place.name);
    setDestPlace(null);
    setBranch("known");
    // Reset suggest state
    setSuggestStep(0);
    setSuggestedPlaces([]);
  };

  const BUDGET_VND_MAP = [400_000, 750_000, 1_500_000, 2_500_000, 4_000_000, 6_500_000, 10_000_000, 15_000_000];
  const todayIso = getTodayInputValue();

  // Giới hạn theo tier — lấy từ entitlements (không hardcode). Pre-check là UX; BE vẫn chốt chặn.
  const maxTripDays = ent?.limits.maxTripDays;
  const maxStyles = ent?.limits.maxStyles;
  const tripDays = useMemo(() => computeTripDays(dates.start, dates.end), [dates.start, dates.end]);
  const daysExceeded = exceedsDays(ent, tripDays);
  const stylesExceeded = exceedsStyles(ent, styles.length);

  const getDateValidationMessage = () => {
    if (!dates.start || !dates.end) return "Vui long chon day du ngay di va ngay ve";
    if (dates.start < todayIso) return "Ngay di khong duoc o qua khu";
    if (dates.end < dates.start) return "Ngay ve phai sau hoac bang ngay di";
    return null;
  };

  const handleGenerate = async () => {
    const dateError = getDateValidationMessage();
    if (!origin.trim() || !destination.trim()) {
      toast.error("Vui long nhap diem di va diem den");
      setKnownStep(0);
      return;
    }
    if (dateError) {
      toast.error(dateError);
      setKnownStep(0);
      return;
    }

    const budgetVnd = budgetInput
      ? parseInt(budgetInput.replace(/\D/g, ""), 10)
      : (BUDGET_VND_MAP[budget[0]] ?? 4_000_000);

    if (!budgetVnd || budgetVnd <= 0) {
      toast.error("Ngân sách không hợp lệ");
      return;
    }

    // Gate theo tier (mirror BE) — mở UpgradeDialog thay vì gọi API rồi nhận lỗi.
    const gateReason = generateGateReason(ent, tripDays, styles.length);
    if (gateReason) {
      openUpgrade(gateReason);
      return;
    }

    setIsLoading(true);
    setError(null);
    const analyticsPayload = {
      destination,
      origin,
      peopleCount: travelers,
      stylesCount: styles.length,
      budgetVnd,
    };
    trackEvent("generate_started", analyticsPayload);
    try {
      await tripsApi.generateAsync({
        departure: origin,
        destination,
        tripType: "roundtrip",
        startDate: dates.start,
        endDate: dates.end,
        departureTime,
        returnTime,
        budgetVnd,
        styles,
        peopleCount: travelers,
        tickets: travelers,
      });
      // BE đã nhận (202). Kết quả tới qua WebSocket (onGenResultRef). Bật watchdog phòng push thất lạc.
      pendingAnalyticsRef.current = analyticsPayload;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        if (!pendingAnalyticsRef.current) return;
        pendingAnalyticsRef.current = null;
        watchdogRef.current = null;
        setIsLoading(false);
        setError(
          "AI mất quá nhiều thời gian xử lý. Lịch trình có thể đã được tạo — kiểm tra trong 'Chuyến đi của tôi', hoặc thử lại."
        );
      }, GENERATE_WATCHDOG_MS);
    } catch (err: any) {
      // Lỗi validate đồng bộ (hết lượt 402 / dữ liệu 400 / rate limit 429) hoặc lỗi mạng khi gửi yêu cầu.
      console.error("AI generation request failed:", err);
      trackEvent("generate_failed", { ...analyticsPayload, ...analyticsError(err) });
      const msg = err.response?.data?.message || err.message || "Tạo lịch trình thất bại, vui lòng thử lại";
      setError(msg);
      setIsLoading(false);
    }
  };

  // Gán mỗi render để luôn dùng navigate/state mới nhất; socket effect chỉ gọi qua ref nên không re-subscribe.
  onGenResultRef.current = (result: TripGenerationResult) => {
    const analyticsPayload = pendingAnalyticsRef.current;
    if (!analyticsPayload) return; // không có job đang đợi → bỏ qua (stale)
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    pendingAnalyticsRef.current = null;
    setIsLoading(false);
    if (result.status === "DONE" && result.tripId != null) {
      trackEvent("generate_succeeded", { ...analyticsPayload, tripId: result.tripId });
      invalidateEntitlements();
      if (result.geocodeFailedCount && result.geocodeFailedCount > 0) {
        toast.info(`${result.geocodeFailedCount} hoạt động chưa định vị được trên bản đồ`, {
          description: "Lịch trình vẫn dùng được; một vài hoạt động có thể chưa hiện trên bản đồ.",
        });
      }
      navigate("/result", { state: { tripId: result.tripId } });
    } else {
      trackEvent("generate_failed", { ...analyticsPayload, reason: result.error ?? "unknown" });
      setError(result.error || "Tạo lịch trình thất bại, vui lòng thử lại");
    }
  };

  // Kết nối WS nhận kết quả generate khi ở trang Planning; subscribe sẵn để không lỡ push.
  useEffect(() => {
    if (!user) return;
    const connect = () => {
      const token = authStorage.getAccessToken();
      if (!token) return;
      tripGenSocketRef.current?.disconnect();
      tripGenSocketRef.current = connectTripGenerationSocket(
        token,
        (r) => onGenResultRef.current?.(r),
        { onError: (m) => console.warn("Trip-gen WS error:", m) }
      );
    };
    connect();
    const onAuthChange = () => connect();
    window.addEventListener("chiptrip-auth-change", onAuthChange);
    return () => {
      window.removeEventListener("chiptrip-auth-change", onAuthChange);
      tripGenSocketRef.current?.disconnect();
      tripGenSocketRef.current = null;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const canNextKnown = () => {
    if (knownStep === 0) return origin.trim().length > 0 && destination.trim().length > 0 && !getDateValidationMessage();
    if (knownStep === 1) return styles.length > 0;
    return true;
  };

  // ==================== RENDER ====================

  // Initial question screen
  const renderBranchSelection = () => (
    <motion.div key="branch" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-3">
        <span className="text-6xl">✈️</span>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Bạn đã có điểm đến chưa?</h1>
        <p className="text-muted-foreground text-lg">Chọn để bắt đầu lên kế hoạch</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        <button
          onClick={() => setBranch("known")}
          className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-chip-orange hover:shadow-warm transition-all group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">🗺️</span>
          <span className="font-display font-bold text-lg text-foreground">Có rồi</span>
          <span className="text-sm text-muted-foreground text-center">Tôi đã biết muốn đi đâu, giúp tôi lên lịch trình</span>
        </button>

        <button
          onClick={() => setBranch("suggest")}
          className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-warm transition-all group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">🤖</span>
          <span className="font-display font-bold text-lg text-foreground">Chưa, gợi ý giúp tôi</span>
          <span className="text-sm text-muted-foreground text-center">AI sẽ gợi ý điểm đến phù hợp với sở thích của bạn</span>
        </button>
      </div>
    </motion.div>
  );

  // "Known destination" multi-step flow
  const renderKnownFlow = () => {
    // Step 0: Booking info
    if (knownStep === 0) return (
      <motion.div key="known-0" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">🗺️ Lên kế hoạch chuyến đi</h2>
          <p className="text-muted-foreground text-sm">Điền thông tin chuyến đi của bạn</p>
        </div>

        <div className="w-full max-w-2xl bg-card border-2 border-border rounded-2xl p-5 space-y-4">
          {/* Origin + Destination */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-chip-orange" />
              <input value={origin} onChange={(e) => { setOrigin(e.target.value); setOriginPlace(null); }} onFocus={() => setOriginFocused(true)} onBlur={() => setTimeout(() => setOriginFocused(false), 200)} placeholder="Điểm đi" className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              {originPredictions.length > 0 ? (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-20">
                  {originPredictions.slice(0, 5).map(p => (
                    <button key={p.placeId} onMouseDown={(e) => e.preventDefault()} onClick={() => handlePickPrediction(p, setOrigin, setOriginFocused, setOriginPlace)} className="w-full flex flex-col items-start gap-0.5 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm">
                      <span className="font-medium text-foreground">{p.mainText}</span>
                      {p.secondaryText && <span className="text-xs text-muted-foreground">{p.secondaryText}</span>}
                    </button>
                  ))}
                </div>
              ) : showOriginQuick ? (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-20">
                  {quickSuggestions.map(s => (
                    <button key={s.name} onMouseDown={(e) => e.preventDefault()} onClick={() => { setOrigin(s.name); setOriginPlace(null); setOriginFocused(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm">
                      <span>{s.emoji}</span><span className="font-medium text-foreground">{s.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button onClick={swapOriginDest} className="w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center text-chip-orange hover:border-chip-orange hover:bg-chip-orange/10 transition-all shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="relative flex-1 w-full">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input value={destination} onChange={(e) => { setDestination(e.target.value); setDestPlace(null); }} onFocus={() => setDestFocused(true)} onBlur={() => setTimeout(() => setDestFocused(false), 200)} placeholder="Điểm đến" className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              {destPredictions.length > 0 ? (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-20">
                  {destPredictions.slice(0, 5).map(p => (
                    <button key={p.placeId} onMouseDown={(e) => e.preventDefault()} onClick={() => handlePickPrediction(p, setDestination, setDestFocused, setDestPlace)} className="w-full flex flex-col items-start gap-0.5 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm">
                      <span className="font-medium text-foreground">{p.mainText}</span>
                      {p.secondaryText && <span className="text-xs text-muted-foreground">{p.secondaryText}</span>}
                    </button>
                  ))}
                </div>
              ) : showDestQuick ? (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-20">
                  {quickSuggestions.map(s => (
                    <button key={s.name} onMouseDown={(e) => e.preventDefault()} onClick={() => { setDestination(s.name); setDestPlace(null); setDestFocused(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm">
                      <span>{s.emoji}</span><span className="font-medium text-foreground">{s.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Ngày đi</label>
              <input type="date" min={todayIso} value={dates.start} onChange={(e) => {
                const start = e.target.value;
                setDates(prev => ({ start, end: prev.end && prev.end < start ? "" : prev.end }));
              }} className="w-full h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              <div className="flex gap-1.5">
                {timeSlots.map(ts => (
                  <button key={ts.id} onClick={() => setDepartureTime(ts.id)} className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border-2 text-[10px] font-medium transition-all ${departureTime === ts.id ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-background text-muted-foreground hover:border-chip-orange/40"}`}>
                    <span className="text-sm">{ts.emoji}</span><span>{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Ngày về</label>
              <input type="date" min={dates.start || todayIso} value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} className="w-full h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              <div className="flex gap-1.5">
                {timeSlots.map(ts => (
                  <button key={ts.id} onClick={() => setReturnTime(ts.id)} className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border-2 text-[10px] font-medium transition-all ${returnTime === ts.id ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-background text-muted-foreground hover:border-chip-orange/40"}`}>
                    <span className="text-sm">{ts.emoji}</span><span>{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tier limit hint — số ngày vượt gói thường */}
          {daysExceeded && (
            <button
              type="button"
              onClick={() => openUpgrade("LIMIT_EXCEEDED")}
              className="w-full flex items-center gap-2.5 rounded-xl border-2 border-gold bg-foil px-3.5 py-2.5 text-left transition-all hover:shadow-warm"
            >
              <Crown className="w-4 h-4 text-gold shrink-0" />
              <span className="text-xs leading-snug text-foreground/80">
                Gói thường tạo tối đa <b className="font-data">{maxTripDays}</b> ngày — chuyến này <b className="font-data">{tripDays}</b> ngày.{" "}
                <span className="font-semibold text-gold">Nâng hạng để mở tới 10 ngày →</span>
              </span>
            </button>
          )}

          {/* Travelers */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Số người</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center h-11 rounded-xl border-2 border-border bg-background overflow-hidden">
                <button onClick={() => setTravelers(Math.max(1, travelers - 1))} className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors text-lg font-bold">−</button>
                <span className="w-10 text-center font-bold text-foreground">{travelers}</span>
                <button onClick={() => setTravelers(Math.min(20, travelers + 1))} className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors text-lg font-bold">+</button>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 4, 6].map(n => (
                  <button key={n} onClick={() => setTravelers(n)} className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${travelers === n ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-card text-muted-foreground hover:border-chip-orange/40"}`}>
                    {n === 1 ? "Solo" : n === 2 ? "Đôi" : n === 4 ? "Nhóm 4" : "6+"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-2">
          <Button variant="ghost" onClick={() => { setBranch(null); setKnownStep(0); }}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <Button variant="hero" onClick={() => setKnownStep(1)} disabled={!canNextKnown()}>
            Tiếp theo <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );

    // Step 1: Travel styles
    if (knownStep === 1) return (
      <motion.div key="known-1" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">✨ Gu du lịch của bạn?</h2>
          <p className="text-muted-foreground text-sm">
            Chọn một hoặc nhiều phong cách
            {ent && !ent.isPremium && maxStyles != null && (
              <>
                {" · "}
                <span className="font-data font-semibold text-foreground">{styles.length}/{maxStyles}</span>
                <span className="text-muted-foreground"> (gói thường)</span>
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-2xl">
          {travelStyles.map((s) => (
            <button key={s.id} onClick={() => toggleStyle(s.id)} className={`relative flex flex-col items-start gap-1 p-3 rounded-2xl border-2 transition-all duration-200 text-left group hover:scale-[1.02] ${styles.includes(s.id) ? "border-chip-orange bg-chip-orange/10 shadow-warm" : "border-border bg-card hover:border-chip-orange/40"}`}>
              {s.popular && <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-accent text-[10px] font-bold text-accent-foreground">Hot</span>}
              {styles.includes(s.id) && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-chip-orange flex items-center justify-center"><Check className="w-3 h-3 text-accent-foreground" /></div>}
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.emoji}</span>
                <span className="font-display font-semibold text-foreground text-sm">{s.label}</span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">{s.desc}</span>
            </button>
          ))}
        </div>
        {stylesExceeded && (
          <button
            type="button"
            onClick={() => openUpgrade("LIMIT_EXCEEDED")}
            className="w-full max-w-2xl flex items-center gap-2.5 rounded-xl border-2 border-gold bg-foil px-3.5 py-2.5 text-left transition-all hover:shadow-warm"
          >
            <Crown className="w-4 h-4 text-gold shrink-0" />
            <span className="text-xs leading-snug text-foreground/80">
              Gói thường chọn tối đa <b className="font-data">{maxStyles}</b> phong cách (bạn chọn <b className="font-data">{styles.length}</b>).{" "}
              <span className="font-semibold text-gold">Nâng hạng để chọn không giới hạn →</span>
            </span>
          </button>
        )}
        <div className="flex items-center gap-4 mt-2">
          <Button variant="ghost" onClick={() => setKnownStep(0)}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <Button variant="hero" onClick={() => setKnownStep(2)} disabled={!canNextKnown()}>
            Tiếp theo <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );

    // Step 2: Budget
    return (
      <motion.div key="known-2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center space-y-3">
          <span className="text-5xl">💰</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Ngân sách cho chuyến đi?</h2>
          <p className="text-muted-foreground">Chọn mức ngân sách hoặc nhập số tiền</p>
        </div>
        <div className="flex gap-3">
          {budgetPresets.map(p => (
            <button key={p.label} onClick={() => { setBudget([p.value]); setBudgetInput(""); }} className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all hover:scale-[1.03] ${budget[0] === p.value && !budgetInput ? "border-chip-orange bg-chip-orange/10 shadow-warm" : "border-border bg-card hover:border-chip-orange/40"}`}>
              <span className="text-2xl">{p.emoji}</span>
              <span className="font-semibold text-foreground text-sm">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.desc}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <input value={budgetInput} onChange={(e) => handleBudgetInput(e.target.value)} placeholder="Nhập số tiền..." className="w-full h-14 px-5 pr-16 rounded-2xl border-2 border-border bg-card text-foreground text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all text-center" />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">VNĐ</span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Button variant="ghost" onClick={() => setKnownStep(1)}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <Button variant="cta" size="lg" onClick={handleGenerate}>
            <Sparkles className="w-5 h-5" /> Tạo lịch trình siêu tốc
          </Button>
        </div>
      </motion.div>
    );
  };

  // "Suggest" flow
  const renderSuggestFlow = () => (
    <motion.div key="suggest" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center gap-6">
      {suggestStep === 0 ? (
        <>
          <div className="text-center space-y-3">
            <span className="text-5xl">🤖</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Bạn thích gì?</h2>
            <p className="text-muted-foreground text-sm">Chọn sở thích để AI gợi ý điểm đến phù hợp</p>
          </div>

          {/* Vibe options */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {vibeOptions.map(v => (
              <button
                key={v.id}
                onClick={() => toggleVibe(v.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left hover:scale-[1.02] ${
                  vibes.includes(v.id)
                    ? "border-chip-orange bg-chip-orange/10 shadow-warm"
                    : "border-border bg-card hover:border-chip-orange/40"
                }`}
              >
                <span className="text-3xl">{v.emoji}</span>
                <span className="font-display font-semibold text-foreground">{v.label}</span>
                {vibes.includes(v.id) && (
                  <Check className="w-4 h-4 text-chip-orange ml-auto" />
                )}
              </button>
            ))}
          </div>

          {/* Custom vibe input */}
          <div className="w-full max-w-md">
            <input
              value={customVibe}
              onChange={(e) => setCustomVibe(e.target.value)}
              placeholder="Hoặc nhập sở thích khác... (vd: cắm trại, lặn biển)"
              className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all text-sm"
            />
          </div>



          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setBranch(null)}>
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Button>
            <Button variant="hero" onClick={handleSuggest} disabled={vibes.length === 0 && !customVibe || isSuggesting}>
              {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isSuggesting ? "Đang tìm..." : "Gợi ý cho tôi"}
            </Button>
          </div>
        </>
      ) : (
        // Suggest results - destination cards
        <>
          <div className="text-center space-y-3">
            <span className="text-5xl">🎯</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">AI gợi ý cho bạn</h2>
            <p className="text-muted-foreground text-sm">Chọn 1 điểm đến để tiếp tục lên lịch trình</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
            {suggestedPlaces.map((place, i) => (
              <button
                key={i}
                onClick={() => selectSuggestedPlace(place)}
                className="flex flex-col items-start gap-2 p-5 rounded-2xl border-2 border-border bg-card hover:border-chip-orange hover:shadow-warm transition-all text-left group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{place.emoji}</span>
                <span className="font-display font-bold text-lg text-foreground">{place.name}</span>
                <span className="text-sm text-muted-foreground leading-snug">{place.desc}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSuggestStep(0)}>
              <ArrowLeft className="w-4 h-4" /> Chọn lại sở thích
            </Button>
            <Button variant="outline" onClick={handleSuggest} disabled={isSuggesting}>
              {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gợi ý khác
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-6">
        <div className="container mx-auto max-w-3xl">
          {/* Progress bar for known flow */}
          {branch === "known" && !isLoading && (
            <div className="max-w-lg mx-auto mb-6">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= knownStep ? "bg-chip-orange" : "bg-border"}`} />
                ))}
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center animate-pulse-glow">
                  <Loader2 className="w-8 h-8 text-accent-foreground animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">AI đang tạo lịch trình...</h2>
                <p className="text-muted-foreground">Chip Trip đang tìm kiếm lịch trình hoàn hảo cho <span className="font-semibold text-chip-orange">{destination}</span></p>
                <p className="text-xs text-muted-foreground">Có thể mất 1–2 phút. Vui lòng giữ nguyên trang — lượt chỉ bị trừ khi lịch trình tạo xong.</p>
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Tạo lịch trình thất bại</h2>
                  <p className="text-muted-foreground max-w-sm">{error}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => { setError(null); setBranch(null); setKnownStep(0); }}>
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                  </Button>
                  <Button variant="hero" onClick={() => { setError(null); handleGenerate(); }}>
                    <RotateCcw className="w-4 h-4" /> Thử lại
                  </Button>
                </div>
              </motion.div>
            ) : branch === null ? (
              renderBranchSelection()
            ) : branch === "known" ? (
              renderKnownFlow()
            ) : (
              renderSuggestFlow()
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Planning;
