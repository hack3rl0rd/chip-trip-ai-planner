import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, MapPin, Calendar, Wallet, ArrowRight, Star, Users, Zap, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";
import tripDanang from "@/assets/trip-danang.jpg";
import tripSapa from "@/assets/trip-sapa.jpg";
import tripPhuquoc from "@/assets/trip-phuquoc.jpg";
import tripHoian from "@/assets/trip-hoian.jpg";
import Navbar from "@/components/Navbar";

const popularDestinations = [
  { name: "Đà Nẵng", emoji: "🏖️", desc: "Biển xanh & Cầu Vàng", image: tripDanang, days: "3N2Đ", price: "~3M" },
  { name: "Sapa", emoji: "🏔️", desc: "Ruộng bậc thang & Fansipan", image: tripSapa, days: "3N2Đ", price: "~4M" },
  { name: "Phú Quốc", emoji: "🌴", desc: "Đảo ngọc & hải sản", image: tripPhuquoc, days: "4N3Đ", price: "~5M" },
  { name: "Hội An", emoji: "🏮", desc: "Phố cổ & đèn lồng", image: tripHoian, days: "2N1Đ", price: "~2M" },
];

const steps = [
  { icon: MapPin, title: "Chọn điểm đến", desc: "Nhập tên thành phố bạn muốn khám phá", emoji: "📍" },
  { icon: Calendar, title: "Chọn ngày & ngân sách", desc: "Kéo thanh trượt chọn mức chi phí phù hợp", emoji: "💰" },
  { icon: Sparkles, title: "AI tạo lịch trình", desc: "Lịch trình chi tiết theo từng khung giờ trong vài giây", emoji: "⚡" },
];

const testimonials = [
  { name: "Minh Anh", avatar: "🧑‍💻", role: "Freelancer", text: "Mình tiết kiệm cả ngày research nhờ Chip Trip. Lịch trình Đà Lạt quá chuẩn!", rating: 5 },
  { name: "Hà Linh", avatar: "👩‍🎓", role: "Sinh viên", text: "App quá xịn! Mình plan được chuyến Sapa cho 6 người chỉ trong 5 phút.", rating: 5 },
  { name: "Đức Phong", avatar: "👨‍💼", role: "Dân văn phòng", text: "Gợi ý quán ăn chính xác luôn, đi Đà Nẵng về mà nhớ mãi con ghẹ!", rating: 5 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chip-yellow-light">
              <Sparkles className="w-4 h-4 text-chip-orange" />
              <span className="text-sm font-medium text-foreground">Được hỗ trợ bởi AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              Lên kế hoạch du lịch
              <br />
              <span className="text-gradient">siêu tốc</span> cùng
              <br />
              Chip Trip 🐥
            </h1>

            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Chỉ cần cho mình biết bạn thích gì, Chip Trip sẽ lên lịch trình hoàn hảo trong vài giây. Không cần Google, không cần hỏi ai!
            </p>

            <Link to="/planning">
              <Button variant="hero" size="xl" className="mt-4">
                <Sparkles className="w-5 h-5" />
                Tạo lịch trình miễn phí
              </Button>
            </Link>

            <div className="flex gap-6 sm:gap-8 pt-4 flex-wrap">
              {[
                { icon: MapPin, label: "500+ địa điểm" },
                { icon: Users, label: "10K+ người dùng" },
                { icon: Wallet, label: "Tiết kiệm 70%" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <stat.icon className="w-4 h-4 text-chip-orange" />
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-warm">
              <img
                src={heroImage}
                alt="Du lịch Việt Nam - Vịnh Hạ Long"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-6 left-6 right-6 bg-background/90 backdrop-blur-md rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">Vịnh Hạ Long</p>
                    <p className="text-sm text-muted-foreground">3 ngày • 2.5M VNĐ • Chữa lành</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-sm font-semibold text-chip-orange uppercase tracking-wide">Cách hoạt động</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">3 bước siêu đơn giản 🚀</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Từ ý tưởng đến lịch trình chi tiết chỉ trong vài giây</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-accent mx-auto flex items-center justify-center text-3xl mb-4 shadow-warm">
                  {step.emoji}
                </div>
                <h3 className="font-display font-bold text-foreground text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{step.desc}</p>
                {i < 2 && (
                  <ArrowRight className="hidden sm:block absolute -right-4 top-8 w-6 h-6 text-chip-orange/40" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between mb-10 flex-wrap gap-4"
          >
            <div>
              <span className="text-sm font-semibold text-chip-orange uppercase tracking-wide">Điểm đến phổ biến</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">Khám phá Việt Nam 🇻🇳</h2>
            </div>
            <Link to="/planning">
              <Button variant="soft" size="sm">Xem tất cả <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((dest, i) => (
              <motion.div
                key={dest.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to="/planning" className="group block">
                  <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1">
                    <img src={dest.image} alt={dest.name} className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-lg">{dest.emoji}</span>
                        <h3 className="font-display font-bold text-background text-lg">{dest.name}</h3>
                      </div>
                      <p className="text-background/80 text-sm">{dest.desc}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-background/70">
                        <span>{dest.days}</span>
                        <span>•</span>
                        <span className="font-semibold text-chip-yellow">{dest.price} VNĐ</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-sm font-semibold text-chip-orange uppercase tracking-wide">Đánh giá</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">Được tin dùng bởi 10K+ du khách ⭐</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-card"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-chip-yellow text-chip-yellow" />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.avatar}</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features highlight */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-sm font-semibold text-chip-orange uppercase tracking-wide">Tính năng</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">Tại sao chọn Chip Trip? 🐥</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { emoji: "🤖", title: "AI thông minh", desc: "Lịch trình được AI tối ưu theo gu và ngân sách của bạn" },
              { emoji: "💰", title: "Dự toán chi phí", desc: "Biết trước chi phí từng hoạt động, không bị bất ngờ" },
              { emoji: "🗺️", title: "Bản đồ trực quan", desc: "Xem toàn bộ lịch trình trên Google Maps" },
              { emoji: "🎒", title: "Checklist chuẩn bị", desc: "AI gợi ý đồ cần mang theo dựa trên điểm đến" },
              { emoji: "🔗", title: "Đặt chỗ nhanh", desc: "Link đặt phòng, vé tham quan ngay trong lịch trình" },
              { emoji: "📤", title: "Chia sẻ dễ dàng", desc: "Xuất PDF, ảnh đẹp hoặc link để khoe bạn bè" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-card hover:shadow-warm transition-all"
              >
                <span className="text-3xl flex-shrink-0">{f.emoji}</span>
                <div>
                  <h3 className="font-display font-bold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-accent rounded-3xl p-10 sm:p-16 text-center shadow-warm"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-accent-foreground mb-4">Sẵn sàng khám phá? 🚀</h2>
            <p className="text-accent-foreground/80 mb-8 max-w-md mx-auto">
              Tạo lịch trình du lịch hoàn hảo chỉ trong 30 giây. Hoàn toàn miễn phí!
            </p>
            <Link to="/planning">
              <Button size="xl" className="bg-background text-foreground hover:bg-background/90 font-bold text-lg px-8">
                <Sparkles className="w-5 h-5" />
                Bắt đầu ngay
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                <MapPin className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">
                Chip<span className="text-gradient">Trip</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Chip Trip. Tất cả quyền được bảo lưu. 🐥</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Điều khoản</a>
              <a href="#" className="hover:text-foreground transition-colors">Chính sách</a>
              <a href="#" className="hover:text-foreground transition-colors">Liên hệ</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
