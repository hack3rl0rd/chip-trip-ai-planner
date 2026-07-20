import apiClient from "../client";
import type { ApiResponse } from "../types";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceSearchResult {
  predictions: PlacePrediction[];
}

export interface PlaceLookupResult {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  provinceName: string | null;
  communeName: string | null;
}

export interface PlacePhoto {
  url: string;
  thumbnail: string;
}

export type PhotoSyncStatus = "PENDING" | "READY" | "STALE" | "REFRESHING" | "FAILED";

export interface OpeningHour {
  day: string;
  hours: string;
}

export interface PlaceReview {
  author: string;
  avatar: string;
  rating: number;
  time: string;
  text: string;
}

export interface PlaceDetail {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviewCount: number | null;
  openState: string | null;
  openingHours: OpeningHour[] | null;
  photos: PlacePhoto[] | null;
  photosSyncedAt: string | null;
  photosStatus: PhotoSyncStatus;
  photoFailureCount: number;
  reviews: PlaceReview[] | null;
  phone: string | null;
  website: string | null;
}

export const placesApi = {
  getPlaceDetail: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<PlaceDetail>>(`/places/${id}`);
    return data.data;
  },

  /** Bao mot URL trong gallery bi browser tu choi/tai loi; backend se refresh anh o worker nen. */
  reportPhotoFailure: async (id: number, url: string): Promise<void> => {
    await apiClient.post(`/places/${id}/photos/failures`, { url });
  },

  /** Autocomplete điểm đến qua Goong (backend proxy). */
  searchPlaces: async (q: string) => {
    const { data } = await apiClient.get<ApiResponse<PlaceSearchResult>>(`/places/search`, {
      params: { q },
    });
    return data.data?.predictions ?? [];
  },

  /** Lấy lat/lng + tỉnh/phường sau khi user chọn 1 autocomplete prediction. */
  lookupPlace: async (placeId: string) => {
    const { data } = await apiClient.get<ApiResponse<PlaceLookupResult>>(`/places/detail`, {
      params: { placeId },
    });
    return data.data;
  },
};
