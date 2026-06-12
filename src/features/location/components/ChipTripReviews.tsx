import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import {
  usePlaceReviews,
  usePlaceReviewSummary,
  useSubmitPlaceReview,
  useDeletePlaceReview,
} from "@/features/location/hooks/usePlaceReviews";

interface ChipTripReviewsProps {
  placeCacheId: number;
}

function StarRow({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= rating ? "text-chip-yellow fill-chip-yellow" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

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

const ChipTripReviews = ({ placeCacheId }: ChipTripReviewsProps) => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");

  const { data: reviewsPage, isLoading } = usePlaceReviews(placeCacheId, page);
  const { data: summary } = usePlaceReviewSummary(placeCacheId);
  const submitMutation = useSubmitPlaceReview(placeCacheId);
  const deleteMutation = useDeletePlaceReview(placeCacheId);

  const reviews = reviewsPage?.items ?? [];
  const meta = reviewsPage?.meta;
  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Vui lòng chọn số sao");
      return;
    }
    try {
      await submitMutation.mutateAsync({ rating, content: content.trim() || null });
      toast.success(myReview ? "Đã cập nhật đánh giá!" : "Đã gửi đánh giá!");
      setRating(0);
      setContent("");
    } catch {
      toast.error("Gửi đánh giá thất bại");
    }
  };

  const handleDelete = async (reviewId: number) => {
    try {
      await deleteMutation.mutateAsync(reviewId);
      toast.success("Đã xóa đánh giá");
    } catch {
      toast.error("Xóa đánh giá thất bại");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tổng rating trung bình từ place_reviews trong DB */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
        <span className="text-3xl font-bold text-foreground">
          {summary?.averageRating != null ? summary.averageRating.toFixed(1) : "—"}
        </span>
        <div>
          <StarRow rating={Math.round(summary?.averageRating ?? 0)} />
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary?.totalReviews ? `${summary.totalReviews} đánh giá từ cộng đồng ChipTrip` : "Chưa có đánh giá nào"}
          </p>
        </div>
      </div>

      {/* Form viết review — chỉ hiện khi đã đăng nhập */}
      {user ? (
        <div className="p-4 rounded-xl border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {myReview ? "Cập nhật đánh giá của bạn" : "Viết đánh giá của bạn"}
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${i} sao`}
                className="p-0.5"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    i <= (hoverRating || rating)
                      ? "text-chip-yellow fill-chip-yellow"
                      : "text-muted-foreground/30 hover:text-chip-yellow/50"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Chia sẻ trải nghiệm của bạn (không bắt buộc)..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-chip-orange resize-none"
          />
          <Button variant="hero" size="sm" onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Gửi đánh giá
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          <Link to="/auth" className="text-chip-orange font-medium hover:underline">Đăng nhập</Link> để viết đánh giá
        </p>
      )}

      {/* List reviews */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-chip-orange" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {review.userAvatarUrl ? (
                    <img src={review.userAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(review.userName || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{review.userName || "Người dùng"}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRow rating={review.rating} size="w-3.5 h-3.5" />
                  {user && user.id === review.userId && (
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Xóa đánh giá"
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {review.content && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
              )}
            </div>
          ))}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="soft" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span className="text-sm text-muted-foreground self-center">{page + 1}/{meta.totalPages}</span>
              <Button variant="soft" size="sm" disabled={meta.last} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Chưa có đánh giá ChipTrip nào cho địa điểm này.</p>
      )}
    </div>
  );
};

export default ChipTripReviews;
