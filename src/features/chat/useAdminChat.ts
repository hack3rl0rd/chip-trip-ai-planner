import { useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminChatApi } from "@/integrations/api";
import type {
  AdminConversationDto,
  MessageDto,
} from "@/integrations/api/types";
import { connectChatSocket, type ChatSocketHandle } from "@/integrations/ws/chatSocket";
import { authStorage } from "@/integrations/api/client";
import { useAuth } from "@/features/auth/useAuth";

export const adminChatKeys = {
  conversations: (status: "OPEN" | "CLOSED") => ["admin-chat", "conversations", status] as const,
  history: (id: number) => ["admin-chat", "history", id] as const,
};

const PAGE_SIZE = 20;

export function useAdminConversations(status: "OPEN" | "CLOSED" = "OPEN") {
  const { isAdmin } = useAuth();
  return useQuery<AdminConversationDto[]>({
    queryKey: adminChatKeys.conversations(status),
    queryFn: () => adminChatApi.listConversations(status, 0, 50),
    enabled: isAdmin,
    staleTime: 10_000,
  });
}

export function useAdminChatHistory(conversationId: number | null) {
  return useInfiniteQuery({
    queryKey: conversationId == null ? ["admin-chat", "history", "none"] : adminChatKeys.history(conversationId),
    queryFn: ({ pageParam }) =>
      adminChatApi.history(conversationId!, pageParam as number | undefined, PAGE_SIZE),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: MessageDto[]) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.id,
    enabled: conversationId != null,
    staleTime: 10_000,
  });
}

export function useAdminReply(conversationId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => {
      if (conversationId == null) throw new Error("No conversation selected");
      return adminChatApi.reply(conversationId, content);
    },
    onSuccess: (m) => {
      if (conversationId != null) appendAdminMessageToHistory(qc, conversationId, m);
    },
  });
}

export function useAdminReplyImage(conversationId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      if (conversationId == null) throw new Error("No conversation selected");
      return adminChatApi.replyImage(conversationId, file);
    },
    onSuccess: (m) => {
      if (conversationId != null) appendAdminMessageToHistory(qc, conversationId, m);
    },
  });
}

export function useAdminMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: number) => adminChatApi.markRead(conversationId),
    onSuccess: (_void, conversationId) => {
      patchAdminUnread(qc, conversationId, 0);
    },
  });
}

export function useAdminCloseConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: number) => adminChatApi.close(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat", "conversations"] });
    },
  });
}

/**
 * Admin subscribe /topic/support — nhận MỌI tin nhắn (cả user gửi & admin reply).
 * Cập nhật:
 *   - list conversations: bump unread, đẩy convo lên đầu, cập nhật preview/lastMessageAt
 *   - history của conversation đang xem (nếu khớp)
 *
 * `onIncoming` callback chỉ fire cho tin USER → admin (để show toast).
 */
export function useAdminChatSocket(opts?: { onIncoming?: (m: MessageDto) => void }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const handleRef = useRef<ChatSocketHandle | null>(null);
  const cbRef = useRef(opts?.onIncoming);
  cbRef.current = opts?.onIncoming;

  useEffect(() => {
    if (!isAdmin) return;

    const connect = () => {
      const token = authStorage.getAccessToken();
      if (!token) return;
      handleRef.current?.disconnect();
      handleRef.current = connectChatSocket(
        token,
        (m) => {
          appendAdminMessageToHistory(qc, m.conversationId, m);
          patchAdminConversations(qc, m);
          if (m.senderRole === "USER") cbRef.current?.(m);
        },
        {
          asAdmin: true,
          onError: (msg) => console.warn("Admin chat WS error:", msg),
        }
      );
    };

    connect();

    return () => {
      handleRef.current?.disconnect();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);
}

// ============== Helpers ==============

type HistoryPages = { pages: MessageDto[][]; pageParams: (number | undefined)[] };

function appendAdminMessageToHistory(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: number,
  m: MessageDto
) {
  qc.setQueryData<HistoryPages>(adminChatKeys.history(conversationId), (old) => {
    if (!old) return old; // chưa load history → bỏ qua, sẽ fetch khi mở
    const first = old.pages[0] ?? [];
    if (first.some((x) => x.id === m.id)) return old;
    return { ...old, pages: [[m, ...first], ...old.pages.slice(1)] };
  });
}

function patchAdminConversations(qc: ReturnType<typeof useQueryClient>, m: MessageDto) {
  // Chỉ patch list OPEN (nếu đang ở CLOSED list, tin mới USER cũng nên bump nhưng phức tạp;
  // giải pháp đơn giản: invalidate để refetch).
  qc.setQueryData<AdminConversationDto[]>(adminChatKeys.conversations("OPEN"), (old) => {
    if (!old) return old;
    const idx = old.findIndex((c) => c.id === m.conversationId);
    if (idx < 0) {
      // Hội thoại mới chưa có trong cache → refetch
      qc.invalidateQueries({ queryKey: adminChatKeys.conversations("OPEN") });
      return old;
    }
    const target = old[idx];
    const preview = m.messageType === "IMAGE" ? "[Ảnh]" : (m.content ?? "");
    const updated: AdminConversationDto = {
      ...target,
      lastMessageAt: m.createdAt,
      lastMessagePreview: preview.length > 100 ? preview.slice(0, 100) + "…" : preview,
      // tin USER mới → tăng unread; tin ADMIN reply → giữ nguyên
      unreadCount: m.senderRole === "USER" ? target.unreadCount + 1 : target.unreadCount,
    };
    // Đưa hội thoại lên đầu
    return [updated, ...old.slice(0, idx), ...old.slice(idx + 1)];
  });
}

function patchAdminUnread(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: number,
  newUnread: number
) {
  qc.setQueriesData<AdminConversationDto[]>(
    { queryKey: ["admin-chat", "conversations"] },
    (old) =>
      old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: newUnread } : c))
  );
}
