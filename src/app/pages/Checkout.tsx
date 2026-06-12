import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy, Loader2, ShieldCheck, AlertCircle, PartyPopper } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { paymentsApi } from "@/integrations/api";
import { userApi } from "@/integrations/api/modules/user";
import type { PaymentOrder } from "@/integrations/api/types";
import { queryKeys } from "@/hooks/useApi";
import { trackEvent } from "@/lib/analytics";

// Map ?plan= (FE) → planCode (BE config keys)
const PLAN_CODE: Record<string, string> = { premium: "PREMIUM", pro: "PRO" };
const PLAN_LABEL: Record<string, { name: string; features: string[] }> = {
  PREMIUM: {
    name: "Premium",
    features: ["1 lượt tạo lịch trình AI", "Lịch trình chi tiết theo giờ", "Đề xuất thay thế địa điểm", "Export PDF + Ảnh"],
  },
  PRO: {
    name: "Pro Traveler",
    features: ["3 lượt tạo lịch trình AI", "Tất cả tính năng Premium", "Chia sẻ & lên kế hoạch nhóm", "Chia tiền nhóm tự động", "Hỗ trợ ưu tiên 24/7"],
  },
};

const formatVnd = (v: number) => v.toLocaleString("vi-VN");

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, updateProfile } = useAuth();

  const planKey = (searchParams.get("plan") || "premium").toLowerCase();
  const planCode = PLAN_CODE[planKey] || "PREMIUM";
  const planMeta = PLAN_LABEL[planCode];

  const [paid, setPaid] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const handledPaid = useRef(false);
  const reportedStatusError = useRef(false);

  useEffect(() => {
    setPaid(false);
    handledPaid.current = false;
    reportedStatusError.current = false;
  }, [user?.id, planCode]);

  // Chưa đăng nhập → đẩy sang /auth, quay lại checkout sau khi login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true, state: { from: location } });
    }
  }, [authLoading, user, navigate, location]);

  // Tạo đơn hàng + sinh mã QR (1 đơn / lần vào trang theo planCode)
  const orderQuery = useQuery({
    queryKey: ["createPaymentOrder", user?.id, planCode],
    queryFn: () => paymentsApi.createOrder(planCode),
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });
  const order = orderQuery.data;

  useEffect(() => {
    if (order) {
      trackEvent("purchase_started", {
        planCode,
        amountVnd: order.amountVnd,
        credits: order.credits,
        method: "sepay_qr",
      });
    }
  }, [order, planCode]);

  // Poll trạng thái đơn hàng cho tới khi PAID
  const statusQuery = useQuery({
    queryKey: ["paymentOrderStatus", user?.id, order?.orderId],
    queryFn: () => paymentsApi.getOrder(order!.orderId),
    enabled: !!order?.orderId && !paid,
    refetchInterval: paid ? false : 3000,
    retry: false,
  });

  const current = statusQuery.data ?? order;

  const completePaidOrder = useCallback((paidOrder: PaymentOrder) => {
    if (handledPaid.current) return;
    handledPaid.current = true;
    setPaid(true);
    toast.success(`Thanh toán thành công! +${paidOrder.credits} lượt AI 🎉`);
    trackEvent("purchase_succeeded", {
      planCode,
      amountVnd: paidOrder.amountVnd,
      credits: paidOrder.credits,
      method: "sepay_qr",
    });
    userApi.getMe()
      .then((p) => { if (p) updateProfile(p); })
      .catch(() => {})
      .finally(() => {
        navigate(`/checkout/success?orderId=${paidOrder.orderId}`, {
          replace: true,
          state: { order: paidOrder, planName: planMeta.name },
        });
      });
    queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
  }, [navigate, planCode, planMeta.name, updateProfile, queryClient]);

  // Countdown theo expiresAt
  useEffect(() => {
    if (!order?.expiresAt) return;
    const target = new Date(order.expiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order?.expiresAt]);

  // Xử lý khi thanh toán thành công (chạy đúng 1 lần)
  useEffect(() => {
    if (current?.status === "PAID") {
      completePaidOrder(current);
    }
  }, [current, completePaidOrder]);

  useEffect(() => {
    if (!statusQuery.error || reportedStatusError.current) return;
    reportedStatusError.current = true;
    toast.error("Không kiểm tra được đơn hàng", {
      description: "Có thể bạn đang đăng nhập tài khoản khác với tài khoản đã tạo mã QR. Hãy đăng nhập đúng tài khoản rồi thử lại.",
    });
  }, [statusQuery.error]);

  const handleManualStatusCheck = async () => {
    if (!order?.orderId) return;
    const result = await statusQuery.refetch();
    if (result.data?.status === "PAID") {
      completePaidOrder(result.data);
      return;
    }
    if (result.error) {
      toast.error("Không kiểm tra được đơn hàng", {
        description: "Nếu vừa đổi tài khoản, hãy reload trang hoặc đăng nhập lại đúng tài khoản đã tạo mã QR.",
      });
      return;
    }
    toast.info("Chưa thấy thanh toán", {
      description: "Nếu SePay đã báo có tiền nhưng app chưa đổi, hãy kiểm tra cấu hình webhook.",
    });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const expired = remaining === 0 && !paid;
  const minutes = remaining != null ? Math.floor(remaining / 60) : 0;
  const seconds = remaining != null ? remaining % 60 : 0;

  const featureList = useMemo(() => planMeta.features, [planMeta]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <button
            onClick={() => navigate("/premium")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại chọn gói
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-5 gap-8"
          >
            {/* Payment panel */}
            <div className="md:col-span-3 space-y-6">
              <div>
                <h1 className="text-2xl font-bold font-display text-foreground">Thanh toán qua chuyển khoản</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Quét mã QR bằng app ngân hàng / MoMo / ZaloPay — lượt AI cộng tự động sau khi nhận tiền.
                </p>
              </div>

              {/* PAID state */}
              {paid && current ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card rounded-2xl border-2 border-green-500/40 p-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                    <PartyPopper className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold font-display text-foreground">Thanh toán thành công!</h2>
                  <p className="text-muted-foreground text-sm">
                    Đã cộng <span className="font-bold text-chip-orange">+{current.credits} lượt AI</span> vào tài khoản của bạn.
                  </p>
                  <Button variant="hero" className="w-full" size="lg" onClick={() => navigate("/planning")}>
                    Bắt đầu lên kế hoạch
                  </Button>
                </motion.div>
              ) : orderQuery.isLoading ? (
                <div className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
                  <p className="text-sm text-muted-foreground">Đang tạo mã thanh toán...</p>
                </div>
              ) : orderQuery.isError || !current ? (
                <div className="bg-card rounded-2xl border border-destructive/40 p-8 text-center space-y-4">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                  <p className="text-sm text-foreground">Không tạo được mã thanh toán. Vui lòng thử lại.</p>
                  <Button variant="soft" onClick={() => orderQuery.refetch()}>Thử lại</Button>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
                  {/* QR */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white rounded-2xl p-3 border border-border">
                      <img
                        src={current.qrUrl}
                        alt="Mã QR thanh toán"
                        className="w-56 h-56 object-contain"
                      />
                    </div>
                    {expired ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                        <AlertCircle className="w-4 h-4" /> Mã đã hết hạn
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-chip-orange" />
                        Đang chờ thanh toán
                        {remaining != null && (
                          <span className="font-mono font-semibold text-foreground">
                            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    )}
                    {expired && (
                      <Button variant="soft" size="sm" onClick={() => orderQuery.refetch()}>
                        Tạo mã mới
                      </Button>
                    )}
                  </div>

                  {/* Bank details */}
                  <div className="bg-muted rounded-xl p-4 space-y-3">
                    <Row label="Ngân hàng" value={current.bankName} />
                    <Row label="Số tài khoản" value={current.accountNumber} onCopy={() => copy(current.accountNumber, "số tài khoản")} mono />
                    <Row label="Chủ tài khoản" value={current.accountHolder} />
                    <Row label="Số tiền" value={`${formatVnd(current.amountVnd)}đ`} highlight />
                    <Row label="Nội dung CK" value={current.transferContent} onCopy={() => copy(current.transferContent, "nội dung")} mono />
                  </div>

                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    Vui lòng chuyển <span className="font-semibold">đúng số tiền</span> và <span className="font-semibold">giữ nguyên nội dung CK</span> để hệ thống cộng lượt tự động.
                  </p>

                  <Button
                    variant="soft"
                    className="w-full"
                    onClick={handleManualStatusCheck}
                    disabled={statusQuery.isFetching}
                  >
                    {statusQuery.isFetching ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra...</span>
                    ) : (
                      "Tôi đã chuyển khoản"
                    )}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Giao dịch xử lý qua cổng SePay
              </p>
            </div>

            {/* Order summary */}
            <div className="md:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4 sticky top-24">
                <h3 className="font-display font-bold text-foreground">Tóm tắt đơn hàng</h3>

                <div className="bg-chip-yellow-light rounded-xl p-4 space-y-1">
                  <p className="font-display font-bold text-foreground">{planMeta.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gradient">
                      {current ? formatVnd(current.amountVnd) : "—"}đ
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{current ? `${current.credits} lượt` : "gói"}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {featureList.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-chip-orange flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between font-bold font-display">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="text-gradient">{current ? formatVnd(current.amountVnd) : "—"}đ</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Lượt AI được cộng ngay sau khi hệ thống nhận được tiền (thường trong vài giây).
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, onCopy, mono, highlight }: {
  label: string;
  value: string;
  onCopy?: () => void;
  mono?: boolean;
  highlight?: boolean;
}) => (
  <div className="flex justify-between items-center gap-2">
    <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
    {onCopy ? (
      <button
        type="button"
        onClick={onCopy}
        className={`flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-chip-orange transition-colors text-right ${mono ? "font-mono" : ""}`}
      >
        {value} <Copy className="w-3.5 h-3.5 flex-shrink-0" />
      </button>
    ) : (
      <span className={`text-sm font-semibold text-right ${highlight ? "text-gradient font-bold" : "text-foreground"} ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    )}
  </div>
);

export default Checkout;
