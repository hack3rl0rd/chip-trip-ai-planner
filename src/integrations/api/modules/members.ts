import { apiClient } from "../client";
import type { ApiResponse } from "../types";
import type { TripMemberResponse } from "../types";

export interface AddMemberPayload {
  userId?: number;
  displayName?: string;
}

export interface UpdateMemberPayload {
  displayName: string;
}

export const membersApi = {
  getMembers: async (tripId: number): Promise<TripMemberResponse[]> => {
    const res = await apiClient.get<ApiResponse<TripMemberResponse[]>>(
      `/trips/${tripId}/members`
    );
    return res.data.data;
  },

  addMember: async (tripId: number, payload: AddMemberPayload): Promise<TripMemberResponse> => {
    const res = await apiClient.post<ApiResponse<TripMemberResponse>>(
      `/trips/${tripId}/members`,
      payload
    );
    return res.data.data;
  },

  updateMember: async (tripId: number, memberId: number, payload: UpdateMemberPayload): Promise<TripMemberResponse> => {
    const res = await apiClient.patch<ApiResponse<TripMemberResponse>>(
      `/trips/${tripId}/members/${memberId}`,
      payload
    );
    return res.data.data;
  },

  removeMember: async (tripId: number, memberId: number): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/members/${memberId}`);
  },
};
