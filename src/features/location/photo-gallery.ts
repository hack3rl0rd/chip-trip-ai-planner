import type { PlacePhoto } from "@/integrations/api/modules/places";

/** Mot URL loi lam ca slide bi loai o hero, thumbnails va lightbox. */
export function filterUsablePhotos(
  photos: PlacePhoto[] | null | undefined,
  failedUrls: ReadonlySet<string>,
): PlacePhoto[] {
  if (!photos?.length) return [];
  return photos.filter((photo) =>
    !failedUrls.has(photo.url) && !failedUrls.has(photo.thumbnail),
  );
}
