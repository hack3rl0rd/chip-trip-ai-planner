import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, MapPin, Cloud, Users, Zap, MessageCircle, Heart, MessageSquare, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
  useNotificationSocket,
  useUnreadCount,
} from "./useNotifications";
import type { NotificationDto, NotificationType } from "@/integrations/api/types";

function iconFor(type: NotificationType) {
  switch (type) {
    case "TRIP_MEMBER_ADDED":
      return <Users className="w-4 h-4 text-primary" />;
    case "TRIP_REMINDER":
      return <MapPin className="w-4 h-4 text-chip-orange" />;
    case "WEATHER_ALERT":
      return <Cloud className="w-4 h-4 text-blue-500" />;
    case "AI_CREDITS_LOW":
      return <Zap className="w-4 h-4 text-amber-500" />;
    case "SUPPORT_REPLY":
    case "NEW_SUPPORT_MESSAGE":
      return <MessageCircle className="w-4 h-4 text-primary" />;
    case "TRIP_LIKED":
      return <Heart className="w-4 h-4 text-chip-orange" />;
    case "TRIP_COMMENTED":
      return <MessageSquare className="w-4 h-4 text-chip-orange" />;
    case "POST_TRIP_REVIEW":
      return <Sparkles className="w-4 h-4 text-chip-orange" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: count = 0 } = useUnreadCount();
  const { data: list = [], isLoading, isError, refetch } = useNotificationList(0, 10);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Subscribe WS — toast khi có message mới
  useNotificationSocket((n) => {
    toast(n.title, { description: n.body ?? "" });
  });

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleClickItem = (n: NotificationDto) => {
    if (!n.isRead && n.id != null) markRead.mutate(n.id);
    setOpen(false);
    if (n.refId && (n.type === "TRIP_MEMBER_ADDED" || n.type === "TRIP_REMINDER" || n.type === "POST_TRIP_REVIEW")) {
      navigate(`/result?id=${n.refId}`);
    } else if (n.refId && (n.type === "TRIP_LIKED" || n.type === "TRIP_COMMENTED")) {
      navigate(`/trips/${n.refId}/public`);
    } else if (n.type === "NEW_SUPPORT_MESSAGE") {
      navigate("/admin/chat");
    }
    // SUPPORT_REPLY: không navigate vì ChatWidget nổi sẵn ở mọi trang
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Thông báo"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[480px] bg-card rounded-2xl border border-border shadow-lg overflow-hidden z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold">Thông báo</p>
              <button
                type="button"
                onClick={() => count > 0 && markAllRead.mutate()}
                disabled={count === 0 || markAllRead.isPending}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đánh dấu tất cả
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">Đang tải…</div>
              )}
              {!isLoading && isError && (
                <div className="px-4 py-6 text-center space-y-2">
                  <p className="text-sm text-destructive">Không thể tải thông báo</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="text-xs text-primary hover:underline"
                  >
                    Thử lại
                  </button>
                </div>
              )}
              {!isLoading && !isError && list.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Chưa có thông báo nào
                </div>
              )}
              {list.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickItem(n)}
                  className={`flex gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-primary/5" : "opacity-60"}`}
                >
                  <div className="mt-0.5">{iconFor(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? "font-semibold" : ""}`}>{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.isRead && <Check className="w-3.5 h-3.5 self-start mt-0.5 text-muted-foreground shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
