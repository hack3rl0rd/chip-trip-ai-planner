import { apiClient } from "../client";
import type { ApiResponse, NotificationDto } from "../types";

export const notificationsApi = {
  list: async (page = 0, size = 20): Promise<NotificationDto[]> => {
    const res = await apiClient.get<ApiResponse<NotificationDto[]>>("/notifications", {
      params: { page, size },
    });
    return res.data.data ?? [];
  },

  unreadCount: async (): Promise<number> => {
    const res = await apiClient.get<ApiResponse<{ count: number }>>("/notifications/unread-count");
    return res.data.data.count;
  },

  markRead: async (id: number): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch("/notifications/read-all");
  },
};
