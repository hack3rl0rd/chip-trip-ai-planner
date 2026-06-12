import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/integrations/api";
import type { NotificationDto } from "@/integrations/api/types";
import { connectNotificationSocket, type NotificationSocketHandle } from "@/integrations/ws/notificationSocket";
import { authStorage } from "@/integrations/api/client";
import { useAuth } from "@/features/auth/useAuth";

export const notificationKeys = {
  list: ["notifications", "list"] as const,
  unread: ["notifications", "unread"] as const,
};

export function useNotificationList(page = 0, size = 20) {
  const qc = useQueryClient();
  return useQuery<NotificationDto[]>({
    queryKey: [...notificationKeys.list, page, size],
    queryFn: async () => {
      const fromApi = (await notificationsApi.list(page, size)) ?? [];
      // Merge với dữ liệu cache hiện tại (giữ lại WS notifications chưa vào DB)
      const cached: NotificationDto[] =
        qc.getQueryData([...notificationKeys.list, page, size]) ?? [];
      const apiIds = new Set(fromApi.map((n) => n.id));
      const localOnly = cached.filter((n) => !apiIds.has(n.id));
      return [...localOnly, ...fromApi];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: notificationKeys.unread,
    queryFn: () => notificationsApi.unreadCount(),
    staleTime: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onMutate: (id) => {
      const previousList = qc.getQueriesData<NotificationDto[]>({ queryKey: notificationKeys.list });
      const previousCount = qc.getQueryData<number>(notificationKeys.unread);
      qc.setQueriesData<NotificationDto[]>(
        { queryKey: notificationKeys.list },
        (old) => old?.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      qc.setQueryData<number>(notificationKeys.unread, (old = 0) => Math.max(0, old - 1));
      return { previousList, previousCount };
    },
    onError: (_err, _id, context) => {
      context?.previousList?.forEach(([key, data]) => qc.setQueryData(key, data));
      if (context?.previousCount !== undefined) {
        qc.setQueryData(notificationKeys.unread, context.previousCount);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list });
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: () => {
      const previousList = qc.getQueriesData<NotificationDto[]>({ queryKey: notificationKeys.list });
      const previousCount = qc.getQueryData<number>(notificationKeys.unread);
      qc.setQueriesData<NotificationDto[]>(
        { queryKey: notificationKeys.list },
        (old) => old?.map((n) => ({ ...n, isRead: true }))
      );
      qc.setQueryData<number>(notificationKeys.unread, 0);
      return { previousList, previousCount };
    },
    onError: (_err, _vars, context) => {
      context?.previousList?.forEach(([key, data]) => qc.setQueryData(key, data));
      if (context?.previousCount !== undefined) {
        qc.setQueryData(notificationKeys.unread, context.previousCount);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list });
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    },
  });
}

/**
 * Kết nối WebSocket notifications khi user đăng nhập. Khi có message mới, invalidate
 * list/unread để TanStack Query refetch.
 *
 * Mount ở 1 chỗ duy nhất (ví dụ trong AuthProvider wrapper hoặc App).
 * Reconnect tự động được handle bởi STOMP client (reconnectDelay).
 *
 * LƯU Ý: access token JWT 15 phút. Hook re-connect khi token thay đổi (qua event
 * "chiptrip-auth-change") để dùng token mới sau khi refresh.
 */
export function useNotificationSocket(onMessage?: (n: NotificationDto) => void) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const handleRef = useRef<NotificationSocketHandle | null>(null);
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!user) return;

    const connect = () => {
      const token = authStorage.getAccessToken();
      if (!token) return;

      handleRef.current?.disconnect();
      handleRef.current = connectNotificationSocket(
        token,
        (n) => {
          // Thêm ngay vào cache (BE có thể push WS trước khi commit DB)
          qc.setQueriesData<NotificationDto[]>(
            { queryKey: notificationKeys.list },
            (old) => (old ? [n, ...old] : [n])
          );
          qc.setQueryData<number>(
            notificationKeys.unread,
            (old = 0) => old + 1
          );
          cbRef.current?.(n);
          // Sync với DB sau 3s (đảm bảo BE đã commit xong)
          setTimeout(() => {
            qc.invalidateQueries({ queryKey: notificationKeys.list });
            qc.invalidateQueries({ queryKey: notificationKeys.unread });
          }, 3000);
        },
        {
          onError: (msg) => console.warn("Notification WS error:", msg),
        }
      );
    };

    connect();

    const onAuthChange = () => connect();
    window.addEventListener("chiptrip-auth-change", onAuthChange);

    return () => {
      window.removeEventListener("chiptrip-auth-change", onAuthChange);
      handleRef.current?.disconnect();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
