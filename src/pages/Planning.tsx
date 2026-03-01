import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Search, CalendarDays, Wallet, Heart, UtensilsCrossed, Camera, Mountain, ArrowRight, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const travelStyles = [
  { id: "healing", label: "Chữa lành", icon: Heart, emoji: "🧘" },
  { id: "food", label: "Ăn sập phố", icon: UtensilsCrossed, emoji: "🍜" },
  { id: "photo", label: "Sống ảo", icon: Camera, emoji: "📸" },
  { id: "adventure", label: "Mạo hiểm", icon: Mountain, emoji: "🏔️" },
];

const Planning = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [budget, setBudget] = useState([3]);
  const [styles, setStyles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const budgetLabels = ["< 1M", "1-3M", "3-5M", "5-10M", "10M+"];

  const toggleStyle = (id: string) => {
    setStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    setIsLoading(true);
    setTimeout(() => navigate("/result"), 2500);
  };

  const canNext = () => {
    if (step === 0) return destination.length > 0;
    if (step === 1) return dates.start && dates.end;
    if (step === 2) return true;
    if (step === 3) return styles.length > 0;
    return true;
  };

  const steps = [
    // Step 0: Destination
    <motion.div key="step0" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-3">
        <span className="text-5xl">🗺️</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Bạn muốn khám phá nơi nào?</h2>
        <p className="text-muted-foreground">Nhập tên thành phố, tỉnh thành hoặc quốc gia</p>
      </div>
      <div className="relative w-full max-w-lg">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="VD: Đà Nẵng, Phú Quốc, Nhật Bản..."
          className="w-full h-16 pl-14 pr-6 rounded-2xl border-2 border-border bg-card text-foreground text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all"
        />
      </div>
    </motion.div>,

    // Step 1: Dates
    <motion.div key="step1" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-3">
        <span className="text-5xl">📅</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Đi khi nào và trong bao lâu?</h2>
        <p className="text-muted-foreground">Chọn ngày bắt đầu và kết thúc</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Ngày đi
          </label>
          <input
            type="date"
            value={dates.start}
            onChange={(e) => setDates({ ...dates, start: e.target.value })}
            className="w-full h-14 px-4 rounded-xl border-2 border-border bg-card text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all"
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Ngày về
          </label>
          <input
            type="date"
            value={dates.end}
            onChange={(e) => setDates({ ...dates, end: e.target.value })}
            className="w-full h-14 px-4 rounded-xl border-2 border-border bg-card text-foreground font-medium focus:outline-none focus:border-chip-orange focus:ring-4 focus:ring-chip-orange/10 transition-all"
          />
        </div>
      </div>
    </motion.div>,

    // Step 2: Budget
    <motion.div key="step2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-3">
        <span className="text-5xl">💰</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Ngân sách cho chuyến đi?</h2>
        <p className="text-muted-foreground">Kéo thanh trượt để chọn mức ngân sách phù hợp</p>
      </div>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <span className="text-4xl font-bold text-gradient">{budgetLabels[budget[0]]}</span>
          <span className="text-muted-foreground ml-2">VNĐ</span>
        </div>
        <Slider
          value={budget}
          onValueChange={setBudget}
          max={4}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {budgetLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </motion.div>,

    // Step 3: Travel style
    <motion.div key="step3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-3">
        <span className="text-5xl">✨</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Gu du lịch của bạn là gì?</h2>
        <p className="text-muted-foreground">Chọn một hoặc nhiều phong cách</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {travelStyles.map((s) => (
          <button
            key={s.id}
            onClick={() => toggleStyle(s.id)}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${
              styles.includes(s.id)
                ? "border-chip-orange bg-chip-orange/10 shadow-warm"
                : "border-border bg-card hover:border-chip-orange/40"
            }`}
          >
            <span className="text-4xl">{s.emoji}</span>
            <span className="font-display font-semibold text-foreground">{s.label}</span>
          </button>
        ))}
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-6">
        {/* Progress */}
        <div className="container mx-auto max-w-lg mb-8">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? "bg-chip-orange" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="container mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-accent flex items-center justify-center animate-pulse-glow">
                  <Loader2 className="w-8 h-8 text-accent-foreground animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">AI đang tạo lịch trình...</h2>
                <p className="text-muted-foreground">Chip Trip đang phân tích dữ liệu và tìm kiếm lịch trình hoàn hảo cho bạn</p>
              </motion.div>
            ) : (
              steps[step]
            )}
          </AnimatePresence>

          {/* Navigation */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center mt-8 max-w-lg mx-auto"
            >
              <Button
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </Button>

              {step < 3 ? (
                <Button
                  variant="hero"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                >
                  Tiếp theo <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="cta"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!canNext()}
                >
                  <Sparkles className="w-5 h-5" />
                  Tạo lịch trình siêu tốc
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Planning;
