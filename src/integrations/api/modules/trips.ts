import apiClient from "../client";
import type { ApiResponse, TripDetail, TripGenerateResponse, TripSummary, ShareTokenResponse } from "../types";

export interface GenerateTripPayload {
  origin: string;
  destination: string;
  tripType: "roundtrip" | "oneway";
  startDate: string;
  endDate: string;
  departureTime: string;
  returnTime: string;
  budget: number;
  styles: string[];
  travelers: number;
  tickets: number;
}

export const tripsApi = {
  generate: async (payload: GenerateTripPayload) => {
    const { data } = await apiClient.post<ApiResponse<TripGenerateResponse>>("/trips/generate", payload);
    return data.data;
  },

  getMyTrips: async (page = 0, size = 20) => {
    const { data } = await apiClient.get<ApiResponse<TripSummary[]>>("/trips", {
      params: { page, size },
    });
    return data.data;
  },

  getTripDetail: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<TripDetail>>(`/trips/${id}`);
    return data.data;
  },

  updateTrip: async (id: number, payload: Partial<TripDetail>) => {
    const { data } = await apiClient.patch<ApiResponse<TripDetail>>(`/trips/${id}`, payload);
    return data.data;
  },

  deleteTrip: async (id: number) => {
    await apiClient.delete(`/trips/${id}`);
  },

  cloneTrip: async (id: number) => {
    const { data } = await apiClient.post<ApiResponse<TripDetail>>(`/trips/${id}/clone`);
    return data.data;
  },

  enableShare: async (id: number) => {
    const { data } = await apiClient.post<ApiResponse<ShareTokenResponse>>(`/trips/${id}/share`);
    return data.data;
  },

  disableShare: async (id: number) => {
    await apiClient.delete(`/trips/${id}/share`);
  },

  getSharedTrip: async (shareToken: string) => {
    const { data } = await apiClient.get<ApiResponse<TripDetail>>(`/trips/shared/${shareToken}`);
    return data.data;
  },
};
