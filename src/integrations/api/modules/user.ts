import apiClient from "../client";
import type { ApiResponse, UserProfile } from "../types";

export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
}

export const userApi = {
  getMe: async () => {
    const { data } = await apiClient.get<ApiResponse<UserProfile>>("/users/me");
    return data.data;
  },

  updateMe: async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.patch<ApiResponse<UserProfile>>("/users/me", payload);
    return data.data;
  },
};
