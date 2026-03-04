import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap, MapPin, UtensilsCrossed, Shield, Star, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

const features = [
  { icon: Sparkles, title: "AI đề xuất thông minh", desc: "Gợi ý quán ăn, khách sạn 5 sao với giá ẩn và review thật từ cộng đồng" },
  { icon: Zap, title: "Không giới hạn lượt AI", desc: "Tạo bao nhiêu lịch trình cũng được, không lo hết credits" },
  { icon: MapPin, title: "Lịch trình chi tiết hơn", desc: "Thêm giờ di chuyển, khoảng cách, phương tiện tối ưu giữa các điểm" },
  { icon: UtensilsCrossed, title: "Đề xuất thay thế thông minh", desc: "Không thích chỗ nào? AI gợi ý 3-5 lựa chọn thay thế phù hợp gu của bạn" },
  { icon: Shield, title: "Bảo hiểm du lịch tích hợp", desc: "Mua bảo hiểm trực tiếp trong app với giá ưu đãi đặc biệt" },
  { icon: Star, title: "Ưu tiên hỗ trợ", desc: "Chat trực tiếp với đội ngũ hỗ trợ 24/7, ưu tiên phản hồi nhanh" },
];

const plans = [
  {
    name: "Starter",
    price: "Miễn phí",
    period: "",
    features: ["1 lượt AI/ngày", "Lịch trình cơ bản", "Checklist chuẩn bị đồ", "Export ảnh"],
    cta: "Đang dùng",
    active: true,
  },
  {
    name: "Premium",
    price: "79K",
    period: "/3 lượt",
    features: ["3 lượt tạo lịch trình AI", "Đề xuất thay thế thông minh", "Lịch trình chi tiết", "Export PDF + Ảnh", "Bảo hiểm du lịch giảm 20%"],
    cta: "Nâng cấp ngay",
    popular: true,
  },
  {
    name: "Pro Traveler",
    price: "149K",
    period: "/5 lượt",
    features: ["5 lượt tạo lịch trình AI", "Đề xuất khách sạn + deal ẩn", "Hỗ trợ 24/7", "Chia sẻ lịch trình nhóm", "Early access tính năng mới"],
    cta: "Nâng cấp ngay",
  },
];

const Premium = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent">
              <Crown className="w-5 h-5 text-accent-foreground" />
              <span className="text-sm font-bold text-accent-foreground">Premium</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              Nâng cấp trải nghiệm <span className="text-gradient">du lịch</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mở khóa toàn bộ sức mạnh AI để tạo lịch trình hoàn hảo, đề xuất thông minh và nhiều tính năng độc quyền
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-5 space-y-3 hover:shadow-warm transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Pricing */}
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Chọn gói phù hợp</h2>
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={`bg-card rounded-2xl border-2 p-6 space-y-4 relative ${
                  plan.popular ? "border-chip-orange shadow-warm" : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-accent text-xs font-bold text-accent-foreground">
                    Phổ biến nhất ⭐
                  </div>
                )}
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-gradient">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-chip-orange flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.active ? "soft" : plan.popular ? "hero" : "soft"}
                  className="w-full"
                  disabled={plan.active}
                  onClick={() => !plan.active && navigate(`/checkout?plan=${plan.name === "Premium" ? "premium" : "pro"}`)}
                >
                  {plan.active ? "Đang dùng" : plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
