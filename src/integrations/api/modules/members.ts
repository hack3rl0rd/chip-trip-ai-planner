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

export interface TripInvitePreview {
  tripId: number;
  title: string;
  destination: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  memberCount: number;
  /** Số ngày của chuyến — BE không lộ ngày cụ thể qua link mời. */
  numDays: number;
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

  /** Tạo (hoặc lấy lại) invite token — owner only, idempotent. */
  createInvite: async (tripId: number): Promise<string> => {
    const res = await apiClient.post<ApiResponse<{ inviteToken: string }>>(`/trips/${tripId}/invite`);
    return res.data.data.inviteToken;
  },

  revokeInvite: async (tripId: number): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/invite`);
  },

  /** Public — preview tối thiểu cho trang join. */
  getInvitePreview: async (inviteToken: string): Promise<TripInvitePreview> => {
    const res = await apiClient.get<ApiResponse<TripInvitePreview>>(`/trips/invite/${inviteToken}`);
    return res.data.data;
  },

  joinByInvite: async (inviteToken: string): Promise<TripMemberResponse> => {
    const res = await apiClient.post<ApiResponse<TripMemberResponse>>(`/trips/join/${inviteToken}`);
    return res.data.data;
  },
};
