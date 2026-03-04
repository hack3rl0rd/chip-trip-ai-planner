import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common Vietnamese destination name mappings for geocoding
const geoFallbacks: Record<string, string> = {
  "đà lạt": "Da Lat", "đà nẵng": "Da Nang", "hà nội": "Hanoi", "hồ chí minh": "Ho Chi Minh City",
  "phú quốc": "Phu Quoc", "nha trang": "Nha Trang", "hội an": "Hoi An", "huế": "Hue",
  "sapa": "Sapa", "sa pa": "Sapa", "hạ long": "Ha Long", "ninh bình": "Ninh Binh",
  "quy nhơn": "Quy Nhon", "vũng tàu": "Vung Tau", "cần thơ": "Can Tho", "đà lạt": "Dalat",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination, date } = await req.json();

    // Try original name first, then fallback to English name
    const searchNames = [destination, geoFallbacks[destination.toLowerCase()]].filter(Boolean);
    let geoResult = null;

    for (const name of searchNames) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=vi`);
      const geoData = await geoRes.json();
      if (geoData.results?.length) {
        geoResult = geoData.results[0];
        break;
      }
    }

    if (!geoResult) {
      return new Response(JSON.stringify({ error: "Không tìm thấy địa điểm" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { latitude, longitude, name } = geoResult;

    // Get weather forecast
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Asia/Ho_Chi_Minh&forecast_days=16`
    );
    const weatherData = await weatherRes.json();

    if (!weatherData.daily) {
      return new Response(JSON.stringify({ error: "Không có dữ liệu thời tiết" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weatherCodes: Record<number, { label: string; emoji: string; indoor: boolean }> = {
      0: { label: "Trời quang", emoji: "☀️", indoor: false },
      1: { label: "Hầu như quang", emoji: "🌤️", indoor: false },
      2: { label: "Có mây", emoji: "⛅", indoor: false },
      3: { label: "Nhiều mây", emoji: "☁️", indoor: false },
      45: { label: "Sương mù", emoji: "🌫️", indoor: false },
      48: { label: "Sương mù đóng băng", emoji: "🌫️", indoor: true },
      51: { label: "Mưa phùn nhẹ", emoji: "🌦️", indoor: false },
      53: { label: "Mưa phùn", emoji: "🌦️", indoor: false },
      55: { label: "Mưa phùn dày", emoji: "🌧️", indoor: true },
      61: { label: "Mưa nhẹ", emoji: "🌧️", indoor: false },
      63: { label: "Mưa vừa", emoji: "🌧️", indoor: true },
      65: { label: "Mưa to", emoji: "⛈️", indoor: true },
      80: { label: "Mưa rào nhẹ", emoji: "🌦️", indoor: false },
      81: { label: "Mưa rào vừa", emoji: "🌧️", indoor: true },
      82: { label: "Mưa rào to", emoji: "⛈️", indoor: true },
      95: { label: "Giông", emoji: "⛈️", indoor: true },
      96: { label: "Giông có mưa đá", emoji: "🌩️", indoor: true },
      99: { label: "Giông mạnh", emoji: "🌩️", indoor: true },
    };

    const daily = weatherData.daily;
    const forecast = daily.time.map((date: string, i: number) => {
      const code = daily.weathercode[i];
      const info = weatherCodes[code] || { label: "Không rõ", emoji: "❓", indoor: false };
      return {
        date,
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i],
        rain: daily.precipitation_sum[i],
        weatherCode: code,
        label: info.label,
        emoji: info.emoji,
        shouldGoIndoor: info.indoor,
      };
    });

    return new Response(JSON.stringify({ location: name, forecast }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weather error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
