import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination, startDate, endDate, budget, styles, travelers, departureTime, returnTime } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const budgetLabels = ["dưới 500K", "500K-1 triệu", "1-2 triệu", "2-3 triệu", "3-5 triệu", "5-8 triệu", "8-12 triệu", "trên 12 triệu"];
    const styleLabels: Record<string, string> = {
      healing: "nghỉ dưỡng, thư giãn, spa",
      food: "ẩm thực, food tour, ăn uống local",
      photo: "check-in sống ảo, điểm chụp đẹp",
      adventure: "mạo hiểm, khám phá, trekking",
      resort: "resort, chill, pool party",
      family: "gia đình, vui chơi trẻ em, an toàn",
      couple: "couple, hẹn hò, lãng mạn",
      nightlife: "nightlife, bar, phố đêm",
      culture: "văn hóa, lịch sử, di tích, bảo tàng",
      local: "trải nghiệm local, sống như người địa phương",
      luxury: "sang chảnh, 5 sao, fine dining",
      group: "bạn bè, nhóm, team building, sôi động",
    };

    const timeLabels: Record<string, string> = {
      morning: "sáng sớm (6h-10h)",
      noon: "buổi trưa (10h-14h)",
      afternoon: "buổi chiều (14h-18h)",
      evening: "buổi tối (18h-22h)",
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const numDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const budgetText = budgetLabels[budget] || "3-5 triệu";
    const stylesText = styles.map((s: string) => styleLabels[s] || s).join(", ") || "đa dạng";
    const depTimeText = timeLabels[departureTime] || "sáng sớm";
    const retTimeText = timeLabels[returnTime] || "buổi chiều";

    // Calculate per-day budget target
    const budgetRanges: Record<string, { min: number; max: number }> = {
      "dưới 500K": { min: 300, max: 500 },
      "500K-1 triệu": { min: 500, max: 1000 },
      "1-2 triệu": { min: 1000, max: 2000 },
      "2-3 triệu": { min: 2000, max: 3000 },
      "3-5 triệu": { min: 3000, max: 5000 },
      "5-8 triệu": { min: 5000, max: 8000 },
      "8-12 triệu": { min: 8000, max: 12000 },
      "trên 12 triệu": { min: 12000, max: 20000 },
    };
    const range = budgetRanges[budgetText] || { min: 3000, max: 5000 };
    const totalBudgetMin = range.min; // in K VND per person
    const totalBudgetMax = range.max;
    const perDayMin = Math.round(totalBudgetMin / numDays);
    const perDayMax = Math.round(totalBudgetMax / numDays);

    const systemPrompt = `Bạn là ChipTrip AI - trợ lý du lịch Việt Nam chuyên nghiệp. 
Tạo lịch trình du lịch chi tiết, thực tế với các địa điểm CÓ THẬT tại Việt Nam.
Mỗi hoạt động phải có: tên quán/địa điểm thật, địa chỉ thật, giá ước tính thực tế bằng VNĐ.
Trả về JSON thuần túy, KHÔNG markdown, KHÔNG backtick.`;

    const userPrompt = `Tạo lịch trình du lịch ${destination} cho ${travelers} người, ${numDays} ngày (từ ${startDate} đến ${endDate}).

NGÂN SÁCH CỰC KỲ QUAN TRỌNG - BẮT BUỘC TUÂN THỦ:
- Tổng ngân sách cho TOÀN BỘ chuyến đi: ${budgetText} VNĐ/người
- Mỗi ngày chi tiêu khoảng ${perDayMin}K - ${perDayMax}K VNĐ/người
- TỔNG chi phí tất cả hoạt động trong ${numDays} ngày PHẢI nằm trong khoảng ${totalBudgetMin}K - ${totalBudgetMax}K VNĐ
- totalCost trong JSON phải phản ánh đúng tổng chi phí thực tế
- Chọn khách sạn, nhà hàng, phương tiện PHÙ HỢP với mức ngân sách này
- Nếu ngân sách thấp: ưu tiên homestay, quán ăn bình dân, xe bus, grab
- Nếu ngân sách cao: có thể chọn resort, nhà hàng sang, taxi, máy bay

Phong cách: ${stylesText}.
Thời gian khởi hành: ${depTimeText}.
Thời gian về: ${retTimeText}.

QUAN TRỌNG VỀ THỜI GIAN:
- Ngày đầu tiên: bắt đầu từ ${depTimeText}, KHÔNG lên lịch hoạt động trước khung giờ khởi hành
- Ngày cuối cùng: kết thúc trước ${retTimeText}, cần có hoạt động di chuyển về trong khung giờ này

Trả về JSON đúng format sau (KHÔNG có markdown, KHÔNG có backtick):
{
  "title": "Tên chuyến đi hấp dẫn",
  "destination": "${destination}",
  "duration": "${numDays} ngày ${numDays - 1} đêm",
  "totalCost": "X.XM",
  "rating": 4.8,
  "tags": ["tag1", "tag2"],
  "dateRange": "${startDate} - ${endDate}",
  "days": [
    {
      "day": "Ngày 1",
      "date": "${startDate}",
      "items": [
        {
          "id": "unique_id",
          "time": "08:00",
          "title": "Tên địa điểm/quán ăn THẬT",
          "desc": "Mô tả ngắn hấp dẫn",
          "cost": "200K",
          "address": "Địa chỉ thật",
          "rating": 4.5,
          "tips": "Mẹo hữu ích cho du khách",
          "bookingType": "hotel|restaurant|attraction|cafe|transport"
        }
      ]
    }
  ]
}

Yêu cầu:
- Mỗi ngày có 4-6 hoạt động (sáng, trưa, chiều, tối)
- Bao gồm: nơi ở, ăn uống, tham quan, cafe VÀ PHƯƠNG TIỆN DI CHUYỂN
- QUAN TRỌNG: Ngày đầu tiên PHẢI có hoạt động di chuyển đến ${destination} (bookingType: "transport")
- Ngày cuối PHẢI có hoạt động di chuyển về (bookingType: "transport")
- Giữa các điểm tham quan xa nhau cần thêm phương tiện di chuyển
- Địa điểm và quán ăn phải CÓ THẬT, nổi tiếng tại ${destination}
- Chi phí dùng format: "200K", "1.2M", "Miễn phí"
- KIỂM TRA LẠI: tổng cost tất cả items phải = khoảng ${totalBudgetMin}K-${totalBudgetMax}K
- bookingType phải là một trong: hotel, restaurant, attraction, cafe, transport
- Tips phải thực sự hữu ích cho du khách`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết lượt AI, vui lòng nạp thêm credit." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "AI không trả về kết quả" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tripData;
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      tripData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "AI trả về format không hợp lệ", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    tripData.id = crypto.randomUUID();
    tripData.image = "";
    if (!tripData.destination) tripData.destination = destination;

    return new Response(JSON.stringify({ trip: tripData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
