import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, ArrowRight, ArrowLeft, Sparkles, Loader2, Check } from "lucide-react";
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

const budgetLabels = ["< 500K", "500K-1M", "1-2M", "2-3M", "3-5M", "5-8M", "8-12M", "12M+"];
const budgetPresets = [
  { label: "Tiết kiệm", desc: "< 2M", value: 2, emoji: "💵" },
  { label: "Trung bình", desc: "3-5M", value: 4, emoji: "💰" },
  { label: "Thoải mái", desc: "8M+", value: 6, emoji: "💎" },
];

const Planning = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/planning" } });
    }
  }, [user, authLoading, navigate]);

  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [departureTime, setDepartureTime] = useState("morning");
  const [returnTime, setReturnTime] = useState("afternoon");
  const [budget, setBudget] = useState([4]);
  const [budgetInput, setBudgetInput] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [travelers, setTravelers] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  const toggleStyle = (id: string) => {
    setStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Sync budget slider to input
  const handleBudgetSlider = (val: number[]) => {
    setBudget(val);
    setBudgetInput("");
  };

  const handleBudgetInput = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setBudgetInput(clean ? Number(clean).toLocaleString("vi-VN") : "");
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip", {
        body: {
          destination,
          startDate: dates.start,
          endDate: dates.end,
          departureTime,
          returnTime,
          budget: budget[0],
          styles,
          travelers,
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

  const canNext = () => {
    if (step === 0) return destination.length > 0 && dates.start && dates.end;
    if (step === 1) return styles.length > 0;
    if (step === 2) return true;
    return true;
  };

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

  const allPlaces = regions.flatMap(r => r.places);
  const filteredSuggestions = destination.length > 0
    ? allPlaces.filter(p => p.name.toLowerCase().includes(destination.toLowerCase()) && p.name.toLowerCase() !== destination.toLowerCase())
    : [];

  const steps = [
    // Step 0: Destination + Dates (merged, Futabus-style)
    <motion.div key="step0" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-3">
        <span className="text-5xl">🗺️</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Bạn muốn đi đâu?</h2>
        <p className="text-muted-foreground">Chọn điểm đến, ngày đi và khung giờ</p>
      </div>

      {/* Destination input */}
      <div className="relative w-full max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="VD: Đà Nẵng, Đà Lạt, Phú Quốc..."
          className="w-full h-14 pl-14 pr-6 rounded-2xl border-2 border-border bg-card text-foreground text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all"
        />
        {filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-warm overflow-hidden z-10">
            {filteredSuggestions.map(s => (
              <button key={s.name} onClick={() => setDestination(s.name)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left">
                <span>{s.emoji}</span>
                <span className="font-medium text-foreground">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date + Time row (Futabus-style) */}
      <div className="w-full max-w-2xl bg-card border-2 border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Ngày đi
            </label>
            <input type="date" value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
            <div className="flex gap-2">
              {timeSlots.map(ts => (
                <button key={ts.id} onClick={() => setDepartureTime(ts.id)} className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${departureTime === ts.id ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-background text-muted-foreground hover:border-chip-orange/40"}`}>
                  <span>{ts.emoji}</span>
                  <span>{ts.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Ngày về
            </label>
            <input type="date" value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all" />
            <div className="flex gap-2">
              {timeSlots.map(ts => (
                <button key={ts.id} onClick={() => setReturnTime(ts.id)} className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${returnTime === ts.id ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-background text-muted-foreground hover:border-chip-orange/40"}`}>
                  <span>{ts.emoji}</span>
                  <span>{ts.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Region suggestions (only when no destination) */}
      {!destination && (
        <div className="w-full max-w-2xl space-y-3">
          {regions.map(region => (
            <div key={region.label}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <span>{region.emoji}</span> {region.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {region.places.map(p => (
                  <button key={p.name} onClick={() => setDestination(p.name)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:border-chip-orange/40 hover:shadow-warm transition-all text-sm font-medium text-foreground">
                    <span>{p.emoji}</span> {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>,

    // Step 2: Travelers + Styles (merged)
    <motion.div key="step2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center min-h-[60vh] gap-6">
      {/* Travelers */}
      <div className="text-center space-y-2">
        <span className="text-4xl">👥</span>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Đi bao nhiêu người?</h2>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setTravelers(Math.max(1, travelers - 1))} className="w-12 h-12 rounded-2xl border-2 border-border bg-card flex items-center justify-center text-xl font-bold text-foreground hover:border-chip-orange transition-all">−</button>
        <span className="text-4xl font-bold text-gradient w-12 text-center">{travelers}</span>
        <button onClick={() => setTravelers(Math.min(20, travelers + 1))} className="w-12 h-12 rounded-2xl border-2 border-border bg-card flex items-center justify-center text-xl font-bold text-foreground hover:border-chip-orange transition-all">+</button>
        <div className="flex gap-2 ml-2">
          {[1, 2, 4, 6].map(n => (
            <button key={n} onClick={() => setTravelers(n)} className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${travelers === n ? "border-chip-orange bg-chip-orange/10 text-chip-orange" : "border-border bg-card text-muted-foreground hover:border-chip-orange/40"}`}>
              {n === 1 ? "Solo" : n === 2 ? "Đôi" : n === 4 ? "Nhóm 4" : "6+"}
            </button>
          ))}
        </div>
      </div>

      {/* Styles */}
      <div className="text-center space-y-2 mt-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">✨ Gu du lịch của bạn?</h2>
        <p className="text-muted-foreground text-sm">Chọn một hoặc nhiều phong cách</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {travelStyles.map((s) => (
          <button
            key={s.id}
            onClick={() => toggleStyle(s.id)}
            className={`relative flex flex-col items-start gap-1 p-4 rounded-2xl border-2 transition-all duration-200 text-left group hover:scale-[1.03] hover:shadow-warm ${
              styles.includes(s.id)
                ? "border-chip-orange bg-chip-orange/10 shadow-warm"
                : "border-border bg-card hover:border-chip-orange/40"
            }`}
          >
            {s.popular && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-accent text-[10px] font-bold text-accent-foreground">Phổ biến</span>
            )}
            {styles.includes(s.id) && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-chip-orange flex items-center justify-center">
                <Check className="w-3 h-3 text-accent-foreground" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{s.emoji}</span>
              <span className="font-display font-semibold text-foreground text-sm">{s.label}</span>
            </div>
            <span className="text-xs text-muted-foreground leading-tight">{s.desc}</span>
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 3: Budget
    <motion.div key="step3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-3">
        <span className="text-5xl">💰</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Ngân sách cho chuyến đi?</h2>
        <p className="text-muted-foreground">Kéo thanh trượt hoặc nhập số tiền</p>
      </div>

      {/* Quick presets */}
      <div className="flex gap-3">
        {budgetPresets.map(p => (
          <button key={p.label} onClick={() => { setBudget([p.value]); setBudgetInput(""); }} className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all hover:scale-[1.03] ${budget[0] === p.value && !budgetInput ? "border-chip-orange bg-chip-orange/10 shadow-warm" : "border-border bg-card hover:border-chip-orange/40"}`}>
            <span className="text-2xl">{p.emoji}</span>
            <span className="font-semibold text-foreground text-sm">{p.label}</span>
            <span className="text-xs text-muted-foreground">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Direct input */}
      <div className="relative w-full max-w-sm">
        <input
          value={budgetInput}
          onChange={(e) => handleBudgetInput(e.target.value)}
          placeholder="Nhập số tiền..."
          className="w-full h-14 px-5 pr-16 rounded-2xl border-2 border-border bg-card text-foreground text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all text-center"
        />
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">VNĐ</span>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-6">
        {/* Progress bar - 3 steps */}
        <div className="container mx-auto max-w-lg mb-8">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-chip-orange" : "bg-border"}`} />
            ))}
          </div>
        </div>

        <div className="container mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center animate-pulse-glow">
                  <Loader2 className="w-8 h-8 text-accent-foreground animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">AI đang tạo lịch trình...</h2>
                <p className="text-muted-foreground">Chip Trip đang tìm kiếm lịch trình hoàn hảo cho <span className="font-semibold text-chip-orange">{destination}</span></p>
              </motion.div>
            ) : (
              steps[step]
            )}
          </AnimatePresence>

          {!isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center mt-8 max-w-lg mx-auto">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </Button>
              {step < 2 ? (
                <Button variant="hero" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                  Tiếp theo <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="cta" size="lg" onClick={handleGenerate} disabled={!canNext()}>
                  <Sparkles className="w-5 h-5" /> Tạo lịch trình siêu tốc
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Mascot */}
      {step === 2 && (
        <ChipMascot
          storageKey="chip-planning-budget"
          messages={[
            { text: "Thêm ngân sách để plan xịn hơn nha! 💰", delay: 2000 },
          ]}
        />
      )}
    </div>
  );
};

export default Planning;
