import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Lock, Check, Shield, Smartphone, Building2, QrCode, Copy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { addCredits } from "@/lib/trip-data";

const planDetails: Record<string, { name: string; price: string; period: string; credits: number; features: string[] }> = {
  premium: {
    name: "Premium",
    price: "49,000",
    period: "/gói",
    credits: 1,
    features: ["1 lượt tạo lịch trình AI", "Lịch trình chi tiết theo giờ", "Đề xuất thay thế địa điểm", "Export PDF + Ảnh"],
  },
  pro: {
    name: "Pro Traveler",
    price: "109,000",
    period: "/gói",
    credits: 3,
    features: ["3 lượt tạo lịch trình AI", "Tất cả tính năng Premium", "Chia sẻ & lên kế hoạch nhóm", "Chia tiền nhóm tự động", "Hỗ trợ ưu tiên 24/7"],
  },
};

type PaymentMethod = "card" | "momo" | "zalopay" | "bank";

const paymentMethods = [
  { id: "card" as const, label: "Thẻ ngân hàng", icon: CreditCard, desc: "Visa, Mastercard, JCB" },
  { id: "momo" as const, label: "MoMo", icon: Smartphone, desc: "Ví điện tử MoMo", color: "hsl(330, 80%, 55%)" },
  { id: "zalopay" as const, label: "ZaloPay", icon: Smartphone, desc: "Ví điện tử ZaloPay", color: "hsl(210, 90%, 50%)" },
  { id: "bank" as const, label: "Chuyển khoản", icon: Building2, desc: "Chuyển khoản ngân hàng" },
];

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get("plan") || "premium";
  const plan = planDetails[planKey] || planDetails.premium;

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCard = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const delay = method === "bank" ? 1500 : 2000;
    setTimeout(() => {
      setProcessing(false);
      // Add credits to user account
      addCredits(plan.credits);
      if (method === "bank") {
        toast.success("Đã ghi nhận! Chúng tôi sẽ xác nhận khi nhận được tiền 🎉");
      } else {
        toast.success(`Đã nâng cấp ${plan.name}! +${plan.credits} lượt AI 🎉`);
      }
      navigate("/planning");
    }, delay);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-5 gap-8"
          >
            {/* Payment Form */}
            <div className="md:col-span-3 space-y-6">
              <button
                onClick={() => navigate("/premium")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại chọn gói
              </button>

              <div>
                <h1 className="text-2xl font-bold font-display text-foreground">Thanh toán</h1>
                <p className="text-muted-foreground text-sm mt-1">Chọn phương thức thanh toán để nâng cấp gói {plan.name}</p>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      method === m.id
                        ? "border-chip-orange bg-chip-yellow-light shadow-warm"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <m.icon className="w-5 h-5" style={m.color ? { color: m.color } : undefined} />
                    <span className="text-xs font-semibold text-foreground">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{m.desc}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {/* Card Form */}
                  {method === "card" && (
                    <motion.div
                      key="card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-card rounded-2xl border border-border p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2 text-foreground font-semibold font-display">
                        <CreditCard className="w-5 h-5 text-chip-orange" />
                        Thông tin thẻ
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Tên trên thẻ</Label>
                        <Input id="name" placeholder="NGUYEN VAN A" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} required className="uppercase" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="card">Số thẻ</Label>
                        <Input id="card" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} required maxLength={19} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Ngày hết hạn</Label>
                          <Input id="expiry" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} required maxLength={5} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input id="cvv" placeholder="123" type="password" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} required maxLength={3} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* MoMo */}
                  {method === "momo" && (
                    <motion.div
                      key="momo"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-card rounded-2xl border border-border p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2 font-semibold font-display" style={{ color: "hsl(330, 80%, 55%)" }}>
                        <Smartphone className="w-5 h-5" />
                        Thanh toán qua MoMo
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="momo-phone">Số điện thoại MoMo</Label>
                        <Input id="momo-phone" placeholder="09xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))} required />
                      </div>

                      <div className="bg-muted rounded-xl p-4 text-center space-y-2">
                        <QrCode className="w-16 h-16 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Hoặc quét mã QR bằng app MoMo</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border">
                          <span className="text-xs font-mono text-foreground">CHIPTRIP-{planKey.toUpperCase()}-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">Bạn sẽ nhận thông báo xác nhận trên app MoMo. Nhấn xác nhận để hoàn tất thanh toán.</p>
                    </motion.div>
                  )}

                  {/* ZaloPay */}
                  {method === "zalopay" && (
                    <motion.div
                      key="zalopay"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-card rounded-2xl border border-border p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2 font-semibold font-display" style={{ color: "hsl(210, 90%, 50%)" }}>
                        <Smartphone className="w-5 h-5" />
                        Thanh toán qua ZaloPay
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zalo-phone">Số điện thoại ZaloPay</Label>
                        <Input id="zalo-phone" placeholder="09xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))} required />
                      </div>

                      <div className="bg-muted rounded-xl p-4 text-center space-y-2">
                        <QrCode className="w-16 h-16 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Hoặc quét mã QR bằng app ZaloPay</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border">
                          <span className="text-xs font-mono text-foreground">CHIPTRIP-{planKey.toUpperCase()}-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">Mở app ZaloPay và xác nhận thanh toán để hoàn tất.</p>
                    </motion.div>
                  )}

                  {/* Bank Transfer */}
                  {method === "bank" && (
                    <motion.div
                      key="bank"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-card rounded-2xl border border-border p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2 text-foreground font-semibold font-display">
                        <Building2 className="w-5 h-5 text-chip-orange" />
                        Chuyển khoản ngân hàng
                      </div>

                      <div className="bg-muted rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Ngân hàng</span>
                          <span className="text-sm font-semibold text-foreground">Vietcombank</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Số tài khoản</span>
                          <button type="button" onClick={() => copyToClipboard("1234567890123")} className="flex items-center gap-1.5 text-sm font-mono font-semibold text-foreground hover:text-chip-orange transition-colors">
                            1234567890123 <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Chủ tài khoản</span>
                          <span className="text-sm font-semibold text-foreground">CONG TY CHIP TRIP</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Số tiền</span>
                          <span className="text-sm font-bold text-gradient">{plan.price}đ</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Nội dung CK</span>
                          <button type="button" onClick={() => copyToClipboard(`CHIPTRIP ${planKey.toUpperCase()}`)} className="flex items-center gap-1.5 text-sm font-mono font-semibold text-foreground hover:text-chip-orange transition-colors">
                            CHIPTRIP {planKey.toUpperCase()} <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-muted rounded-xl p-4 text-center space-y-2">
                        <QrCode className="w-20 h-20 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Quét mã QR để chuyển khoản nhanh</p>
                      </div>

                      <p className="text-xs text-muted-foreground">Gói sẽ được kích hoạt trong vòng 5-15 phút sau khi chúng tôi xác nhận giao dịch.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={processing}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                      Đang xử lý...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {method === "bank" ? `Đã chuyển khoản ${plan.price}đ` : `Thanh toán ${plan.price}đ`}
                    </span>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Thanh toán được bảo mật bởi SSL 256-bit
                </p>
              </form>
            </div>

            {/* Order Summary */}
            <div className="md:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4 sticky top-24">
                <h3 className="font-display font-bold text-foreground">Tóm tắt đơn hàng</h3>

                <div className="bg-chip-yellow-light rounded-xl p-4 space-y-1">
                  <p className="font-display font-bold text-foreground">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gradient">{plan.price}đ</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-chip-orange flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gói {plan.name}</span>
                    <span className="text-foreground">{plan.price}đ</span>
                  </div>
                  <div className="flex justify-between font-bold font-display">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="text-gradient">{plan.price}đ</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Gói lượt AI sẽ được cộng ngay sau khi thanh toán thành công.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
