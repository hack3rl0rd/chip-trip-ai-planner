// Generate dynamic place images using Unsplash
const typeKeywords: Record<string, string> = {
  hotel: "hotel resort room",
  restaurant: "vietnamese food restaurant",
  cafe: "coffee shop cafe",
  attraction: "vietnam travel landmark",
  transport: "travel transport bus",
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

  const keyword = typeKeywords[bookingType || "attraction"] || "vietnam";
  const seed = hashCode(title) % 1000;
  return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(keyword)}?lock=${seed}`;
}
