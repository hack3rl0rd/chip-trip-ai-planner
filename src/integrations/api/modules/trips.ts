import apiClient from "../client";
import type { ApiResponse, TripDetail, TripGenerateResponse, TripSummary, ShareTokenResponse } from "../types";

export interface GenerateTripPayload {
  departure: string;
  destination: string;
  tripType: "roundtrip" | "oneway";
  startDate: string;
  endDate: string;
  departureTime: string;
  returnTime: string;
  budgetVnd: number;
  styles: string[];
  peopleCount: number;
  tickets: number;
}

export const tripsApi = {
  generate: async (payload: GenerateTripPayload) => {
    const { data } = await apiClient.post<ApiResponse<TripGenerateResponse>>("/trips/generate", payload, {
      timeout: 120_000,
    });
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

  deleteActivity: async (tripId: number, dayId: number, activityId: number) => {
    await apiClient.delete(`/trips/${tripId}/days/${dayId}/activities/${activityId}`);
  },

  reorderActivities: async (tripId: number, dayId: number, orderedIds: number[]) => {
    await apiClient.post(`/trips/${tripId}/days/${dayId}/activities/reorder`, { orderedIds });
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
