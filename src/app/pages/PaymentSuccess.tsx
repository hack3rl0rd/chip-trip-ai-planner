import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Crown, Loader2, Receipt, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { paymentsApi } from "@/integrations/api";
import { userApi } from "@/integrations/api/modules/user";
import type { PaymentOrder } from "@/integrations/api/types";

const PLAN_NAME: Record<string, string> = {
  PREMIUM: "Premium",
  PRO: "Pro Traveler",
};

const formatVnd = (value: number) => value.toLocaleString("vi-VN");

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

type PaymentSuccessState = {
  order?: PaymentOrder;
  planName?: string;
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, profile, updateProfile } = useAuth();

  const state = location.state as PaymentSuccessState | null;
  const stateOrder = state?.order;
  const parsedOrderId = Number(searchParams.get("orderId"));
  const orderId = Number.isFinite(parsedOrderId) && parsedOrderId > 0
    ? parsedOrderId
    : stateOrder?.orderId;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true, state: { from: location } });
    }
  }, [authLoading, user, navigate, location]);

  useEffect(() => {
    if (!user) return;
    userApi.getMe()
      .then((nextProfile) => {
        if (nextProfile) updateProfile(nextProfile);
      })
      .catch(() => {});
  }, [user, updateProfile]);

  const orderQuery = useQuery({
    queryKey: ["paymentSuccessOrder", orderId],
    queryFn: () => paymentsApi.getOrder(orderId!),
    enabled: !!user && !!orderId,
    initialData: stateOrder?.orderId === orderId ? stateOrder : undefined,
  });

  const order = orderQuery.data ?? stateOrder;
  const planName = useMemo(
    () => state?.planName ?? PLAN_NAME[order?.planCode ?? ""] ?? "Premium",
    [order?.planCode, state?.planName],
  );
  const isPaid = order?.status === "PAID";
  const isPremium = (profile?.role ?? user?.role) === "ROLE_PREMIUM";

  if (authLoading || (orderId && orderQuery.isLoading && !order)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 px-4">
          <div className="container mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-chip-orange" />
            <p className="mt-3 text-sm text-muted-foreground">Đang kiểm tra đơn hàng...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!orderId || (!order && orderQuery.isError)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 px-4">
          <div className="container mx-auto max-w-lg rounded-2xl border border-destructive/40 bg-card p-8 text-center space-y-4">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="font-display text-xl font-bold text-foreground">Không tìm thấy đơn hàng</h1>
            <p className="text-sm text-muted-foreground">Bạn có thể quay lại trang gói để tạo mã thanh toán mới.</p>
            <Button variant="hero" onClick={() => navigate("/premium")}>Quay lại Premium</Button>
          </div>
        </main>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 px-4">
          <div className="container mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center space-y-4">
            <Receipt className="mx-auto h-10 w-10 text-chip-orange" />
            <h1 className="font-display text-xl font-bold text-foreground">Đơn hàng chưa xác nhận</h1>
            <p className="text-sm text-muted-foreground">
              Hệ thống chưa nhận được giao dịch thành công cho đơn {order?.orderCode}.
            </p>
            <Button variant="soft" onClick={() => navigate("/checkout")}>Quay lại thanh toán</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto max-w-2xl"
        >
          <section className="rounded-2xl border-2 border-green-500/35 bg-card p-6 sm:p-8 text-center space-y-6 shadow-warm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-chip-yellow/40 bg-chip-yellow-light px-3 py-1 text-xs font-bold text-foreground">
                <Crown className="h-3.5 w-3.5 text-chip-orange" />
                {isPremium ? "Đã nâng cấp Premium" : "Premium đang đồng bộ"}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Thanh toán thành công
              </h1>
              <p className="text-sm text-muted-foreground">
                Tài khoản của bạn đã được cộng lượt AI và nâng lên gói {planName}.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-3">
              <SummaryRow label="Mã đơn" value={order.orderCode} mono />
              <SummaryRow label="Gói" value={planName} />
              <SummaryRow label="Số tiền" value={`${formatVnd(order.amountVnd)}đ`} highlight />
              <SummaryRow label="Lượt AI" value={`+${order.credits} lượt`} highlight />
              <SummaryRow label="Thời gian" value={formatDateTime(order.paidAt)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="hero" size="lg" onClick={() => navigate("/planning")}>
                <Sparkles className="h-4 w-4" />
                Tạo lịch trình AI
              </Button>
              <Button variant="soft" size="lg" onClick={() => navigate("/profile")}>
                Xem hồ sơ
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
};

const SummaryRow = ({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-right text-sm font-semibold ${mono ? "font-mono" : ""} ${highlight ? "text-chip-orange" : "text-foreground"}`}>
      {value}
    </span>
  </div>
);

export default PaymentSuccess;
