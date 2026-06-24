import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Compass, Heart, Loader2, MapPin, MessageCircle, Search, SearchX, TrendingUp, Users } from "lucide-react";
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

function TripCard({ trip, onClick, index }: { trip: TripPublicSummary; onClick: () => void; index: number }) {
  const ownerInitial = (trip.ownerName || "U")[0].toUpperCase();
  const duration = formatTripDuration(trip.dateStart, trip.dateEnd);
  return (
    <motion.button
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group relative text-left bg-card rounded-3xl border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chip-orange/70"
    >
      {/* hover keyline */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r from-transparent via-chip-orange to-chip-yellow opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative h-48 overflow-hidden">
        <img
          src={trip.thumbnailUrl || getPlaceImage(trip.destination || trip.title, "attraction", 600, 400)}
          alt={trip.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getPlaceImage(trip.destination || trip.title, "attraction", 600, 400);
          }}
        />
        {/* legibility scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />

        {/* style tags */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {trip.styles.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-semibold text-foreground shadow-sm">
              {tag}
            </span>
          ))}
        </div>

        {/* destination + duration overlay */}
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          {trip.destination && (
            <span className="inline-flex items-center gap-1 text-white font-display font-semibold text-sm drop-shadow truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-chip-yellow" />
              <span className="truncate">{trip.destination}</span>
            </span>
          )}
          {duration && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-semibold text-foreground">
              {duration}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground text-[15px] leading-snug truncate">{trip.title}</h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{duration || "Lịch trình"}</span>
          {trip.peopleCount != null && (
            <span className="inline-flex items-center gap-1 ml-auto">
              <Users className="w-3.5 h-3.5" /> {trip.peopleCount}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <div className="flex items-center gap-2 min-w-0 pt-2.5">
            {trip.ownerAvatarUrl ? (
              <img src={trip.ownerAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                {ownerInitial}
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">{trip.ownerName || "Người dùng"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0 pt-2.5">
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

      {/* Hero band */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(70% 120% at 85% -20%, hsl(var(--chip-orange) / 0.16), transparent 60%), radial-gradient(60% 100% at 0% 0%, hsl(var(--chip-yellow) / 0.12), transparent 55%)",
          }}
        />
        <div className="relative pt-28 pb-10 px-6">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1] }}>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-chip-orange">
                <Compass className="w-3.5 h-3.5" /> Cộng đồng ChipTrip
              </p>
              <h1 className="font-display font-bold text-foreground text-3xl sm:text-4xl lg:text-5xl leading-[1.06] tracking-tight mt-4 max-w-2xl">
                Khám phá những <span className="text-gradient">hành trình</span> có thật
              </h1>
              <p className="text-muted-foreground mt-4 max-w-xl text-[15px] leading-relaxed">
                Lịch trình du lịch được cộng đồng ChipTrip chia sẻ — chọn cảm hứng, rồi
                tự tạo chuyến của riêng bạn.
              </p>
            </motion.div>

            {/* Toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo điểm đến (vd: Đà Lạt)…"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card/80 backdrop-blur text-foreground text-sm transition-colors focus:outline-none focus:border-chip-orange focus:ring-2 focus:ring-chip-orange/20"
                  aria-label="Tìm kiếm điểm đến"
                />
              </div>
              <div className="inline-flex w-full sm:w-auto rounded-xl border border-border bg-card/80 backdrop-blur p-1" role="tablist" aria-label="Sắp xếp feed">
                {feedTabs.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={sort === value}
                    onClick={() => setSort(value)}
                    className={`flex-1 sm:flex-initial h-9 px-4 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                      sort === value
                        ? "bg-chip-orange text-white shadow-warm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="pt-8 pb-14 px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
              <p className="text-muted-foreground">Đang tải…</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="w-16 h-16 rounded-2xl bg-chip-orange/10 border border-chip-orange/20 flex items-center justify-center text-chip-orange">
                <SearchX className="w-7 h-7" />
              </span>
              <p className="text-muted-foreground text-lg max-w-sm">
                {destination ? `Chưa có lịch trình công khai nào cho “${destination}”` : "Chưa có lịch trình công khai nào"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                {trips.map((trip, i) => (
                  <TripCard key={trip.id} trip={trip} index={i} onClick={() => navigate(`/trips/${trip.id}/public`)} />
                ))}
              </div>
              {hasNextPage && (
                <div className="flex justify-center mt-10">
                  <Button variant="soft" size="lg" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xem thêm hành trình"}
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
