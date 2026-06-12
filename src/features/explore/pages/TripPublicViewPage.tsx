import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Copy, Heart, Loader2, MapPin, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { getPlaceImage } from "@/features/planning/place-image";
import { useAuth } from "@/features/auth/useAuth";
import { useCloneTrip } from "@/hooks/useApi";
import { mapTripDetailToPlan } from "@/lib/trip-mapper";
import { usePublicTrip, useLikeStatus, useToggleLike } from "@/features/explore/hooks/usePublicFeed";
import CommentSection from "@/features/explore/components/CommentSection";
import ReportButton from "@/features/moderation/ReportButton";

const TripPublicViewPage = () => {
  const navigate = useNavigate();
  const { tripId: tripIdParam } = useParams<{ tripId: string }>();
  const tripId = tripIdParam ? Number(tripIdParam) : null;
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(0);

  const { data: detail, isLoading, error } = usePublicTrip(tripId);
  const { data: likeStatus } = useLikeStatus(tripId, !!user);
  const toggleLikeMutation = useToggleLike(tripId ?? -1);
  const cloneMutation = useCloneTrip();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
          <p className="text-muted-foreground">Đang tải lịch trình...</p>
        </div>
      </div>
    );
  }

  if (error || !detail || tripId == null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4 px-6 text-center">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-bold text-foreground">Không tìm thấy lịch trình công khai</h2>
          <p className="text-muted-foreground max-w-sm">Lịch trình có thể đã bị hủy công khai hoặc xóa.</p>
          <Button variant="hero" onClick={() => navigate("/explore")}>Về trang Khám phá</Button>
        </div>
      </div>
    );
  }

  const plan = mapTripDetailToPlan(detail);
  const ownerName = detail.user?.fullName || "Người dùng";
  const ownerAvatarUrl = detail.user?.avatarUrl ?? null;
  const ownerInitial = ownerName[0].toUpperCase();
  // Fallback khi chưa đăng nhập: dùng count từ trip detail
  const liked = likeStatus?.liked ?? false;
  const likesCount = likeStatus?.likesCount ?? detail.likesCount ?? 0;

  const handleLike = () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thả tim");
      navigate("/auth", { state: { from: `/trips/${tripId}/public` } });
      return;
    }
    toggleLikeMutation.mutate();
  };

  const handleClone = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để clone lịch trình");
      navigate("/auth", { state: { from: `/trips/${tripId}/public` } });
      return;
    }
    try {
      await cloneMutation.mutateAsync(tripId);
      toast.success("Đã clone lịch trình!", {
        description: "Bản sao đã được lưu vào \"Chuyến đi của tôi\"",
        action: { label: "Xem ngay", onClick: () => navigate("/saved") },
      });
    } catch {
      toast.error("Clone thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-3xl space-y-6">
          <Button variant="soft" size="sm" onClick={() => navigate("/explore")}>
            <ArrowLeft className="w-4 h-4" /> Khám phá
          </Button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 border border-border shadow-card space-y-4"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground">{plan.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {plan.destination}</span>
                  {/* Quyền riêng tư: bản public hiện độ dài chuyến, không hiện ngày đi cụ thể */}
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {plan.duration}</span>
                  {detail.peopleCount != null && (
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {detail.peopleCount} người</span>
                  )}
                  <span className="flex items-center gap-1"><Wallet className="w-4 h-4" /> {plan.totalCost} VNĐ</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  disabled={toggleLikeMutation.isPending}
                  aria-label={liked ? "Bỏ tim" : "Thả tim"}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    liked
                      ? "border-chip-orange bg-chip-orange/10 text-chip-orange"
                      : "border-border bg-card text-muted-foreground hover:border-chip-orange/40"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? "fill-chip-orange text-chip-orange" : ""}`} />
                  {likesCount}
                </button>
                <Button variant="hero" size="sm" onClick={handleClone} disabled={cloneMutation.isPending}>
                  <Copy className="w-3.5 h-3.5" /> Clone
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-3 border-t border-border">
              {ownerAvatarUrl ? (
                <img src={ownerAvatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {ownerInitial}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{ownerName}</p>
                <p className="text-xs text-muted-foreground">Chia sẻ lịch trình này</p>
              </div>
              {/* Báo cáo trip — chỉ hiện với người không phải chủ trip */}
              {user && user.id !== detail.user?.id && (
                <ReportButton targetType="PUBLIC_TRIP" targetId={tripId} variant="text" />
              )}
            </div>
          </motion.div>

          {/* Itinerary read-only */}
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {plan.days.map((day, dayIdx) => (
                <button
                  key={dayIdx}
                  onClick={() => setActiveDay(dayIdx)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                    activeDay === dayIdx
                      ? "border-chip-orange bg-chip-orange/10 text-chip-orange shadow-warm"
                      : "border-border bg-card text-muted-foreground hover:border-chip-orange/40"
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeDay === dayIdx ? "bg-chip-orange text-white" : "bg-muted text-muted-foreground"}`}>
                    {day.day}
                  </span>
                  {/* không hiện day.date — ẩn ngày cụ thể trên bản public */}
                </button>
              ))}
            </div>

            {plan.days[activeDay] && (
              <motion.div key={activeDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                <div className="space-y-3 pl-4 border-l-2 border-chip-orange/20 ml-4">
                  {plan.days[activeDay].items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate("/location", { state: { item, destination: plan.destination } })}
                      className="relative flex gap-4 bg-card rounded-xl p-4 border border-border shadow-card hover:shadow-warm transition-all ml-4 cursor-pointer hover:-translate-y-0.5"
                    >
                      <div className="absolute -left-[1.6rem] top-5 w-3 h-3 rounded-full border-2 border-background bg-chip-orange" />
                      <img
                        src={item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType)}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-chip-orange flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.time}
                        </span>
                        <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-foreground">{item.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
            <CommentSection tripId={tripId} tripOwnerId={detail.user?.id ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPublicViewPage;
