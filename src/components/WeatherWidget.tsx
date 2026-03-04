import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  rain: number;
  label: string;
  emoji: string;
  shouldGoIndoor: boolean;
}

interface WeatherWidgetProps {
  destination: string;
  dates: string[]; // array of date strings
}

const WeatherWidget = ({ destination, dates }: WeatherWidgetProps) => {
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!destination) return;
    setLoading(true);
    supabase.functions
      .invoke("get-weather", { body: { destination } })
      .then(({ data, error: err }) => {
        if (err || data?.error) {
          setError("Không tải được thời tiết");
        } else if (data?.forecast) {
          // Filter to only trip dates
          const tripDates = new Set(dates);
          const filtered = data.forecast.filter((f: WeatherForecast) => tripDates.has(f.date));
          setForecast(filtered.length > 0 ? filtered : data.forecast.slice(0, dates.length || 3));
        }
        setLoading(false);
      });
  }, [destination]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-card p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-3" />
        <div className="h-8 bg-muted rounded w-full" />
      </div>
    );
  }

  if (error || forecast.length === 0) return null;

  const hasRainyDay = forecast.some(f => f.shouldGoIndoor);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
        <Cloud className="w-4 h-4 text-chip-orange" /> Thời tiết {destination}
      </h3>

      {hasRainyDay && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-chip-orange/10 border border-chip-orange/20">
          <AlertTriangle className="w-4 h-4 text-chip-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            <span className="font-semibold">Cảnh báo:</span> Có ngày mưa! Chip Trip gợi ý bạn chuẩn bị áo mưa và xem xét hoạt động trong nhà.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {forecast.slice(0, 6).map(f => (
          <div
            key={f.date}
            className={`text-center p-2.5 rounded-xl border transition-all ${
              f.shouldGoIndoor
                ? "border-chip-orange/30 bg-chip-orange/5"
                : "border-border bg-muted/30"
            }`}
          >
            <p className="text-[10px] text-muted-foreground">
              {new Date(f.date).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })}
            </p>
            <span className="text-lg">{f.emoji}</span>
            <p className="text-xs font-medium text-foreground">{f.tempMax}°</p>
            <p className="text-[10px] text-muted-foreground">{f.tempMin}°</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherWidget;
