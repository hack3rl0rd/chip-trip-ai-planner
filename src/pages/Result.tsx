import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Wallet, Star, Bookmark, Share2, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";
import tripDanang from "@/assets/trip-danang.jpg";
import tripHoian from "@/assets/trip-hoian.jpg";
import tripSapa from "@/assets/trip-sapa.jpg";

const itinerary = [
  {
    day: "Ngày 1",
    date: "15/03/2026",
    items: [
      { time: "08:00", title: "Checkin khách sạn Mường Thanh", desc: "Nghỉ ngơi, chuẩn bị", cost: "800K", image: tripDanang },
      { time: "10:30", title: "Tham quan Bà Nà Hills", desc: "Cầu Vàng, Fantasy Park", cost: "900K", image: tripDanang },
      { time: "12:30", title: "Ăn trưa hải sản Mỹ Khê", desc: "Quán bà Tư - Đặc sản ghẹ hấp", cost: "350K", image: tripHoian },
      { time: "15:00", title: "Uống cafe Son Trà", desc: "View biển cực đẹp", cost: "80K", image: tripSapa },
    ],
  },
  {
    day: "Ngày 2",
    date: "16/03/2026",
    items: [
      { time: "07:00", title: "Bình minh tại Bãi Mỹ Khê", desc: "Chạy bộ + check-in sống ảo", cost: "Miễn phí", image: tripDanang },
      { time: "09:00", title: "Đi phố cổ Hội An", desc: "Dạo phố, mua quà lưu niệm", cost: "200K", image: tripHoian },
      { time: "12:00", title: "Ăn Cao lầu & Mì Quảng", desc: "Quán bà Liên - Phố cổ", cost: "120K", image: tripHoian },
      { time: "19:00", title: "Thả đèn hoa đăng", desc: "Trải nghiệm văn hóa Hội An", cost: "50K", image: tripHoian },
    ],
  },
  {
    day: "Ngày 3",
    date: "17/03/2026",
    items: [
      { time: "08:00", title: "Chùa Linh Ứng Sơn Trà", desc: "Tượng Phật Quan Âm cao nhất VN", cost: "Miễn phí", image: tripSapa },
      { time: "11:00", title: "Bảo tàng Chăm", desc: "Tìm hiểu văn hóa Chăm Pa", cost: "60K", image: tripDanang },
      { time: "14:00", title: "Mua sắm tại chợ Hàn", desc: "Đặc sản, quà lưu niệm", cost: "500K", image: tripHoian },
    ],
  },
];

const Result = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left - Map (40%) */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card h-[70vh]">
                  {/* Simulated map */}
                  <div className="relative w-full h-full bg-muted">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-accent mx-auto flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-accent-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">Bản đồ lịch trình</p>
                        <p className="text-sm text-muted-foreground">Đà Nẵng - Hội An</p>
                      </div>
                    </div>
                    {/* Simulated pins */}
                    {[
                      { top: "20%", left: "30%", n: 1 },
                      { top: "35%", left: "55%", n: 2 },
                      { top: "50%", left: "40%", n: 3 },
                      { top: "65%", left: "60%", n: 4 },
                      { top: "75%", left: "35%", n: 5 },
                    ].map((pin) => (
                      <div
                        key={pin.n}
                        className="absolute w-8 h-8 rounded-full bg-chip-orange flex items-center justify-center text-accent-foreground text-sm font-bold shadow-warm"
                        style={{ top: pin.top, left: pin.left }}
                      >
                        {pin.n}
                      </div>
                    ))}
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
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Đà Nẵng - Hội An 3N2Đ 🏖️</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 3 ngày 2 đêm</span>
                      <span className="flex items-center gap-1"><Wallet className="w-4 h-4" /> ~3.06M VNĐ</span>
                      <span className="flex items-center gap-1"><Star className="w-4 h-4 text-chip-yellow" /> 4.8</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="soft" size="sm"><Share2 className="w-4 h-4" /></Button>
                    <Button variant="hero" size="sm"><Bookmark className="w-4 h-4" /> Lưu kế hoạch</Button>
                  </div>
                </div>
              </motion.div>

              {/* Timeline */}
              {itinerary.map((day, dayIdx) => (
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
                    {day.items.map((item, idx) => (
                      <div key={idx} className="relative flex gap-4 bg-card rounded-xl p-4 border border-border shadow-card hover:shadow-warm transition-shadow ml-4">
                        <div className="absolute -left-[1.6rem] top-5 w-3 h-3 rounded-full bg-chip-orange border-2 border-background" />
                        <img src={item.image} alt={item.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-chip-orange">{item.time}</span>
                          </div>
                          <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-foreground">{item.cost}</span>
                        </div>
                      </div>
                    ))}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
