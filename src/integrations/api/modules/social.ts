import apiClient from "../client";
import type { ApiResponse, PageMeta, TripDetail } from "../types";

export interface TripPublicSummary {
  id: number;
  title: string;
  destination: string;
  dateStart: string | null;
  dateEnd: string | null;
  peopleCount: number | null;
  thumbnailUrl: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  likesCount: number;
  commentsCount: number;
  styles: string[];
  publishedAt: string | null;
  isPublic: boolean;
}

export interface TripComment {
  id: number;
  tripId: number;
  parentId: number | null;
  userId: number;
  userName: string | null;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  children: TripComment[];
}

export interface LikeStatus {
  liked: boolean;
  likesCount: number;
}

export interface PublicFeedPage {
  items: TripPublicSummary[];
  meta: PageMeta;
}

export type PublicFeedSort = "latest" | "featured";

export interface CommentsPage {
  items: TripComment[];
  meta: PageMeta;
}

export const socialApi = {
  getPublicFeed: async (
    page = 0,
    size = 12,
    destination?: string,
    sort: PublicFeedSort = "latest",
  ): Promise<PublicFeedPage> => {
    const { data } = await apiClient.get<ApiResponse<TripPublicSummary[]>>("/trips/public/feed", {
      params: { page, size, destination: destination || undefined, sort },
    });
    return { items: data.data, meta: data.meta as PageMeta };
  },

  getPublicTrip: async (tripId: number) => {
    const { data } = await apiClient.get<ApiResponse<TripDetail>>(`/trips/${tripId}/public`);
    return data.data;
  },

  publishTrip: async (tripId: number, isPublic: boolean) => {
    const { data } = await apiClient.patch<ApiResponse<TripPublicSummary>>(`/trips/${tripId}/publish`, { isPublic });
    return data.data;
  },

  toggleLike: async (tripId: number) => {
    const { data } = await apiClient.post<ApiResponse<LikeStatus>>(`/trips/${tripId}/like`);
    return data.data;
  },

  getLikeStatus: async (tripId: number) => {
    const { data } = await apiClient.get<ApiResponse<LikeStatus>>(`/trips/${tripId}/like`);
    return data.data;
  },

  getComments: async (tripId: number, page = 0, size = 10): Promise<CommentsPage> => {
    const { data } = await apiClient.get<ApiResponse<TripComment[]>>(`/trips/${tripId}/comments`, {
      params: { page, size },
    });
    return { items: data.data, meta: data.meta as PageMeta };
  },

  addComment: async (tripId: number, content: string, parentId?: number | null) => {
    const { data } = await apiClient.post<ApiResponse<TripComment>>(`/trips/${tripId}/comments`, {
      content,
      parentId: parentId ?? null,
    });
    return data.data;
  },

  deleteComment: async (tripId: number, commentId: number) => {
    await apiClient.delete(`/trips/${tripId}/comments/${commentId}`);
  },
};
