import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Image as ImageIcon, Loader2, LogOut, Menu, MessageCircle, Send, Shield, X } from "lucide-react";
import "./admin-theme.css";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import {
  useAdminChatHistory,
  useAdminChatSocket,
  useAdminCloseConversation,
  useAdminConversations,
  useAdminMarkRead,
  useAdminReply,
  useAdminReplyImage,
} from "@/features/chat/useAdminChat";
import type { AdminConversationDto, MessageDto } from "@/integrations/api/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const AdminChatInbox = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "CLOSED">("OPEN");
  const [navOpen, setNavOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
    else if (!authLoading && user && !isAdmin) navigate("/");
  }, [authLoading, user, isAdmin, navigate]);

  useAdminChatSocket({
    onIncoming: (m) => {
      // Toast cho tin user mới — nếu đang mở đúng hội thoại thì không toast cho đỡ ồn
      if (selectedId !== m.conversationId) {
        const conv = conversations.find((c) => c.id === m.conversationId);
        const who = conv?.userName ?? conv?.userEmail ?? "Khách";
        toast(`Tin mới từ ${who}`, {
          description: m.messageType === "IMAGE" ? "Đã gửi 1 ảnh" : m.content ?? "",
        });
      }
    },
  });

  const { data: conversations = [], isLoading: convLoading } = useAdminConversations(statusFilter);
  const { data: history, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminChatHistory(selectedId);
  const reply = useAdminReply(selectedId);
  const replyImage = useAdminReplyImage(selectedId);
  const markRead = useAdminMarkRead();
  const closeConv = useAdminCloseConversation();

  // Auto-select hội thoại đầu tiên khi đổi filter
  useEffect(() => {
    if (selectedId == null && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Khi chọn 1 hội thoại — mark read
  useEffect(() => {
    if (selectedId == null) return;
    const target = conversations.find((c) => c.id === selectedId);
    if (target && target.unreadCount > 0) {
      markRead.mutate(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const messages: MessageDto[] = useMemo(() => {
    if (!history) return [];
    return [...history.pages.flat()].reverse();
  }, [history]);

  // Auto scroll bottom khi list message thay đổi
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId]);

  // Infinite scroll top
  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { root: scrollRef.current, threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleSend = () => {
    const text = draft.trim();
    if (!text || selectedId == null) return;
    setDraft("");
    reply.mutate(text, {
      onError: (e) => toast.error("Gửi thất bại", { description: (e as Error).message }),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || selectedId == null) return;
    if (!file.type.startsWith("image/")) return toast.error("Chỉ chấp nhận file ảnh");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Ảnh vượt quá 5MB");
    replyImage.mutate(file, {
      onError: (err) => toast.error("Tải ảnh thất bại", { description: (err as Error).message }),
    });
  };

  const handleClose = () => {
    if (selectedId == null) return;
    if (!confirm("Đóng hội thoại này?")) return;
    closeConv.mutate(selectedId, {
      onSuccess: () => {
        toast.success("Đã đóng hội thoại");
        setSelectedId(null);
      },
    });
  };

  return (
    <div className="admin-shell flex">
      {navOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setNavOpen(false)} aria-hidden />
      )}
      {/* Sidebar */}
      <aside className={`admin-aside w-64 shrink-0 flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-border/70">
          <Link to="/admin/users" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Quay lại Admin
          </Link>
          <button onClick={() => setNavOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground" aria-label="Đóng menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-chip-orange" />
            <span className="admin-eyebrow !text-chip-orange">Control Room</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <div className="admin-nav-item" data-active="true">
            <span className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4" />
              Tin nhắn
            </span>
            {totalUnread > 0 && (
              <span className="min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-border/70">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-card/70 backdrop-blur-xl border-b border-border/70 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" aria-label="Mở menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="admin-icon-chip !w-9 !h-9 !rounded-xl" data-tone="ember"><MessageCircle className="w-4 h-4" /></span>
              <div className="leading-tight">
                <p className="admin-eyebrow !text-[0.58rem]">Quản trị</p>
                <h1 className="admin-title text-base text-foreground">Hỗ trợ khách hàng</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 border border-border/60">
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === "OPEN" ? "bg-chip-orange text-white shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Đang mở
            </button>
            <button
              onClick={() => setStatusFilter("CLOSED")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === "CLOSED" ? "bg-chip-orange text-white shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Đã đóng
            </button>
          </div>
        </header>

        <div className="flex-1 flex">
          {/* Conversations list */}
          <div className="w-72 sm:w-80 shrink-0 border-r border-border/70 overflow-y-auto bg-card/40 admin-scroll">
            {convLoading && (
              <p className="text-center text-sm text-muted-foreground py-6">Đang tải…</p>
            )}
            {!convLoading && conversations.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Không có hội thoại</p>
            )}
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                c={c}
                active={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </div>

          {/* Chat panel */}
          <div className="flex-1 flex flex-col">
            {selectedId == null ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Chọn 1 hội thoại để bắt đầu
              </div>
            ) : (
              <>
                <div className="h-14 border-b border-border/70 flex items-center justify-between px-4 bg-card/40">
                  <div>
                    {(() => {
                      const c = conversations.find((x) => x.id === selectedId);
                      return c ? (
                        <>
                          <p className="admin-title text-sm text-foreground">{c.userName}</p>
                          <p className="text-xs text-muted-foreground">{c.userEmail}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Hội thoại #{selectedId}</p>
                      );
                    })()}
                  </div>
                  {statusFilter === "OPEN" && (
                    <button
                      onClick={handleClose}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Đóng hội thoại
                    </button>
                  )}
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
                  <div ref={topSentinelRef} />
                  {isFetchingNextPage && (
                    <p className="text-center text-xs text-muted-foreground">Đang tải tin cũ…</p>
                  )}
                  {messages.map((m) => (
                    <AdminBubble key={m.id} message={m} />
                  ))}
                </div>

                <footer className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      aria-label="Đính kèm ảnh"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={replyImage.isPending}
                      className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-50"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="admin-chat-draft" className="sr-only">Nội dung trả lời</label>
                    <textarea
                      id="admin-chat-draft"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="Nhập câu trả lời…"
                      className="flex-1 resize-none bg-muted/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-24"
                    />
                    <button
                      type="button"
                      aria-label="Gửi"
                      onClick={handleSend}
                      disabled={!draft.trim() || reply.isPending}
                      className="w-9 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </footer>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function ConversationItem({
  c,
  active,
  onClick,
}: {
  c: AdminConversationDto;
  active: boolean;
  onClick: () => void;
}) {
  const unread = c.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors flex items-start gap-3 ${
        active ? "bg-primary/5" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
        {(c.userName ?? c.userEmail).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unread ? "font-semibold" : ""}`}>{c.userName ?? c.userEmail}</p>
          {c.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {new Date(c.lastMessageAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${unread ? "text-foreground" : "text-muted-foreground"}`}>
          {c.lastMessagePreview ?? "(chưa có tin)"}
        </p>
      </div>
      {unread && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center self-center">
          {c.unreadCount > 99 ? "99+" : c.unreadCount}
        </span>
      )}
      {!unread && active && <Check className="w-3.5 h-3.5 text-muted-foreground self-center" />}
    </button>
  );
}

function AdminBubble({ message }: { message: MessageDto }) {
  const isAdminMsg = message.senderRole === "ADMIN";
  return (
    <div className={`flex ${isAdminMsg ? "justify-end" : "justify-start"} mb-1`}>
      {!isAdminMsg && (
        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-semibold mr-2 mt-auto shrink-0">
          U
        </div>
      )}
      <div className="max-w-[65%]">
        <p className={`text-[11px] mb-1 ${isAdminMsg ? "text-right text-muted-foreground" : "text-muted-foreground"}`}>
          {isAdminMsg ? "Quản trị viên" : "Khách hàng"} ·{" "}
          {new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
            isAdminMsg
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border rounded-bl-md"
          }`}
        >
          {message.messageType === "IMAGE" && message.imageUrl ? (
            <a href={message.imageUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={message.imageUrl}
                alt="Ảnh đính kèm"
                className="rounded-lg max-h-64 object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <span>{message.content}</span>
          )}
        </div>
      </div>
      {isAdminMsg && (
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold ml-2 mt-auto shrink-0">
          A
        </div>
      )}
    </div>
  );
}

export default AdminChatInbox;
