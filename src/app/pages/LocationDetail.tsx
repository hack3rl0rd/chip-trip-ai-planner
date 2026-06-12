import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Star, Clock, Wallet, Lightbulb, ExternalLink, Hotel, UtensilsCrossed, Ticket, Coffee, Phone, Globe, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TripItem } from "@/features/planning/trip-data";
import { getPlaceImage } from "@/features/planning/place-image";
import { usePlaceDetail } from "@/hooks/useApi";
import ChipTripReviews from "@/features/location/components/ChipTripReviews";

const bookingConfig: Record<string, { icon: React.ElementType; label: string; platform: string }> = {
  hotel: { icon: Hotel, label: "Đặt phòng trên Traveloka", platform: "traveloka.com" },
  restaurant: { icon: UtensilsCrossed, label: "Xem trên Google Maps", platform: "maps.google.com" },
  attraction: { icon: Ticket, label: "Mua vé trên Klook", platform: "klook.com" },
  cafe: { icon: Coffee, label: "Xem trên Google Maps", platform: "maps.google.com" },
  transport: { icon: MapPin, label: "Đặt xe trên Grab", platform: "grab.com" },
};

// Removed simulated reviews logic

const LocationDetail = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const item = state?.item as TripItem | undefined;
  const destination = state?.destination as string | undefined;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Fetch cached rich details from SerpApi & Goong
  const { data: placeDetail } = usePlaceDetail(item?.placeCacheId);

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Không tìm thấy thông tin địa điểm</p>
          <Button variant="hero" onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </div>
    );
  }

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

  const photos = placeDetail?.photos || [];
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

  const rating = placeDetail?.rating ?? item.rating ?? 4.5;
  const reviewCount = placeDetail?.reviewCount ?? 0;
  const address = placeDetail?.address || item.address;

  // Format address fallback: if it's coordinate lat,lng -> change to name/title
  const cleanAddress = address && !/^[0-9.-]+\s*,\s*[0-9.-]+$/.test(address)
    ? address
    : `${item.title}${destination ? `, ${destination}` : ""}`;

// Simulated reviews removed

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        {/* Image / Gallery Carousel */}
        <div className="relative h-[55vh] overflow-hidden bg-muted cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
          {photos.length > 0 ? (
            <div className="relative w-full h-full">
              <motion.img
                key={activePhotoIndex}
                src={photos[activePhotoIndex].url}
                alt={`${item.title} - Ảnh ${activePhotoIndex + 1}`}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full object-cover"
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
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === activePhotoIndex ? "bg-primary w-4" : "bg-primary-foreground/50"
                        }`}
                        aria-label={`Tới ảnh ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <img
              src={item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType, 800, 500)}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Restrict gradient to bottom 30% only */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          
          <Button
            variant="soft"
            size="sm"
            className="absolute bottom-16 right-6 bg-background/80 backdrop-blur-sm z-20 flex items-center gap-1.5"
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
          >
            <ZoomIn className="w-4 h-4" /> Phóng to
          </Button>
          <Button
            variant="soft"
            size="sm"
            className="absolute top-24 left-6 bg-background/80 backdrop-blur-sm z-20"
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </div>

        {/* Click outside overlay */}
        <div className="fixed inset-0 z-0" onClick={() => navigate(-1)} />

        <div className="container mx-auto px-6 -mt-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 border border-border shadow-card space-y-6 max-w-2xl mx-auto"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">{item.title}</h1>
              <p className="text-muted-foreground mt-1">{item.desc}</p>
            </div>

            {/* Gallery Thumbnails List */}
            {hasMultiplePhotos && (
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      idx === activePhotoIndex ? "border-primary scale-95 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={photo.thumbnail} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Clock className="w-5 h-5 text-chip-orange" />
                <div>
                  <p className="text-xs text-muted-foreground">Thời gian</p>
                  <p className="font-semibold text-foreground">{item.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Wallet className="w-5 h-5 text-chip-orange" />
                <div>
                  <p className="text-xs text-muted-foreground">Chi phí</p>
                  <p className="font-semibold text-foreground">{item.cost}</p>
                </div>
              </div>
              
              {/* Star Rating Section */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Star className="w-5 h-5 text-chip-yellow" />
                <div>
                  <p className="text-xs text-muted-foreground">Đánh giá chung</p>
                  <p className="font-semibold text-foreground">
                    {rating}/5 {reviewCount > 0 ? `(${reviewCount} đánh giá)` : "(Chưa có đánh giá)"}
                  </p>
                </div>
              </div>

              {cleanAddress && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <MapPin className="w-5 h-5 text-chip-orange" />
                  <div>
                    <p className="text-xs text-muted-foreground">Địa chỉ</p>
                    <p className="font-semibold text-foreground text-sm">{cleanAddress}</p>
                  </div>
                </div>
              )}

              {/* Dynamic Phone & Website */}
              {placeDetail?.phone && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <Phone className="w-5 h-5 text-chip-orange" />
                  <div>
                    <p className="text-xs text-muted-foreground">Điện thoại</p>
                    <p className="font-semibold text-foreground text-sm">{placeDetail.phone}</p>
                  </div>
                </div>
              )}
              {placeDetail?.website && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <Globe className="w-5 h-5 text-chip-orange" />
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <a
                      href={placeDetail.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-chip-orange hover:underline text-sm flex items-center gap-1"
                    >
                      Ghé thăm trang web <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  </div>
                </div>
              )}

              {/* Opening Hours list */}
              {placeDetail?.openingHours && placeDetail.openingHours.length > 0 && (
                <div className="p-4 rounded-xl bg-muted/50 space-y-2 col-span-2">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    <Clock className="w-4 h-4 text-chip-orange" />
                    <span>Giờ mở cửa</span>
                    {placeDetail.openState && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${
                        placeDetail.openState === "OPEN" 
                          ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                      }`}>
                        {placeDetail.openState === "OPEN" ? "Đang mở cửa" : "Đã đóng cửa"}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                    {placeDetail.openingHours.map((oh, idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-border/30">
                        <span className="font-medium text-foreground/80">{oh.day}</span>
                        <span>{oh.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {item.tips && (
              <div className="flex gap-3 p-4 rounded-xl bg-chip-yellow-light border border-chip-yellow/20">
                <Lightbulb className="w-5 h-5 text-chip-orange flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Mẹo du lịch</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.tips}</p>
                </div>
              </div>
            )}

            {/* Reviews — 2 tab: Google (serpReviews) + ChipTrip (place_reviews DB) */}
            <div className="border-t border-border pt-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-chip-yellow fill-chip-yellow" />
                Đánh giá từ du khách
              </h2>
              <Tabs defaultValue="google" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="google">Đánh giá từ Google</TabsTrigger>
                  <TabsTrigger value="chiptrip">Đánh giá ChipTrip</TabsTrigger>
                </TabsList>

                <TabsContent value="google" className="mt-4">
                  <div className="space-y-4">
                    {placeDetail?.reviews && placeDetail.reviews.length > 0 ? (
                      placeDetail.reviews.map((review, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {review.avatar ? (
                                <img src={review.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {review.author?.charAt(0) || "U"}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-foreground">{review.author || "Người dùng ẩn danh"}</p>
                                <p className="text-xs text-muted-foreground">{review.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-chip-yellow/10 px-2 py-0.5 rounded-lg">
                              <Star className="w-3.5 h-3.5 text-chip-yellow fill-chip-yellow" />
                              <span className="text-xs font-bold text-chip-yellow">{review.rating}</span>
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
          </motion.div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-6" 
          onClick={() => { setIsLightboxOpen(false); setZoomScale(1); }}
        >
          {/* Close button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setIsLightboxOpen(false); setZoomScale(1); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
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
              src={photos.length > 0 ? photos[activePhotoIndex].url : (item.image && item.image !== "/placeholder.svg" ? item.image : getPlaceImage(item.title, item.bookingType, 1200, 800))}
              alt={item.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ transform: `scale(${zoomScale})`, transition: "transform 0.3s ease" }}
              className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${zoomScale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"}`}
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
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Fullscreen Thumbnail row */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/60 text-sm">
              Ảnh {activePhotoIndex + 1} / {photos.length > 0 ? photos.length : 1}
            </p>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full py-2 no-scrollbar justify-center">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(idx); setZoomScale(1); }}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      idx === activePhotoIndex ? "border-primary scale-95" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={photo.thumbnail} alt="" className="w-full h-full object-cover" />
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
