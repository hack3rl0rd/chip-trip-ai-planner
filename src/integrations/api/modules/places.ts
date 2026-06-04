import apiClient from "../client";
import type { ApiResponse } from "../types";

export interface PlacePhoto {
  url: string;
  thumbnail: string;
}

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
  reviews: PlaceReview[] | null;
  phone: string | null;
  website: string | null;
}

export const placesApi = {
  getPlaceDetail: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<PlaceDetail>>(`/places/${id}`);
    return data.data;
  },
};
