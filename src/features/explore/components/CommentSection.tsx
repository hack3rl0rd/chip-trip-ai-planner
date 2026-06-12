import { useState } from "react";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { useComments, useAddComment, useDeleteComment } from "@/features/explore/hooks/useComments";
import ReportButton from "@/features/moderation/ReportButton";
import type { TripComment } from "@/integrations/api";

interface CommentSectionProps {
  tripId: number;
  /** id chủ trip — chủ trip được xóa mọi comment. */
  tripOwnerId?: number | null;
}

/** "2 giờ trước" style relative time. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

/** Render @mention dạng bold màu cam, phần còn lại text thường. */
function renderContent(content: string) {
  const parts = content.split(/(@[\p{L}\p{N}_]+)/gu);
  return parts.map((part, idx) =>
    part.startsWith("@") ? (
      <span key={idx} className="text-chip-orange font-medium">{part}</span>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

function Avatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initial = (name || "U")[0].toUpperCase();
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
      {initial}
    </div>
  );
}

interface CommentItemProps {
  comment: TripComment;
  tripId: number;
  tripOwnerId?: number | null;
}

function CommentItem({ comment, tripId, tripOwnerId }: CommentItemProps) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const addMutation = useAddComment(tripId);
  const deleteMutation = useDeleteComment(tripId);

  const canDelete = user != null && (user.id === comment.userId || user.id === tripOwnerId);

  const openReply = () => {
    setReplyText(`@${comment.userName || "user"} `);
    setReplyOpen(true);
  };

  const submitReply = async () => {
    const content = replyText.trim();
    if (!content) return;
    try {
      await addMutation.mutateAsync({ content, parentId: comment.id });
      setReplyText("");
      setReplyOpen(false);
    } catch {
      toast.error("Không gửi được trả lời");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(comment.id);
      toast.success("Đã xóa bình luận");
    } catch {
      toast.error("Không xóa được bình luận");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2.5">
        <Avatar name={comment.userName} avatarUrl={comment.userAvatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="bg-muted/40 rounded-xl px-3 py-2 border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{comment.userName || "Người dùng"}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 break-words whitespace-pre-wrap">
              {renderContent(comment.content)}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            {user && (
              <button onClick={openReply} className="text-xs font-medium text-muted-foreground hover:text-chip-orange transition-colors">
                Trả lời
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Xóa
              </button>
            )}
            {/* Báo cáo: chỉ hiện với comment của người khác */}
            {user && user.id !== comment.userId && (
              <ReportButton targetType="TRIP_COMMENT" targetId={comment.id} variant="icon" />
            )}
          </div>

          {replyOpen && (
            <div className="flex gap-2 mt-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Trả lời @${comment.userName || "user"}...`}
                rows={2}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-chip-orange resize-none"
              />
              <div className="flex flex-col gap-1">
                <Button variant="hero" size="sm" onClick={submitReply} disabled={addMutation.isPending || !replyText.trim()}>
                  {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReplyOpen(false)}>Hủy</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Children — indent trái 24px, render đệ quy */}
      {comment.children.length > 0 && (
        <div className="space-y-2" style={{ marginLeft: 24 }}>
          {comment.children.map((child) => (
            <CommentItem key={child.id} comment={child} tripId={tripId} tripOwnerId={tripOwnerId} />
          ))}
        </div>
      )}
    </div>
  );
}

const CommentSection = ({ tripId, tripOwnerId }: CommentSectionProps) => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [newComment, setNewComment] = useState("");
  const { data, isLoading } = useComments(tripId, page);
  const addMutation = useAddComment(tripId);

  const submitComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    try {
      await addMutation.mutateAsync({ content });
      setNewComment("");
    } catch {
      toast.error("Không gửi được bình luận");
    }
  };

  const comments = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-chip-orange" />
        Bình luận {meta ? `(${meta.totalElements})` : ""}
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-chip-orange" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} tripId={tripId} tripOwnerId={tripOwnerId} />
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="soft" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            {page + 1}/{meta.totalPages}
          </span>
          <Button variant="soft" size="sm" disabled={meta.last} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </div>
      )}

      {/* Input comment mới — chỉ hiện khi đã đăng nhập */}
      {user ? (
        <div className="flex gap-2 pt-2 border-t border-border">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết bình luận..."
            rows={2}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-chip-orange resize-none"
          />
          <Button
            variant="hero"
            size="sm"
            className="self-end"
            onClick={submitComment}
            disabled={addMutation.isPending || !newComment.trim()}
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center pt-2 border-t border-border">
          <Link to="/auth" className="text-chip-orange font-medium hover:underline">Đăng nhập</Link> để bình luận
        </p>
      )}
    </div>
  );
};

export default CommentSection;
