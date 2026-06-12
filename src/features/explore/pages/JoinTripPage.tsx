import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Loader2, MapPin, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { membersApi } from "@/integrations/api/modules/members";

const JoinTripPage = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [joining, setJoining] = useState(false);

  const { data: preview, isLoading, error } = useQuery({
    queryKey: ["invitePreview", token],
    queryFn: () => membersApi.getInvitePreview(token!),
    enabled: !!token,
    retry: false,
  });

  const handleJoin = async () => {
    if (!token) return;
    if (!user) {
      toast.info("Đăng nhập hoặc đăng ký để tham gia nhóm");
      navigate("/auth", { state: { from: `/trips/join/${token}` } });
      return;
    }
    setJoining(true);
    try {
      await membersApi.joinByInvite(token);
      toast.success("Đã tham gia nhóm! 🎉", {
        description: `Bạn đã là thành viên của "${preview?.title}"`,
      });
      navigate(`/result?id=${preview?.tripId}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.info("Bạn đã là thành viên chuyến đi này rồi");
        navigate(`/result?id=${preview?.tripId}`);
      } else {
        toast.error("Không tham gia được — link có thể đã bị thu hồi");
      }
    } finally {
      setJoining(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
          <p className="text-muted-foreground">Đang kiểm tra link mời...</p>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4 px-6 text-center">
          <div className="text-5xl">🔗</div>
          <h2 className="text-xl font-bold text-foreground">Link mời không hợp lệ</h2>
          <p className="text-muted-foreground max-w-sm">Link có thể đã bị thu hồi hoặc chuyến đi không còn tồn tại.</p>
          <Button variant="hero" onClick={() => navigate("/")}>Về trang chủ</Button>
        </div>
      </div>
    );
  }

  const ownerInitial = (preview.ownerName || "U")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-12 px-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl p-8 border border-border shadow-card text-center space-y-6"
        >
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-chip-orange/10 flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-chip-orange" />
            </div>
            <p className="text-sm text-muted-foreground">Bạn được mời tham gia chuyến đi</p>
            <h1 className="text-2xl font-bold text-foreground">{preview.title}</h1>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {preview.destination}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {preview.numDays} ngày</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {preview.memberCount} thành viên</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 py-3 border-y border-border">
            {preview.ownerAvatarUrl ? (
              <img src={preview.ownerAvatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                {ownerInitial}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{preview.ownerName || "Người dùng"}</p>
              <p className="text-xs text-muted-foreground">Trưởng nhóm</p>
            </div>
          </div>

          <Button variant="hero" className="w-full h-12 text-base font-bold" onClick={handleJoin} disabled={joining}>
            {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {user ? "Tham gia nhóm" : "Đăng nhập để tham gia"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Tham gia để cùng xem lịch trình, tick checklist và chia tiền nhóm 🐥
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinTripPage;
