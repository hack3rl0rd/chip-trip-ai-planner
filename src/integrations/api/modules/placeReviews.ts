import apiClient from "../client";
import type { ApiResponse, PageMeta } from "../types";

export interface ChipTripReview {
  id: number;
  userId: number;
  userName: string | null;
  userAvatarUrl: string | null;
  rating: number;
  content: string | null;
  createdAt: string;
}

export interface ChipTripReviewSummary {
  averageRating: number | null;
  totalReviews: number;
}

export interface ChipTripReviewsPage {
  items: ChipTripReview[];
  meta: PageMeta;
}

export const placeReviewsApi = {
  getReviews: async (placeCacheId: number, page = 0, size = 10): Promise<ChipTripReviewsPage> => {
    const { data } = await apiClient.get<ApiResponse<ChipTripReview[]>>(`/places/${placeCacheId}/reviews`, {
      params: { page, size },
    });
    return { items: data.data, meta: data.meta as PageMeta };
  },

  getSummary: async (placeCacheId: number) => {
    const { data } = await apiClient.get<ApiResponse<ChipTripReviewSummary>>(`/places/${placeCacheId}/reviews/summary`);
    return data.data;
  },

  /** BE upsert: đã có review của user cho place này thì UPDATE. */
  upsertReview: async (placeCacheId: number, payload: { rating: number; content?: string | null }) => {
    const { data } = await apiClient.post<ApiResponse<ChipTripReview>>(`/places/${placeCacheId}/reviews`, payload);
    return data.data;
  },

  deleteReview: async (placeCacheId: number, reviewId: number) => {
    await apiClient.delete(`/places/${placeCacheId}/reviews/${reviewId}`);
  },
};
