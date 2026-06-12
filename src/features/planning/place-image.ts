// Generate dynamic place images using Unsplash.
// Trước đây fallback dùng loremflickr.com — bị treo/timeout ngẫu nhiên ở bước tải ảnh CDN
// (/cache/resized/*.jpg) khiến một số thumbnail vỡ ảnh. Thay bằng pool ảnh Unsplash trực tiếp
// (đã verify load OK), chọn theo hash để vẫn đa dạng mà ổn định.
const IMAGE_POOLS: Record<string, string[]> = {
  hotel: [
    "photo-1566073771259-6a8506099945", "photo-1551882547-ff40c63fe5fa",
    "photo-1571896349842-33c89424de2d", "photo-1582719478250-c89cae4dc85b",
    "photo-1611892440504-42a792e24d32",
  ],
  restaurant: [
    "photo-1414235077428-338989a2e8c0", "photo-1517248135467-4c7edcad34c4",
    "photo-1559339352-11d035aa65de", "photo-1504674900247-0877df9cc836",
    "photo-1555396273-367ea4eb4db5", "photo-1559329007-40df8a9345d8",
    "photo-1467003909585-2f8a72700288",
  ],
  cafe: [
    "photo-1501339847302-ac426a4a7cbb", "photo-1554118811-1e0d58224f24",
    "photo-1495474472287-4d71bcdd2085", "photo-1559496417-e7f25cb247f3",
    "photo-1453614512568-c4024d13c247",
  ],
  attraction: [
    "photo-1528127269322-539801943592", "photo-1507525428034-b723cf961d3e",
    "photo-1505228395891-9a51e7e86bf6", "photo-1583417319070-4a69db38a482",
    "photo-1528181304800-259b08848526", "photo-1506905925346-21bda4d32df4",
    "photo-1559592413-7cec4d0cae2b", "photo-1540202404-a2f29016b523",
  ],
};

// Simple hash for consistent image per title
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getPlaceImage(title: string, bookingType?: string, width = 400, height = 300): string {
  const lowerTitle = title.toLowerCase();
  
  if (bookingType === "transport" || lowerTitle.includes("di chuyển") || lowerTitle.includes("bay") || lowerTitle.includes("xe") || lowerTitle.includes("tàu")) {
    if (lowerTitle.includes("bay") || lowerTitle.includes("sân bay") || lowerTitle.includes("máy bay") || lowerTitle.includes("flight")) {
      return `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=${width}&h=${height}`;
    }
    if (lowerTitle.includes("tàu") || lowerTitle.includes("train")) {
      return `https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=${width}&h=${height}`;
    }
    if (lowerTitle.includes("xe khách") || lowerTitle.includes("bus")) {
      return `https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=${width}&h=${height}`;
    }
    // Default transport (Car/Taxi/Road)
    return `https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=${width}&h=${height}`;
  }

  const pool = IMAGE_POOLS[bookingType || "attraction"] ?? IMAGE_POOLS.attraction;
  const id = pool[hashCode(title) % pool.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${width}&h=${height}`;
}
