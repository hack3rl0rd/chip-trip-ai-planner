import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Star, Clock, Wallet, Lightbulb, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Phone, Globe, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TripItem } from "@/features/planning/trip-data";
import { getPlaceImage, optimizePlaceImageUrl } from "@/features/planning/place-image";
import { usePlaceDetail } from "@/hooks/useApi";
import ChipTripReviews from "@/features/location/components/ChipTripReviews";
import SafeImage from "@/components/SafeImage";
import { filterUsablePhotos } from "@/features/location/photo-gallery";
import { placesApi } from "@/integrations/api";

gsap.registerPlugin(useGSAP);

/* On-brand duck mark for the passport stub (decorative). */
const ChipDuck = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <ellipse cx="28" cy="42" rx="20" ry="15" fill="hsl(var(--chip-yellow))" />
    <path d="M12 44q16 13 32 0-2 12-16 12T12 44Z" fill="hsl(var(--chip-orange))" opacity="0.18" />
    <circle cx="42" cy="26" r="13" fill="hsl(var(--chip-yellow))" />
    <path d="M53 23l9-2q1 4-2 7l-7-1Z" fill="hsl(var(--chip-orange))" />
    <circle cx="45" cy="24" r="2.4" fill="#23170c" />
    <circle cx="45.8" cy="23.2" r="0.7" fill="#fff" />
  </svg>
);

const bookingConfig: Record<string, { icon: React.ElementType; label: string; kind: string }> = {
  hotel: { icon: Hotel, label: "Đặt phòng trên Traveloka", kind: "Lưu trú" },
  restaurant: { icon: UtensilsCrossed, label: "Xem trên Google Maps", kind: "Ẩm thực" },
  attraction: { icon: Ticket, label: "Mua vé trên Klook", kind: "Tham quan" },
  cafe: { icon: Coffee, label: "Xem trên Google Maps", kind: "Cà phê" },
  transport: { icon: MapPin, label: "Đặt xe trên Grab", kind: "Di chuyển" },
};

const LocationDetail = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const item = state?.item as TripItem | undefined;
  const destination = state?.destination as string | undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const reportedImageUrlsRef = useRef<Set<string>>(new Set());

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());

  // Fetch cached rich details from SerpApi & Goong
  const { data: placeDetail, refetch: refetchPlaceDetail } = usePlaceDetail(item?.placeCacheId);
  const providerPhotos = placeDetail?.photos || [];
  const photos = filterUsablePhotos(providerPhotos, failedImageUrls);

  useEffect(() => {
    setActivePhotoIndex((current) => photos.length === 0 ? 0 : Math.min(current, photos.length - 1));
  }, [photos.length]);

  // Lightbox keyboard support — Esc closes, ←/→ navigate, focus moves to Close on open.
  useEffect(() => {
    if (!isLightboxOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setIsLightboxOpen(false); setZoomScale(1); }
      else if (e.key === "ArrowRight" && photos.length > 0) { setActivePhotoIndex((p) => (p + 1) % photos.length); setZoomScale(1); }
      else if (e.key === "ArrowLeft" && photos.length > 0) { setActivePhotoIndex((p) => (p - 1 + photos.length) % photos.length); setZoomScale(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLightboxOpen, photos.length]);

  // Tasteful entrance — card lifts in, the field rows stagger up (reduced-motion safe).
  useGSAP(
    () => {
      if (!item) return;
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          if (!(ctx.conditions as { motion: boolean }).motion) return;
          gsap.timeline({ defaults: { ease: "power3.out" } })
            .from(".ld-card", { opacity: 0, y: 30, duration: 0.6 }, 0)
            .from(".ld-head", { opacity: 0, y: 16, duration: 0.5 }, 0.15)
            .from(".ld-field", { opacity: 0, y: 14, stagger: 0.05, duration: 0.45 }, 0.28);
        }
      );
    },
    { scope: rootRef, dependencies: [!!item] }
  );

  if (!item) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Không tìm thấy thông tin địa điểm</p>
          <Button variant="hero" onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </div>
    );
  }

  const displayTitle = placeDetail?.name || item.title;
  const fallbackHeroImage = getPlaceImage(displayTitle, item.bookingType, 1200, 800);
  const fallbackCardImage = getPlaceImage(displayTitle, item.bookingType, 800, 500);
  const fallbackThumbImage = getPlaceImage(displayTitle, item.bookingType, 160, 112);
  const markImageFailed = (url?: string | null) => {
    if (!url) return;
    setFailedImageUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });

    const placeCacheId = item.placeCacheId;
    if (placeCacheId && !reportedImageUrlsRef.current.has(url)) {
      reportedImageUrlsRef.current.add(url);
      void placesApi.reportPhotoFailure(placeCacheId, url)
        .then(() => refetchPlaceDetail())
        .catch(() => {
          // UI van loai anh loi ngay ca khi feedback endpoint tam thoi khong san sang.
        });
    }
  };

  const baseConfig = bookingConfig[item.bookingType || "attraction"] || bookingConfig.attraction;
  const BookingIcon = baseConfig.icon;
  let label = baseConfig.label;

  if (item.bookingUrl) {
    if (item.bookingUrl.toLowerCase().includes("trip.com")) {
      label = "Đặt phòng trên Trip.com";
    } else if (item.bookingUrl.toLowerCase().includes("agoda.com")) {
      label = "Đặt phòng trên Agoda";
    } else if (item.bookingUrl.toLowerCase().includes("booking.com")) {
      label = "Đặt phòng trên Booking.com";
    } else if (item.bookingUrl.toLowerCase().includes("traveloka.com")) {
      label = "Đặt phòng trên Traveloka";
    } else if (item.bookingUrl.toLowerCase().includes("hopegoo.com")) {
      label = "Đặt phòng trên HOPEGOO";
    } else if (item.bookingUrl.toLowerCase().includes("edreams.net")) {
      label = "Đặt phòng trên eDreams";
    }
  }

  const openMap = () => {
    const query = item.lat && item.lng
      ? `${item.lat},${item.lng}`
      : (placeDetail?.address || item.address);
    if (query) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
  };

  const handleBooking = () => {
    if (item.bookingUrl) window.open(item.bookingUrl, "_blank");
    else openMap();
  };

  const activePhoto = photos[activePhotoIndex];
  const hasMultiplePhotos = photos.length > 1;

  const nextPhoto = () => {
    if (photos.length > 0) {
      setActivePhotoIndex((prev) => (prev + 1) % photos.length);
      setZoomScale(1);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 0) {
      setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setZoomScale(1);
    }
  };

  const rating = placeDetail?.rating ?? (item.placeCacheId ? null : item.rating ?? null);
  const reviewCount = placeDetail?.reviewCount ?? 0;
  const address = placeDetail?.address || item.address;

  // Format address fallback: if it's coordinate lat,lng -> change to name/title
  const cleanAddress = address && !/^[0-9.-]+\s*,\s*[0-9.-]+$/.test(address)
    ? address
    : `${displayTitle}${destination ? `, ${destination}` : ""}`;

  const coordLabel = item.lat != null && item.lng != null
    ? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`
    : null;

  return (
    <div ref={rootRef} className="min-h-screen bg-paper">
      <Navbar />
      <div className="pt-20 pb-12">
        {/* Image / Gallery Carousel */}
        <div className="relative h-[55vh] overflow-hidden bg-muted cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
          {photos.length > 0 ? (
            <div className="relative w-full h-full">
              <motion.img
                key={activePhotoIndex}
                src={optimizePlaceImageUrl(activePhoto?.url || fallbackHeroImage, 1600, 1000)}
                alt={`${displayTitle} - Ảnh ${activePhotoIndex + 1}`}
                width={1600}
                height={1000}
                decoding="async"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full object-cover object-[center_35%]"
                onError={() => markImageFailed(activePhoto?.url)}
              />

              {hasMultiplePhotos && (
                <>
                  {/* Navigation Arrows */}
                  <button
                    onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:bg-background/80 text-foreground backdrop-blur-sm transition-colors z-20"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:bg-background/80 text-foreground backdrop-blur-sm transition-colors z-20"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Indicators */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(idx); }}
                        className={`h-2 rounded-full transition-all ${
                          idx === activePhotoIndex ? "bg-chip-orange w-5" : "bg-white/60 w-2"
                        }`}
                        aria-label={`Tới ảnh ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <SafeImage
              src={optimizePlaceImageUrl(
                providerPhotos.length === 0 && item.image && item.image !== "/placeholder.svg" && !failedImageUrls.has(item.image)
                  ? item.image
                  : getPlaceImage(displayTitle, item.bookingType, 1600, 1000),
                1600,
                1000,
              )}
              fallbackSrc={fallbackCardImage}
              alt={displayTitle}
              width={1600}
              height={1000}
              loading="eager"
              className="w-full h-full object-cover object-[center_35%]"
            />
          )}

          {/* Restrict gradient to bottom 35% only */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          {/* Coordinate stamp — boarding-pass / cartographer cue (kept on mobile too) */}
          {coordLabel && (
            <div className="absolute bottom-16 left-4 sm:left-6 z-20 flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-white/90 bg-black/35 backdrop-blur-sm rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
              <MapPin className="w-3.5 h-3.5" /> {coordLabel}
            </div>
          )}

          <Button
            variant="soft"
            size="sm"
            className="absolute bottom-16 right-4 sm:right-6 bg-background/80 backdrop-blur-sm z-20 flex items-center gap-1.5"
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
          >
            <ZoomIn className="w-4 h-4" /> Phóng to
          </Button>
          <Button
            variant="soft"
            size="sm"
            className="absolute top-4 left-4 sm:left-6 bg-background/80 backdrop-blur-sm shadow-md z-30"
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </div>

        <div className="container mx-auto px-5 sm:px-6 -mt-12 relative z-10">
          {/* Passport "place" page — stub header + perforation + body */}
          <div className="ld-card relative overflow-hidden bg-card rounded-[1.6rem] border border-border shadow-ticket max-w-2xl mx-auto">
            <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(55% 50% at 95% 0%, hsl(var(--chip-yellow) / 0.16), transparent 60%)",
            }} />

            {/* stub header */}
            <div className="ld-head relative p-6 sm:p-8 pb-5">
              <div className="flex items-center justify-between font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                <span className="flex items-center gap-1.5 text-chip-teal-ink"><ChipDuck className="w-4 h-4" /> Chip Trip</span>
                <span>Địa điểm · {baseConfig.kind}</span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="ld-title font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{displayTitle}</h1>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
                {/* rotated passport stamp */}
                <span className="stamp shrink-0 hidden sm:flex flex-col items-center justify-center w-[4.5rem] h-[4.5rem] -rotate-6 px-1 text-center">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] leading-tight">{baseConfig.kind}</span>
                  {rating != null
                    ? <span className="font-data text-lg font-bold leading-none mt-1">{rating}<span className="text-[10px]">★</span></span>
                    : <span className="font-data text-[10px] leading-none mt-1.5">CHIP·TRIP</span>}
                </span>
              </div>
            </div>

            {/* perforation */}
            <div className="relative h-5 ticket-perf border-y border-dashed border-border bg-card">
              <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-paper" />
              <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-paper" />
            </div>

            {/* body */}
            <div className="relative p-6 sm:p-8 pt-6 space-y-6">
              {/* Gallery Thumbnails List */}
              {hasMultiplePhotos && (
                <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        idx === activePhotoIndex ? "border-chip-orange scale-95 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <SafeImage
                        src={optimizePlaceImageUrl(photo.thumbnail || photo.url, 160, 112)}
                        fallbackSrc={fallbackThumbImage}
                        alt=""
                        width={80}
                        height={56}
                        className="w-full h-full object-cover"
                        onError={() => markImageFailed(photo.thumbnail)}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Field grid — passport-style data, mono labels + data-face values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="ld-field flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
                  <Clock className="w-5 h-5 text-chip-teal-ink flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Thời gian</p>
                    <p className="font-data text-base font-bold text-foreground">{item.time}</p>
                  </div>
                </div>
                <div className="ld-field flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
                  <Wallet className="w-5 h-5 text-chip-orange-ink flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chi phí</p>
                    <p className="font-data text-base font-bold text-foreground">{item.cost}</p>
                  </div>
                </div>

                {/* Star Rating Section */}
                <div className="ld-field flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
                  <Star className="w-5 h-5 text-chip-yellow fill-chip-yellow flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Đánh giá chung</p>
                    <p className="font-semibold text-foreground text-sm">
                      {rating != null
                        ? <><span className="font-data text-base font-bold">{rating}</span>/5{reviewCount > 0 ? ` · ${reviewCount} đánh giá` : ""}</>
                        : "Chưa có đánh giá"}
                    </p>
                  </div>
                </div>

                {cleanAddress && (
                  <div className="ld-field flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
                    <MapPin className="w-5 h-5 text-chip-teal-ink flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Địa chỉ</p>
                      <p className="font-semibold text-foreground text-sm sm:truncate">{cleanAddress}</p>
                    </div>
                  </div>
                )}

                {/* Dynamic Phone & Website */}
                {placeDetail?.phone && (
                  <div className="ld-field flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
                    <Phone className="w-5 h-5 text-chip-teal-ink flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Điện thoại</p>
                      <p className="font-data font-bold text-foreground text-sm">{placeDetail.phone}</p>
                    </div>
                  </div>
                )}
                {placeDetail?.website && (
                  <div className="ld-field flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
                    <Globe className="w-5 h-5 text-chip-orange-ink flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Website</p>
                      <a
                        href={placeDetail.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-chip-orange-ink hover:underline text-sm flex items-center gap-1"
                      >
                        Ghé thăm trang web <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Opening Hours list */}
                {placeDetail?.openingHours && placeDetail.openingHours.length > 0 && (
                  <div className="ld-field p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2 sm:col-span-2">
                    <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                      <Clock className="w-4 h-4 text-chip-teal-ink" />
                      <span>Giờ mở cửa</span>
                      {placeDetail.openState && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ml-2 ${
                          placeDetail.openState === "OPEN"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}>
                          {placeDetail.openState === "OPEN" ? "Đang mở cửa" : "Đã đóng cửa"}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                      {placeDetail.openingHours.map((oh, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-dashed border-border/40">
                          <span className="font-medium text-foreground/80">{oh.day}</span>
                          <span className="font-data">{oh.hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {item.tips && (
                <div className="flex gap-3 p-4 rounded-xl bg-chip-yellow-light border border-dashed border-chip-yellow/40">
                  <Lightbulb className="w-5 h-5 text-chip-orange-ink flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-chip-orange-ink">Mẹo du lịch</p>
                    <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{item.tips}</p>
                  </div>
                </div>
              )}

              {/* Reviews — 2 tab: Google (serpReviews) + ChipTrip (place_reviews DB) */}
              <div className="border-t border-dashed border-border pt-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-chip-yellow fill-chip-yellow" />
                  Đánh giá từ du khách
                </h2>
                <Tabs defaultValue="google" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="google">Đánh giá từ Google</TabsTrigger>
                    <TabsTrigger value="chiptrip">Đánh giá ChipTrip</TabsTrigger>
                  </TabsList>

                  <TabsContent value="google" className="mt-4">
                    <div className="space-y-3">
                      {placeDetail?.reviews && placeDetail.reviews.length > 0 ? (
                        placeDetail.reviews.map((review, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-8 h-8 rounded-full bg-chip-teal-light overflow-hidden flex items-center justify-center text-xs font-bold text-chip-teal-ink shrink-0">
                                  {review.author?.charAt(0) || "U"}
                                  {review.avatar && (
                                    <img
                                      src={review.avatar}
                                      alt=""
                                      className="absolute inset-0 w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                                    />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{review.author || "Người dùng ẩn danh"}</p>
                                  <p className="font-data text-[11px] text-muted-foreground">{review.time}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 bg-chip-yellow/10 px-2 py-0.5 rounded-lg">
                                <Star className="w-3.5 h-3.5 text-chip-yellow fill-chip-yellow" />
                                <span className="font-data text-xs font-bold text-chip-orange-ink">{review.rating}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Chưa có đánh giá nào từ Google Maps.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="chiptrip" className="mt-4">
                    {item.placeCacheId != null ? (
                      <ChipTripReviews placeCacheId={item.placeCacheId} />
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Địa điểm này chưa hỗ trợ đánh giá ChipTrip.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Affiliate CTA */}
              <div className="space-y-2 pt-2">
                <Button variant="hero" className="w-full" onClick={handleBooking}>
                  <BookingIcon className="w-4 h-4" />
                  {label}
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button variant="soft" className="w-full" onClick={openMap}>
                  <MapPin className="w-4 h-4" /> Xem trên bản đồ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={displayTitle}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-6"
          onClick={() => { setIsLightboxOpen(false); setZoomScale(1); }}
        >
          {/* Close button */}
          <div className="flex justify-end">
            <button
              ref={closeBtnRef}
              onClick={() => { setIsLightboxOpen(false); setZoomScale(1); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Fullscreen Image */}
          <div
            className={`relative flex-1 flex items-center justify-center max-h-[70vh] ${zoomScale > 1 ? "overflow-auto p-4" : ""}`}
            onClick={() => setZoomScale(1)}
          >
            <motion.img
              key={activePhotoIndex}
              src={optimizePlaceImageUrl(
                photos.length > 0
                  ? activePhoto?.url || fallbackHeroImage
                  : providerPhotos.length === 0 && item.image && item.image !== "/placeholder.svg" && !failedImageUrls.has(item.image)
                    ? item.image
                    : fallbackHeroImage,
                1600,
                1200,
              )}
              alt={`${displayTitle} — Ảnh ${activePhotoIndex + 1} / ${photos.length > 0 ? photos.length : 1}`}
              width={1600}
              height={1200}
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ transform: `scale(${zoomScale})`, transition: "transform 0.3s ease" }}
              className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${zoomScale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              onError={() => markImageFailed(photos.length > 0 ? activePhoto?.url : item.image)}
              onClick={(e) => {
                e.stopPropagation();
                setZoomScale((prev) => (prev === 1 ? 1.75 : 1));
              }}
            />

            {hasMultiplePhotos && zoomScale === 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Fullscreen Thumbnail row */}
          <div className="flex flex-col items-center gap-4">
            <p className="font-data text-white/60 text-sm">
              Ảnh {activePhotoIndex + 1} / {photos.length > 0 ? photos.length : 1}
            </p>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full py-2 no-scrollbar justify-center">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(idx); setZoomScale(1); }}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      idx === activePhotoIndex ? "border-chip-orange scale-95" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <SafeImage
                      src={optimizePlaceImageUrl(photo.thumbnail || photo.url, 160, 120)}
                      fallbackSrc={fallbackThumbImage}
                      alt=""
                      width={64}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={() => markImageFailed(photo.thumbnail)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDetail;
