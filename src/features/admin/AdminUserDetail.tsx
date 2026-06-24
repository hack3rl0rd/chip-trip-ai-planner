import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Shield, MapPin, Plane, BrainCircuit, CreditCard,
  Crown, Wallet, KeyRound, Mail, MailCheck, Calendar, Users, CheckCircle2, Clock,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi, type AdminUserDetail as AdminUserDetailData } from "@/integrations/api/modules/admin";
import { parseTripStyles } from "@/lib/trip-mapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import "./admin-theme.css";

const fmtVnd = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString("vi-VN")} ₫`;

const fmtDate = (v: string | null | undefined, withTime = false) =>
  v ? format(new Date(v), withTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: vi }) : "—";

const AdminUserDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminUserDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (authLoading || !user || !isAdmin || !id) return;
    let active = true;
    setLoading(true);
    adminApi
      .getUserDetail(Number(id))
      .then((d) => active && setData(d))
      .catch((err) => toast.error(err.response?.data?.message || "Không thể tải chi tiết người dùng"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authLoading, user, isAdmin, id]);

  if (authLoading) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-shell flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Không có quyền truy cập</h1>
          <p className="text-muted-foreground mb-6">Tài khoản của bạn không có quyền admin</p>
          <Button onClick={() => navigate("/")}>Quay lại trang chủ</Button>
        </div>
      </div>
    );
  }

  const premium = data?.payment?.premium ?? false;

  return (
    <div className="admin-shell">
      {/* Top bar */}
      <header className="h-16 bg-card/70 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
        <Link
          to="/admin/users"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Danh sách người dùng
        </Link>
        <span className="admin-title text-base text-foreground">Chi tiết người dùng</span>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-32 text-muted-foreground">Không tìm thấy người dùng</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* ── Profile header ── */}
            <div className="admin-card admin-card-keyline p-6">
              <div className="flex items-start gap-4">
                {data.avatarUrl ? (
                  <img src={data.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                    {(data.fullName || data.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="admin-title text-xl text-foreground truncate">{data.fullName || "Chưa đặt tên"}</h1>
                    {data.role === "ROLE_ADMIN" && (
                      <Badge className="bg-primary/15 text-primary border-0">Admin</Badge>
                    )}
                    {premium && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
                        <Crown className="w-3 h-3" /> Premium
                      </Badge>
                    )}
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                        data.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {data.isActive ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5" /> {data.email}
                    {data.emailVerified ? (
                      <MailCheck className="w-3.5 h-3.5 text-green-600" aria-label="Email đã xác thực" />
                    ) : null}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Đăng ký {fmtDate(data.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Đăng nhập cuối {fmtDate(data.lastLoginAt, true)}
                    </span>
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" /> {data.activeSessionCount} phiên đang hoạt động
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "AI Credits", value: data.aiCredits.toLocaleString("vi-VN"), icon: BrainCircuit, tone: "ember" },
                { label: "Chuyến đi", value: (data.trips?.length ?? 0).toLocaleString("vi-VN"), icon: Plane, tone: "ember" },
                { label: "Tổng chi tiêu", value: fmtVnd(data.payment?.totalSpentVnd), icon: Wallet, tone: "gold" },
                { label: "Đơn đã thanh toán", value: (data.payment?.paidOrderCount ?? 0).toLocaleString("vi-VN"), icon: CreditCard, tone: "gold" },
              ].map((stat) => (
                <div key={stat.label} className="admin-card admin-card-hover admin-card-keyline p-5">
                  <span className="admin-icon-chip mb-3" data-tone={stat.tone}><stat.icon className="w-5 h-5" /></span>
                  <p className="admin-stat-num text-2xl text-foreground truncate">{stat.value}</p>
                  <p className="admin-eyebrow mt-2 !text-[0.6rem]">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* ── Premium / Payment ── */}
            <div className="admin-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-foreground">Gói & Thanh toán</h3>
                {premium ? (
                  <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    {data.payment?.totalCreditsPurchased.toLocaleString("vi-VN")} credits đã mua
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-auto">Chưa nâng cấp</Badge>
                )}
              </div>
              {data.payment && data.payment.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Gói</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Credits</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="hidden md:table-cell">Tạo lúc</TableHead>
                      <TableHead className="hidden lg:table-cell">Thanh toán</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payment.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{o.orderCode}</TableCell>
                        <TableCell className="text-sm font-medium text-foreground">{o.planCode}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmtVnd(o.amountVnd)}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell text-sm text-muted-foreground">{o.credits}</TableCell>
                        <TableCell className="text-center">
                          {o.status === "PAID" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" /> Đã thanh toán
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Clock className="w-3 h-3" /> Chờ
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{fmtDate(o.createdAt, true)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(o.paidAt, true)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">Người dùng chưa có đơn hàng nào</div>
              )}
            </div>

            {/* ── Trips ── */}
            <div className="admin-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Chuyến đi ({data.trips?.length ?? 0})</h3>
              </div>
              {data.trips && data.trips.length > 0 ? (
                <div className="divide-y divide-border">
                  {data.trips.map((t) => {
                    const styles = parseTripStyles(t.styles);
                    return (
                      <button
                        key={t.id}
                        onClick={() => window.open(`/result?id=${t.id}`, "_blank")}
                        className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{t.title || t.destination}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{t.destination}</span>
                            {styles.slice(0, 3).map((s) => (
                              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0 hidden sm:block">
                          <p>
                            {t.dateStart && t.dateEnd
                              ? `${format(new Date(t.dateStart), "dd/MM")} - ${format(new Date(t.dateEnd), "dd/MM")}`
                              : "—"}
                          </p>
                          <p className="flex items-center justify-end gap-1 mt-0.5">
                            <Users className="w-3 h-3" /> {t.peopleCount || 1} · {fmtVnd(t.budgetVnd)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">Người dùng chưa tạo chuyến đi nào</div>
              )}
            </div>

            {/* ── AI usage ── */}
            <div className="admin-card admin-card-keyline p-6">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-foreground">Sử dụng AI</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Số lần gọi", value: (data.aiUsage?.totalCount ?? 0).toLocaleString("vi-VN") },
                  { label: "Tokens In", value: (data.aiUsage?.totalTokensIn ?? 0).toLocaleString("vi-VN") },
                  { label: "Tokens Out", value: (data.aiUsage?.totalTokensOut ?? 0).toLocaleString("vi-VN") },
                  { label: "Chi phí (USD)", value: `$${Number(data.aiUsage?.totalCostUsd ?? 0).toFixed(4)}` },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="admin-stat-num text-lg text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AdminUserDetail;
