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
  const keyword = typeKeywords[bookingType || "attraction"] || "vietnam travel";
  const seed = hashCode(title) % 1000;
  return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keyword)}&sig=${seed}`;
}
