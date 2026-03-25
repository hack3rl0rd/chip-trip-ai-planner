import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, ArrowRight, ArrowLeft, Sparkles, Loader2, Check, ArrowLeftRight, MapPin, Users, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChipMascot from "@/components/ChipMascot";

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

const Planning = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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

  // Suggest flow state
  const [vibes, setVibes] = useState<string[]>([]);
  const [customVibe, setCustomVibe] = useState("");
  const [suggestBudget, setSuggestBudget] = useState([4]);
  const [suggestDays, setSuggestDays] = useState(3);
  const [suggestedPlaces, setSuggestedPlaces] = useState<SuggestedPlace[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestStep, setSuggestStep] = useState(0); // 0: preferences, 1: results

  const toggleStyle = (id: string) => {
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

  const allPlaces = regions.flatMap(r => r.places);
  const filteredOriginSuggestions = originFocused && origin.length > 0
    ? allPlaces.filter(p => p.name.toLowerCase().includes(origin.toLowerCase()) && p.name.toLowerCase() !== origin.toLowerCase())
    : [];
  const filteredDestSuggestions = destFocused && destination.length > 0
    ? allPlaces.filter(p => p.name.toLowerCase().includes(destination.toLowerCase()) && p.name.toLowerCase() !== destination.toLowerCase())
    : [];

  const swapOriginDest = () => {
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);
  };

  // AI suggest destinations
  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const vibeText = [...vibes.map(v => vibeOptions.find(o => o.id === v)?.label || v), customVibe].filter(Boolean).join(", ");
      const budgetLabels = ["< 500K", "500K-1M", "1-2M", "2-3M", "3-5M", "5-8M", "8-12M", "12M+"];
      const budgetText = budgetLabels[suggestBudget[0]] || "3-5M";

      const { data, error } = await supabase.functions.invoke("suggest-destinations", {
        body: { vibes: vibeText, budget: budgetText, days: suggestDays },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuggestedPlaces(data.suggestions || []);
      setSuggestStep(1);
    } catch (err: any) {
      console.error("Suggest failed:", err);
      toast.error(err.message || "Gợi ý thất bại, vui lòng thử lại");
    } finally {
      setIsSuggesting(false);
    }
  };

  const selectSuggestedPlace = (place: SuggestedPlace) => {
    setDestination(place.name);
    setBranch("known");
    // Reset suggest state
    setSuggestStep(0);
    setSuggestedPlaces([]);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip", {
        body: {
          origin,
          destination,
          tripType: "roundtrip",
          startDate: dates.start,
          endDate: dates.end,
          departureTime,
          returnTime,
          budget: budget[0],
          styles,
          travelers,
          tickets: travelers,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const trip = data.trip;
      trip.days?.forEach((day: any) => {
        day.items?.forEach((item: any) => {
          if (!item.image) item.image = "/placeholder.svg";
        });
      });

      navigate("/result", { state: { trip } });
    } catch (err: any) {
      console.error("AI generation failed:", err);
      toast.error(err.message || "Tạo lịch trình thất bại, vui lòng thử lại");
      setIsLoading(false);
    }
  };

  const canNextKnown = () => {
    if (knownStep === 0) return origin.length > 0 && destination.length > 0 && dates.start && dates.end;
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
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} onFocus={() => setOriginFocused(true)} onBlur={() => setTimeout(() => setOriginFocused(false), 200)} placeholder="Điểm đi" className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              {filteredOriginSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-20">
                  {filteredOriginSuggestions.slice(0, 5).map(s => (
                    <button key={s.name} onClick={() => { setOrigin(s.name); setOriginFocused(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm">
                      <span>{s.emoji}</span><span className="font-medium text-foreground">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={swapOriginDest} className="w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center text-chip-orange hover:border-chip-orange hover:bg-chip-orange/10 transition-all shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="relative flex-1 w-full">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input value={destination} onChange={(e) => setDestination(e.target.value)} onFocus={() => setDestFocused(true)} onBlur={() => setTimeout(() => setDestFocused(false), 200)} placeholder="Điểm đến" className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              {filteredDestSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-20">
                  {filteredDestSuggestions.slice(0, 5).map(s => (
                    <button key={s.name} onClick={() => { setDestination(s.name); setDestFocused(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left text-sm">
                      <span>{s.emoji}</span><span className="font-medium text-foreground">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Ngày đi</label>
              <input type="date" value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} className="w-full h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
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
              <input type="date" value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} className="w-full h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
              <div className="flex gap-1.5">
                {timeSlots.map(ts => (
                  <button key={ts.id} onClick={() => setReturnTime(ts.id)} className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border-2 text-[10px] font-medium transition-all ${returnTime === ts.id ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-background text-muted-foreground hover:border-chip-orange/40"}`}>
                    <span className="text-sm">{ts.emoji}</span><span>{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

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
          <p className="text-muted-foreground text-sm">Chọn một hoặc nhiều phong cách</p>
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
