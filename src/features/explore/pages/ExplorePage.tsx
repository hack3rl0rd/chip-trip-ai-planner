import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Heart, Loader2, MessageCircle, Search, TrendingUp, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { getPlaceImage } from "@/features/planning/place-image";
import { usePublicFeed } from "@/features/explore/hooks/usePublicFeed";
import type { PublicFeedSort, TripPublicSummary } from "@/integrations/api";

/** Quyền riêng tư: feed public chỉ hiện độ dài chuyến ("3 ngày 2 đêm"), KHÔNG hiện ngày cụ thể. */
function formatTripDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
  const nights = Math.max(0, days - 1);
  return `${days} ngày ${nights} đêm`;
}

function TripCard({ trip, onClick }: { trip: TripPublicSummary; onClick: () => void }) {
  const ownerInitial = (trip.ownerName || "U")[0].toUpperCase();
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group text-left bg-card rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={trip.thumbnailUrl || getPlaceImage(trip.destination || trip.title, "attraction", 600, 400)}
          alt={trip.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getPlaceImage(trip.destination || trip.title, "attraction", 600, 400);
          }}
        />
        <div className="absolute top-3 right-3 flex gap-1.5">
          {trip.styles.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground truncate">{trip.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatTripDuration(trip.dateStart, trip.dateEnd)}</span>
          {trip.peopleCount != null && (
            <span className="inline-flex items-center gap-1 ml-auto">
              <Users className="w-3.5 h-3.5" /> {trip.peopleCount}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {trip.ownerAvatarUrl ? (
              <img src={trip.ownerAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                {ownerInitial}
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">{trip.ownerName || "Người dùng"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-chip-orange" /> {trip.likesCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> {trip.commentsCount}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

const ExplorePage = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [destination, setDestination] = useState("");
  const [sort, setSort] = useState<PublicFeedSort>("latest");

  // Debounce 400ms cho search destination
  useEffect(() => {
    const timer = setTimeout(() => setDestination(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = usePublicFeed(destination, sort);
  const trips = data?.pages.flatMap((page) => page.items) ?? [];
  const feedTabs = [
    { value: "latest" as const, label: "Mới nhất", icon: Calendar },
    { value: "featured" as const, label: "Nổi bật", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Khám phá 🌏</h1>
              <p className="text-muted-foreground mt-1">Lịch trình du lịch được cộng đồng ChipTrip chia sẻ</p>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo điểm đến (vd: Đà Lạt)..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-chip-orange"
                aria-label="Tìm kiếm điểm đến"
              />
            </div>
            <div className="inline-flex w-full max-w-xs rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Sap xep feed">
              {feedTabs.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={sort === value}
                  onClick={() => setSort(value)}
                  className={`flex-1 h-9 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                    sort === value
                      ? "bg-chip-orange text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="text-6xl">🔭</span>
              <p className="text-muted-foreground text-lg">
                {destination ? `Chưa có lịch trình công khai nào cho "${destination}"` : "Chưa có lịch trình công khai nào"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trips/${trip.id}/public`)} />
                ))}
              </div>
              {hasNextPage && (
                <div className="flex justify-center mt-8">
                  <Button variant="soft" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xem thêm"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
