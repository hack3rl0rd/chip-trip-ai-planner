import { useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { chatApi } from "@/integrations/api";
import type { ConversationDto, MessageDto } from "@/integrations/api/types";
import { connectChatSocket, type ChatSocketHandle } from "@/integrations/ws/chatSocket";
import { authStorage } from "@/integrations/api/client";
import { useAuth } from "@/features/auth/useAuth";

export const chatKeys = {
  conversation: ["chat", "conversation"] as const,
  history: ["chat", "history"] as const,
};

const PAGE_SIZE = 20;

/** Hội thoại của user (auto-create nếu chưa có). */
export function useMyConversation() {
  const { user } = useAuth();
  return useQuery<ConversationDto>({
    queryKey: chatKeys.conversation,
    queryFn: () => chatApi.getConversation(),
    staleTime: 30_000,
    enabled: !!user,
  });
}

/** Infinite query: load lịch sử cũ hơn qua cursor `before` (= id nhỏ nhất hiện có). */
export function useChatHistory(enabled = true) {
  return useInfiniteQuery({
    queryKey: chatKeys.history,
    queryFn: ({ pageParam }) => chatApi.history(pageParam as number | undefined, PAGE_SIZE),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: MessageDto[]) => {
      // BE trả mới→cũ. Khi page < PAGE_SIZE → hết, không còn cursor.
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.id;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => chatApi.sendText(content),
    onSuccess: (m) => {
      appendMessageToHistory(qc, m);
    },
  });
}

export function useSendImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => chatApi.sendImage(file),
    onSuccess: (m) => {
      appendMessageToHistory(qc, m);
    },
  });
}

export function useMarkChatRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chatApi.markRead(),
    onSuccess: () => {
      qc.setQueryData<ConversationDto>(chatKeys.conversation, (old) =>
        old ? { ...old, unreadCount: 0 } : old
      );
    },
  });
}

/**
 * Subscribe /user/queue/messages cho user thường. Tin mới được prepend
 * vào page đầu tiên của infinite history; nếu trùng id (đã optimistic) thì bỏ qua.
 *
 * Shared STOMP client tự reconnect với token mới khi phiên được refresh.
 */
export function useChatSocket(opts?: { onIncoming?: (m: MessageDto) => void }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const handleRef = useRef<ChatSocketHandle | null>(null);
  const cbRef = useRef(opts?.onIncoming);
  cbRef.current = opts?.onIncoming;

  useEffect(() => {
    if (!user || isAdmin) return; // chỉ user thường dùng kênh /user/queue/messages

    const connect = () => {
      const token = authStorage.getAccessToken();
      if (!token) return;
      handleRef.current?.disconnect();
      handleRef.current = connectChatSocket(
        token,
        (m) => {
          appendMessageToHistory(qc, m);
          // Tin từ admin → tăng unread; tin do chính user gửi (echo) → không
          if (m.senderRole === "ADMIN") {
            qc.setQueryData<ConversationDto>(chatKeys.conversation, (old) =>
              old ? { ...old, unreadCount: old.unreadCount + 1, lastMessageAt: m.createdAt } : old
            );
          } else {
            qc.setQueryData<ConversationDto>(chatKeys.conversation, (old) =>
              old ? { ...old, lastMessageAt: m.createdAt } : old
            );
          }
          cbRef.current?.(m);
        },
        {
          asAdmin: false,
          onError: (msg) => console.warn("Chat WS error:", msg),
        }
      );
    };

    connect();

    return () => {
      handleRef.current?.disconnect();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);
}

// ============== Helpers ==============

type HistoryPages = { pages: MessageDto[][]; pageParams: (number | undefined)[] };

function appendMessageToHistory(qc: ReturnType<typeof useQueryClient>, m: MessageDto) {
  qc.setQueryData<HistoryPages>(chatKeys.history, (old) => {
    if (!old) return { pages: [[m]], pageParams: [undefined] };
    const first = old.pages[0] ?? [];
    if (first.some((x) => x.id === m.id)) return old; // dedup
    return {
      ...old,
      pages: [[m, ...first], ...old.pages.slice(1)],
    };
  });
}
