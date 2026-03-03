import tripDanang from "@/assets/trip-danang.jpg";
import tripHoian from "@/assets/trip-hoian.jpg";
import tripSapa from "@/assets/trip-sapa.jpg";
import tripPhuquoc from "@/assets/trip-phuquoc.jpg";

export interface TripItem {
  id: string;
  time: string;
  title: string;
  desc: string;
  cost: string;
  image: string;
  address?: string;
  rating?: number;
  tips?: string;
}

export interface TripDay {
  day: string;
  date: string;
  items: TripItem[];
}

export interface TripPlan {
  id: string;
  destination: string;
  title: string;
  days: TripDay[];
  totalCost: string;
  rating: number;
  duration: string;
  image: string;
  tags: string[];
  dateRange: string;
}

const destinations: Record<string, TripDay[]> = {
  "đà nẵng": [
    {
      day: "Ngày 1", date: "",
      items: [
        { id: "dn1", time: "08:00", title: "Checkin khách sạn Mường Thanh", desc: "Nghỉ ngơi, chuẩn bị", cost: "800K", image: tripDanang, address: "270 Võ Nguyên Giáp, Đà Nẵng", rating: 4.5, tips: "Nên đặt phòng view biển để có trải nghiệm tốt nhất" },
        { id: "dn2", time: "10:30", title: "Tham quan Bà Nà Hills", desc: "Cầu Vàng, Fantasy Park", cost: "900K", image: tripDanang, address: "Bà Nà Hills, Hòa Ninh, Hòa Vang", rating: 4.8, tips: "Nên đi sớm để tránh đông, mang áo ấm vì trên núi lạnh" },
        { id: "dn3", time: "12:30", title: "Ăn trưa hải sản Mỹ Khê", desc: "Quán bà Tư - Đặc sản ghẹ hấp", cost: "350K", image: tripHoian, address: "Bãi biển Mỹ Khê, Đà Nẵng", rating: 4.3, tips: "Ghẹ hấp bia là món signature, nên gọi thêm ốc hương" },
        { id: "dn4", time: "15:00", title: "Uống cafe Son Trà", desc: "View biển cực đẹp", cost: "80K", image: tripSapa, address: "Bán đảo Sơn Trà, Đà Nẵng", rating: 4.6, tips: "Đi vào buổi chiều để ngắm hoàng hôn" },
      ],
    },
    {
      day: "Ngày 2", date: "",
      items: [
        { id: "dn5", time: "07:00", title: "Bình minh tại Bãi Mỹ Khê", desc: "Chạy bộ + check-in sống ảo", cost: "Miễn phí", image: tripDanang, address: "Bãi biển Mỹ Khê, Đà Nẵng", rating: 4.9, tips: "Bình minh khoảng 5h30-6h, nên đi sớm" },
        { id: "dn6", time: "09:00", title: "Đi phố cổ Hội An", desc: "Dạo phố, mua quà lưu niệm", cost: "200K", image: tripHoian, address: "Phố cổ Hội An, Quảng Nam", rating: 4.8, tips: "Mua vé tham quan 120K, có thể vào 5 điểm" },
        { id: "dn7", time: "12:00", title: "Ăn Cao lầu & Mì Quảng", desc: "Quán bà Liên - Phố cổ", cost: "120K", image: tripHoian, address: "22 Nguyễn Huệ, Hội An", rating: 4.7, tips: "Cao lầu chỉ có ở Hội An, nhất định phải thử" },
        { id: "dn8", time: "19:00", title: "Thả đèn hoa đăng", desc: "Trải nghiệm văn hóa Hội An", cost: "50K", image: tripHoian, address: "Sông Thu Bồn, Hội An", rating: 4.9, tips: "Mua đèn từ người dân địa phương, hỗ trợ kinh tế cộng đồng" },
      ],
    },
    {
      day: "Ngày 3", date: "",
      items: [
        { id: "dn9", time: "08:00", title: "Chùa Linh Ứng Sơn Trà", desc: "Tượng Phật Quan Âm cao nhất VN", cost: "Miễn phí", image: tripSapa, address: "Bán đảo Sơn Trà, Đà Nẵng", rating: 4.7, tips: "Mặc trang phục kín đáo khi vào chùa" },
        { id: "dn10", time: "11:00", title: "Bảo tàng Chăm", desc: "Tìm hiểu văn hóa Chăm Pa", cost: "60K", image: tripDanang, address: "02 2 Tháng 9, Đà Nẵng", rating: 4.4, tips: "Có hướng dẫn viên miễn phí vào 9h và 14h" },
        { id: "dn11", time: "14:00", title: "Mua sắm tại chợ Hàn", desc: "Đặc sản, quà lưu niệm", cost: "500K", image: tripHoian, address: "119 Trần Phú, Đà Nẵng", rating: 4.2, tips: "Nhớ trả giá, thường giảm được 30-50%" },
      ],
    },
  ],
  "đà lạt": [
    {
      day: "Ngày 1", date: "",
      items: [
        { id: "dl1", time: "08:00", title: "Checkin homestay Đà Lạt", desc: "Nghỉ ngơi, hít khí trời trong lành", cost: "600K", image: tripSapa, address: "Phường 4, Đà Lạt", rating: 4.5, tips: "Nên chọn homestay có view đồi thông" },
        { id: "dl2", time: "10:00", title: "Hồ Tuyền Lâm", desc: "Chèo thuyền SUP, ngắm cảnh", cost: "200K", image: tripPhuquoc, address: "Hồ Tuyền Lâm, Đà Lạt", rating: 4.7, tips: "Đi sáng sớm để nước yên và ít người" },
        { id: "dl3", time: "12:30", title: "Ăn trưa bánh mì xíu mại", desc: "Quán Lê Hồng Phong - Đặc sản", cost: "50K", image: tripHoian, address: "102 Lê Hồng Phong, Đà Lạt", rating: 4.6, tips: "Quán rất đông, nên đi trước 12h" },
        { id: "dl4", time: "15:00", title: "Làng hoa Vạn Thành", desc: "Chụp ảnh vườn hoa đẹp", cost: "30K", image: tripSapa, address: "Làng hoa Vạn Thành, Đà Lạt", rating: 4.3, tips: "Mùa hoa đẹp nhất: tháng 10-12" },
      ],
    },
    {
      day: "Ngày 2", date: "",
      items: [
        { id: "dl5", time: "06:00", title: "Săn mây đồi Đa Phú", desc: "Ngắm bình minh trên mây", cost: "Miễn phí", image: tripSapa, address: "Đồi Đa Phú, Đà Lạt", rating: 4.9, tips: "Cần đi lúc 5h sáng, mang áo ấm" },
        { id: "dl6", time: "09:00", title: "Thung lũng Tình Yêu", desc: "Dạo bộ, check-in sống ảo", cost: "100K", image: tripPhuquoc, address: "Thung lũng Tình Yêu, Đà Lạt", rating: 4.4, tips: "Nên đi bộ vòng quanh hồ, view rất đẹp" },
        { id: "dl7", time: "12:00", title: "Lẩu gà lá é", desc: "Đặc sản Đà Lạt cho nhóm", cost: "250K", image: tripHoian, address: "Nguyễn Văn Trỗi, Đà Lạt", rating: 4.7, tips: "Gà ta nấu lá é, ăn kèm rau rừng" },
        { id: "dl8", time: "20:00", title: "Chợ đêm Đà Lạt", desc: "Ăn vặt & mua sắm", cost: "150K", image: tripDanang, address: "Chợ đêm Đà Lạt", rating: 4.5, tips: "Thử sữa đậu nành nóng, bánh tráng nướng" },
      ],
    },
    {
      day: "Ngày 3", date: "",
      items: [
        { id: "dl9", time: "08:00", title: "Thiền viện Trúc Lâm", desc: "Tĩnh tâm, ngắm cảnh", cost: "Miễn phí", image: tripSapa, address: "Thiền viện Trúc Lâm, Đà Lạt", rating: 4.8, tips: "Có cáp treo đi xuống, 70K/lượt" },
        { id: "dl10", time: "11:00", title: "Tiệm cà phê Túi Mơ To", desc: "Cà phê view toàn thành phố", cost: "80K", image: tripDanang, address: "Phường 10, Đà Lạt", rating: 4.6, tips: "Nên ngồi tầng 2 để có view tốt nhất" },
        { id: "dl11", time: "14:00", title: "Ga xe lửa Đà Lạt", desc: "Check-in ga cổ đẹp nhất VN", cost: "Miễn phí", image: tripHoian, address: "01 Quang Trung, Đà Lạt", rating: 4.5, tips: "Có tàu chạy tuyến Đà Lạt - Trại Mát, 150K/vé" },
      ],
    },
  ],
};

// Default fallback
const defaultItinerary = destinations["đà nẵng"];

function formatDate(dateStr: string, dayOffset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + dayOffset);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const budgetLabels = ["< 1M", "1-3M", "3-5M", "5-10M", "10M+"];
const budgetEstimates = ["~800K", "~2M", "~4M", "~7.5M", "~12M"];

export function generateTrip(destination: string, startDate: string, endDate: string, budget: number, styles: string[]): TripPlan {
  const key = destination.toLowerCase().trim();
  const matched = Object.keys(destinations).find(k => key.includes(k));
  
  // Use matched itinerary or generate a generic one based on destination name
  const baseItinerary = matched ? destinations[matched] : destinations["đà nẵng"];
  const displayDest = destination || "Đà Nẵng";
  
  const days = baseItinerary.map((day, i) => ({
    ...day,
    date: startDate ? formatDate(startDate, i) : day.date,
    // If no match, update item titles/desc to mention the actual destination
    items: !matched ? day.items.map(item => ({
      ...item,
      id: `gen_${i}_${item.id}`,
    })) : day.items,
  }));

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const numDays = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 3;
  const numNights = numDays - 1;

  const dateRange = start && end
    ? `${formatDate(startDate, 0)} - ${formatDate(endDate, 0)}`
    : "15/03 - 17/03/2026";

  const title = `${displayDest} ${numDays}N${numNights}Đ`;

  const tagMap: Record<string, string> = { healing: "Chữa lành", food: "Ẩm thực", photo: "Sống ảo", adventure: "Mạo hiểm" };
  const tags = styles.map(s => tagMap[s] || s);

  const totalCost = budgetEstimates[budget] || "~3M";

  return {
    id: Date.now().toString(),
    destination: displayDest,
    title,
    days: days.slice(0, numDays),
    totalCost,
    rating: 4.8,
    duration: `${numDays} ngày ${numNights} đêm`,
    image: days[0]?.items[0]?.image || tripDanang,
    tags: tags.length ? tags : ["Du lịch"],
    dateRange,
  };
}

export function getSavedTrips(): TripPlan[] {
  try {
    return JSON.parse(localStorage.getItem("chiptrip_saved") || "[]");
  } catch { return []; }
}

export function saveTrip(trip: TripPlan) {
  const existing = getSavedTrips();
  if (!existing.find(t => t.id === trip.id)) {
    existing.push(trip);
    localStorage.setItem("chiptrip_saved", JSON.stringify(existing));
  }
}

export function deleteTrip(id: string) {
  const existing = getSavedTrips().filter(t => t.id !== id);
  localStorage.setItem("chiptrip_saved", JSON.stringify(existing));
}
