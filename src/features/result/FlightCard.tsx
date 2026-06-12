import { useState, useEffect } from "react";
import { Plane, PlaneTakeoff, PlaneLanding, ExternalLink, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTripFlights } from "@/hooks/useApi";
import type { FlightLeg } from "@/integrations/api/modules/flights";

// Mã sân bay VN → tên thành phố (để hiển thị thân thiện, không chỉ IATA).
const AIRPORT_CITY: Record<string, string> = {
  HAN: "Hà Nội", SGN: "TP.HCM", DAD: "Đà Nẵng", DLI: "Đà Lạt", CXR: "Nha Trang",
  PQC: "Phú Quốc", HUI: "Huế", HPH: "Hải Phòng", UIH: "Quy Nhơn", BMV: "Buôn Ma Thuột",
  PXU: "Pleiku", VII: "Vinh", THD: "Thanh Hóa", VDH: "Đồng Hới", VCL: "Chu Lai",
  TBB: "Tuy Hòa", VCS: "Côn Đảo", CAH: "Cà Mau", VKG: "Rạch Giá", DIN: "Điện Biên",
  VCA: "Cần Thơ", VDO: "Vân Đồn",
};

function airportLabel(iata: string | null | undefined): string {
  if (!iata) return "";
  const city = AIRPORT_CITY[iata];
  return city ? `${city} (${iata})` : iata;
}

function formatVnd(v: number | null | undefined): string {
  if (!v) return "—";
  return v.toLocaleString("vi-VN") + "₫";
}

function formatDuration(min: number | null | undefined): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h > 0 ? `${h}h` : ""}${m > 0 ? ` ${m}m` : ""}`.trim();
}

const LegRow = ({ leg, icon, label }: { leg: FlightLeg; icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
    <div className="text-chip-orange">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        {leg.airline && <span className="font-medium text-foreground">· {leg.airline}</span>}
      </div>
      <div className="flex items-center gap-2 font-semibold text-foreground text-sm mt-0.5">
        <span>{leg.departureAirport}</span>
        <span className="text-xs text-muted-foreground">{leg.departureTime?.slice(11, 16)}</span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{leg.arrivalAirport}</span>
        <span className="text-xs text-muted-foreground">{leg.arrivalTime?.slice(11, 16)}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {formatDuration(leg.durationMinutes)}
        {leg.stops != null && ` · ${leg.stops === 0 ? "Bay thẳng" : `${leg.stops} điểm dừng`}`}
      </div>
    </div>
  </div>
);

const FLIGHT_REQUESTED_PREFIX = "chip-flights-requested-";

const FlightCard = ({ tripId }: { tripId: number }) => {
  const [fetch, setFetch] = useState(false);
  const { data, isLoading, error } = useTripFlights(tripId, fetch);

  // Nhớ trạng thái "đã gợi ý vé" theo trip — reload sẽ tự tải lại (BE cache 6h) thay vì mất.
  useEffect(() => {
    let requested = false;
    try { requested = localStorage.getItem(FLIGHT_REQUESTED_PREFIX + tripId) === "1"; } catch { /* ignore */ }
    setFetch(requested);
  }, [tripId]);

  const handleFetch = () => {
    setFetch(true);
    try { localStorage.setItem(FLIGHT_REQUESTED_PREFIX + tripId, "1"); } catch { /* ignore */ }
  };

  return (
    <div id="flight-card" className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3 scroll-mt-24">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
        <Plane className="w-4 h-4 text-chip-orange" /> Vé máy bay
      </h3>

      {!fetch && (
        <>
          <p className="text-xs text-muted-foreground">
            Tìm vé máy bay khứ hồi cho chuyến đi qua Google Flights.
          </p>
          <Button variant="hero" size="sm" className="w-full" onClick={handleFetch}>
            <Plane className="w-4 h-4" /> Gợi ý vé máy bay
          </Button>
        </>
      )}

      {fetch && isLoading && (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-chip-orange" />
          <p className="text-xs text-muted-foreground">Đang tìm chuyến bay...</p>
        </div>
      )}

      {fetch && error && (
        <p className="text-sm text-muted-foreground py-2">
          {(error as any)?.response?.data?.message || "Không tìm được chuyến bay phù hợp."}
        </p>
      )}

      {fetch && !isLoading && data && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            {airportLabel(data.departureId)}
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            {airportLabel(data.arrivalId)}
          </p>
          {!data.outbound ? (
            <p className="text-sm text-muted-foreground">
              Không tìm thấy chuyến bay phù hợp cho tuyến này.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <LegRow leg={data.outbound} icon={<PlaneTakeoff className="w-5 h-5" />} label="Chiều đi" />
                {data.returnLeg && (
                  <LegRow leg={data.returnLeg} icon={<PlaneLanding className="w-5 h-5" />} label="Chiều về" />
                )}
              </div>

              {data.totalPriceVnd != null && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">
                    Tổng {data.adults ? `· ${data.adults} khách` : ""}
                  </span>
                  <span className="text-lg font-bold text-gradient">{formatVnd(data.totalPriceVnd)}</span>
                </div>
              )}

              {data.bookingOptions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Đặt vé tại</p>
                  {data.bookingOptions.slice(0, 4).map((opt, idx) => (
                    <a
                      key={idx}
                      href={opt.bookingLink || data.googleFlightsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 hover:bg-chip-orange/10 border border-border text-sm transition-colors"
                    >
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        {opt.source || "Đặt vé"} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </span>
                      {opt.priceVnd != null && <span className="text-chip-orange font-semibold">{formatVnd(opt.priceVnd)}</span>}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          <a
            href={data.googleFlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-chip-orange hover:underline pt-1"
          >
            Xem tất cả trên Google Flights <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export default FlightCard;
