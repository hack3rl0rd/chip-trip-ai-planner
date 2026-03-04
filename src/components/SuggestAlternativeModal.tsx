import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, UtensilsCrossed, Hotel, Camera, Coffee, MapPin, Loader2 } from "lucide-react";
import type { TripItem } from "@/lib/trip-data";
import { getPlaceImage } from "@/lib/place-image";

const categories = [
  { id: "same", label: "Cùng loại", icon: RefreshCw, emoji: "🔄" },
  { id: "restaurant", label: "Quán ăn", icon: UtensilsCrossed, emoji: "🍜" },
  { id: "hotel", label: "Khách sạn", icon: Hotel, emoji: "🏨" },
  { id: "attraction", label: "Tham quan", icon: Camera, emoji: "📸" },
  { id: "cafe", label: "Cafe", icon: Coffee, emoji: "☕" },
  { id: "transport", label: "Di chuyển", icon: MapPin, emoji: "🚗" },
];

// Mock alternatives generator
function generateAlternatives(item: TripItem, category: string): TripItem[] {
  const altSets: Record<string, { title: string; desc: string; cost: string }[]> = {
    restaurant: [
      { title: "Bún bò Huế O Xuân", desc: "Bún bò truyền thống đậm đà", cost: "55K" },
      { title: "Cơm tấm Sài Gòn", desc: "Cơm tấm sườn bì chả", cost: "45K" },
      { title: "Bánh cuốn nóng Thanh Vân", desc: "Bánh cuốn nhân thịt thơm lừng", cost: "40K" },
    ],
    hotel: [
      { title: "Khách sạn Hạ Long Bay", desc: "View biển tuyệt đẹp", cost: "900K" },
      { title: "Homestay Garden House", desc: "Ấm cúng, gần trung tâm", cost: "450K" },
      { title: "Villa Sunset View", desc: "Biệt thự riêng tư cho nhóm", cost: "1.5M" },
    ],
    attraction: [
      { title: "Bảo tàng Mỹ thuật", desc: "Nghệ thuật đương đại VN", cost: "40K" },
      { title: "Công viên Thủ Lệ", desc: "Vườn thú và giải trí", cost: "50K" },
      { title: "Phố bích họa", desc: "Nghệ thuật đường phố", cost: "Miễn phí" },
    ],
    cafe: [
      { title: "The Coffee House", desc: "Không gian làm việc thoáng", cost: "55K" },
      { title: "Cafe Cộng", desc: "Phong cách retro độc đáo", cost: "45K" },
      { title: "Highlands Coffee", desc: "Phổ biến, wifi mạnh", cost: "50K" },
    ],
    transport: [
      { title: "Xe Limousine VIP", desc: "Ghế massage, wifi, nước uống", cost: "350K" },
      { title: "Xe giường nằm", desc: "Tiết kiệm, thoải mái", cost: "200K" },
      { title: "Xe khách Phương Trang", desc: "Hãng uy tín, đúng giờ", cost: "250K" },
      { title: "Thuê xe máy", desc: "Tự do khám phá, linh hoạt", cost: "150K/ngày" },
    ],
  };

  const resolvedCategory = category === "same" ? (item.bookingType || "attraction") : category;
  const alts = altSets[resolvedCategory] || altSets.attraction;

  return alts.map((alt, i) => ({
    ...item,
    id: `alt-${item.id}-${i}`,
    title: alt.title,
    desc: alt.desc,
    cost: alt.cost,
    bookingType: (category === "same" ? item.bookingType : category) as TripItem["bookingType"],
  }));
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: TripItem | null;
  onSelect: (newItem: TripItem) => void;
}

const SuggestAlternativeModal = ({ open, onClose, item, onSelect }: Props) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-load "same type" alternatives when modal opens
  const handleOpen = () => {
    if (item && !selectedCategory && alternatives.length === 0) {
      handleCategorySelect("same");
    }
  };

  const handleCategorySelect = (catId: string) => {
    if (!item) return;
    setSelectedCategory(catId);
    setLoading(true);
    setTimeout(() => {
      setAlternatives(generateAlternatives(item, catId));
      setLoading(false);
    }, 800);
  };

  const handleSelect = (alt: TripItem) => {
    onSelect(alt);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedCategory(null);
    setAlternatives([]);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleReset(); onClose(); } else { setTimeout(handleOpen, 100); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-chip-orange" />
            Đổi hoạt động khác
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            {/* Current item */}
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
              <img src={item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType)} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Đang thay thế:</p>
                <p className="font-semibold text-foreground truncate">{item.title}</p>
              </div>
            </div>

            {/* Category selection */}
            {!selectedCategory && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Bạn muốn đổi sang loại nào?</p>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-chip-orange/40 hover:shadow-warm transition-all text-left"
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-sm font-medium text-foreground">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-chip-orange animate-spin" />
                <p className="text-sm text-muted-foreground">AI đang tìm gợi ý...</p>
              </div>
            )}

            {/* Alternatives */}
            {selectedCategory && !loading && alternatives.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Gợi ý thay thế:</p>
                  <button onClick={handleReset} className="text-xs text-chip-orange hover:underline">
                    ← Chọn loại khác
                  </button>
                </div>
                <div className="space-y-2">
                  {alternatives.map(alt => (
                    <button
                      key={alt.id}
                      onClick={() => handleSelect(alt)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-chip-orange/40 hover:shadow-warm transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{alt.title}</p>
                        <p className="text-xs text-muted-foreground">{alt.desc}</p>
                      </div>
                      <span className="text-sm font-bold text-chip-orange flex-shrink-0">{alt.cost}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SuggestAlternativeModal;
