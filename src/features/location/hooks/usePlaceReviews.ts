import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { placeReviewsApi } from "@/integrations/api";

export const placeReviewKeys = {
  list: (placeCacheId: number, page: number) => ["placeReviews", placeCacheId, page] as const,
  all: (placeCacheId: number) => ["placeReviews", placeCacheId] as const,
  summary: (placeCacheId: number) => ["placeReviewSummary", placeCacheId] as const,
};

export function usePlaceReviews(placeCacheId: number | null | undefined, page = 0) {
  return useQuery({
    queryKey: placeReviewKeys.list(placeCacheId ?? -1, page),
    queryFn: () => placeReviewsApi.getReviews(placeCacheId!, page),
    enabled: placeCacheId != null,
  });
}

export function usePlaceReviewSummary(placeCacheId: number | null | undefined) {
  return useQuery({
    queryKey: placeReviewKeys.summary(placeCacheId ?? -1),
    queryFn: () => placeReviewsApi.getSummary(placeCacheId!),
    enabled: placeCacheId != null,
  });
}

export function useSubmitPlaceReview(placeCacheId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rating: number; content?: string | null }) =>
      placeReviewsApi.upsertReview(placeCacheId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: placeReviewKeys.all(placeCacheId) });
      qc.invalidateQueries({ queryKey: placeReviewKeys.summary(placeCacheId) });
    },
  });
}

export function useDeletePlaceReview(placeCacheId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => placeReviewsApi.deleteReview(placeCacheId, reviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: placeReviewKeys.all(placeCacheId) });
      qc.invalidateQueries({ queryKey: placeReviewKeys.summary(placeCacheId) });
    },
  });
}
