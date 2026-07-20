import { describe, expect, it } from "vitest";
import type { PlacePhoto } from "@/integrations/api/modules/places";
import { filterUsablePhotos } from "./photo-gallery";

const photos: PlacePhoto[] = [
  { url: "https://img.test/broken.jpg", thumbnail: "https://img.test/broken-thumb.jpg" },
  { url: "https://img.test/good.jpg", thumbnail: "https://img.test/good-thumb.jpg" },
];

describe("filterUsablePhotos", () => {
  it("removes a failed photo from every carousel surface", () => {
    const result = filterUsablePhotos(photos, new Set(["https://img.test/broken.jpg"]));

    expect(result).toEqual([photos[1]]);
  });

  it("treats a failed thumbnail as a failed carousel entry", () => {
    const result = filterUsablePhotos(photos, new Set(["https://img.test/good-thumb.jpg"]));

    expect(result).toEqual([photos[0]]);
  });

  it("returns an empty list when every provider photo failed so the caller renders one fallback", () => {
    const result = filterUsablePhotos(
      photos,
      new Set(["https://img.test/broken.jpg", "https://img.test/good.jpg"]),
    );

    expect(result).toEqual([]);
  });
});
