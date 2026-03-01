import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, MapPin, Calendar, Wallet } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";
import Navbar from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Story */}
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

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-foreground">
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
                Trải nghiệm tạo lịch trình bằng AI
              </Button>
            </Link>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              {[
                { icon: MapPin, label: "500+ địa điểm" },
                { icon: Calendar, label: "10K+ lịch trình" },
                { icon: Wallet, label: "Tiết kiệm 70%" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <stat.icon className="w-4 h-4 text-chip-orange" />
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-warm">
              <img
                src={heroImage}
                alt="Du lịch Việt Nam - Vịnh Hạ Long"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />

              {/* Floating card */}
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
    </div>
  );
};

export default Index;
