import apiClient from "../client";
import type { ApiResponse, UserProfile } from "../types";

export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
  preferences?: string;
}

export interface ChangePasswordPayload {
  oldPassword?: string;
  newPassword?: string;
}

export const userApi = {
  getMe: async () => {
    const { data } = await apiClient.get<ApiResponse<UserProfile>>("/users/me");
    return data.data;
  },

  searchUsers: async (query: string) => {
    const { data } = await apiClient.get<ApiResponse<UserProfile[]>>(`/users/search?q=${encodeURIComponent(query)}`);
    return data.data;
  },

  updateMe: async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.patch<ApiResponse<UserProfile>>("/users/me", payload);
    return data.data;
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const { data } = await apiClient.post<ApiResponse<void>>("/users/me/change-password", payload);
    return data;
  },
};
