import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Edit3, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import tripDanang from "@/assets/trip-danang.jpg";
import tripHoian from "@/assets/trip-hoian.jpg";
import tripSapa from "@/assets/trip-sapa.jpg";
import tripPhuquoc from "@/assets/trip-phuquoc.jpg";

const savedTrips = [
  { id: 1, title: "Đà Nẵng - Hội An 3N2Đ", date: "15-17/03/2026", budget: "3.06M", image: tripDanang, tags: ["Biển", "Ẩm thực"] },
  { id: 2, title: "Phố cổ Hội An 2N1Đ", date: "20-21/04/2026", budget: "1.5M", image: tripHoian, tags: ["Văn hóa", "Sống ảo"] },
  { id: 3, title: "Sapa trekking 4N3Đ", date: "01-04/05/2026", budget: "4.2M", image: tripSapa, tags: ["Mạo hiểm", "Chữa lành"] },
  { id: 4, title: "Phú Quốc thiên đường", date: "10-13/06/2026", budget: "5.8M", image: tripPhuquoc, tags: ["Biển", "Resort"] },
];

const SavedPlans = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-foreground">Chuyến đi của tôi 🐥</h1>
              <p className="text-muted-foreground mt-1">{savedTrips.length} kế hoạch đã lưu</p>
            </div>
            <Link to="/planning">
              <Button variant="hero" size="default">
                <Plus className="w-4 h-4" /> Tạo chuyến mới
              </Button>
            </Link>
          </motion.div>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedTrips.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-card rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={trip.image}
                    alt={trip.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {trip.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-display font-bold text-foreground">{trip.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{trip.date}</span>
                    <span className="ml-auto font-semibold text-chip-orange">{trip.budget}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/result" className="flex-1">
                      <Button variant="soft" size="sm" className="w-full">
                        <Eye className="w-3.5 h-3.5" /> Xem lại
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedPlans;
