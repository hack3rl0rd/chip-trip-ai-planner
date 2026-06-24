import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, MapPin, Shield, ArrowLeft, Loader2,
  Trash2, BarChart3, Plane, Search, Eye,
  DollarSign, BrainCircuit, CreditCard, Zap,
  UserX, UserCheck, LogOut, Moon, Sun, MessageCircle, ShieldAlert, Menu, X,
  Heart, Star, ShoppingCart, Globe,
} from "lucide-react";
import { useAdminConversations } from "@/features/chat/useAdminChat";
import AdminReports from "@/features/admin/AdminReports";
import { useReportsPendingCount } from "@/features/moderation/useModeration";
import "./admin-theme.css";

function AdminChatNavLink() {
  const { data: conversations = [] } = useAdminConversations("OPEN");
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  return (
    <Link
      to="/admin/chat"
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      <span className="flex items-center gap-3">
        <MessageCircle className="w-4 h-4 shrink-0" />
        Tin nhắn
      </span>
      {totalUnread > 0 && (
        <span className="min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      )}
    </Link>
  );
}
import { useAuth } from "@/features/auth/useAuth";
import {
  adminApi,
  type AdminUserSummary,
  type AdminTripSummary,
  type AdminDashboard,
  type AdminAiUsageLog,
  type AdminAiCostByProviderMonth,
} from "@/integrations/api/modules/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTripStyles } from "@/lib/trip-mapper";
import { format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, FunnelChart, Funnel, LabelList } from "recharts";
import { toast } from "sonner";

type AdminTab = "overview" | "trips" | "ai-usage" | "analytics" | "moderation";

const NAV_ITEMS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "analytics",  label: "Thống kê",    icon: BarChart3 },
  { key: "overview",   label: "Người dùng",  icon: Users },
  { key: "trips",      label: "Chuyến đi",   icon: Plane },
  { key: "moderation", label: "Kiểm duyệt",  icon: ShieldAlert },
  { key: "ai-usage",   label: "AI Usage",    icon: Zap },
];

// Nhãn tiếng Việt cho event PostHog (src/lib/analytics.ts)
const EVENT_LABELS: Record<string, string> = {
  sign_up: "Đăng ký",
  login_google_succeeded: "Đăng nhập Google",
  generate_started: "Bắt đầu tạo plan",
  generate_succeeded: "Tạo plan thành công",
  generate_failed: "Tạo plan lỗi",
  trip_saved: "Lưu chuyến đi",
  booking_click: "Click đặt chỗ",
  publish: "Công khai trip",
  purchase_started: "Bắt đầu mua",
  purchase_succeeded: "Mua thành công",
  purchase_failed: "Mua thất bại",
  $pageview: "Lượt xem trang",
};

const FUNNEL_COLORS = ["#f97316", "#fb923c", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981"];

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, isAdmin: ctxIsAdmin, loading: authLoading, signOut } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [trips, setTrips] = useState<AdminTripSummary[]>([]);
  const [aiLogs, setAiLogs] = useState<AdminAiUsageLog[]>([]);
  const [aiSummary, setAiSummary] = useState<AdminAiCostByProviderMonth[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; registrations: number; trips: number }[]>([]);
  const [phPageviews, setPhPageviews] = useState<{ day: string; count: number }[]>([]);
  const [phEvents, setPhEvents] = useState<{ label: string; count: number }[]>([]);
  const [phFunnel, setPhFunnel] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [phLoading, setPhLoading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [searchTrip, setSearchTrip] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");
  const { data: pendingReports = 0 } = useReportsPendingCount(ctxIsAdmin);
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [editCredits, setEditCredits] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState<AdminUserSummary | null>(null);
  const [confirmDeleteTrip, setConfirmDeleteTrip] = useState<AdminTripSummary | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("chiptrip_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("chiptrip_theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && ctxIsAdmin) {
      fetchDashboard();
      fetchUsers();
      fetchChartData();
      fetchPostHog();
    } else if (!authLoading && user && !ctxIsAdmin) {
      setLoading(false);
    }
  }, [authLoading, user, ctxIsAdmin]);

  const fetchDashboard = async () => {
    try {
      const data = await adminApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({ size: 100 });
      setUsers(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách người dùng");
    }
    setLoading(false);
  };

  const fetchTrips = async () => {
    if (trips.length > 0) return;
    setTripsLoading(true);
    try {
      const data = await adminApi.getAllTrips({ size: 100 });
      setTrips(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách chuyến đi");
    }
    setTripsLoading(false);
  };

  const fetchAiUsage = async () => {
    setAiLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const from = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const [logs, summary] = await Promise.all([
        adminApi.getAiUsages({ size: 50 }),
        adminApi.getAiUsageSummary(from, today),
      ]);
      setAiLogs(logs);
      setAiSummary(summary);
    } catch (err) {
      console.error("Failed to fetch AI usage:", err);
    }
    setAiLoading(false);
  };

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const today = new Date();
      const from = format(subDays(today, 30), "yyyy-MM-dd");
      const to = format(today, "yyyy-MM-dd");
      const [userStats, tripStats] = await Promise.all([
        adminApi.getUserStats(from, to),
        adminApi.getTripStats(from, to),
      ]);
      const merged = userStats.map((u) => ({
        date: u.date,
        registrations: u.count,
        trips: tripStats.find((t) => t.date === u.date)?.count || 0,
      }));
      setChartData(merged);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
    }
    setChartLoading(false);
  };

  const fetchPostHog = async () => {
    setPhLoading(true);
    try {
      const [pv, events, funnel] = await Promise.all([
        adminApi.getAnalyticsPageviews(14),
        adminApi.getAnalyticsEvents(30),
        adminApi.getAnalyticsFunnel(30),
      ]);
      setPhPageviews(pv.map((r) => ({ day: r.date.slice(5), count: r.count })));
      setPhEvents(events.map((e) => ({ label: EVENT_LABELS[e.event] || e.event, count: e.count })));
      setPhFunnel(
        funnel.map((f, i) => ({
          name: EVENT_LABELS[f.event] || f.event,
          value: f.count,
          fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
        }))
      );
    } catch (err) {
      console.error("Failed to fetch PostHog analytics:", err);
    }
    setPhLoading(false);
  };

  const handleGrantCredits = async (userId: number) => {
    const amount = parseInt(editCredits);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Số lượng tín dụng không hợp lệ (phải > 0)");
      return;
    }
    try {
      await adminApi.grantCredits(userId, { amount });
      toast.success("Đã cộng tín dụng AI");
      setEditingUser(null);
      setEditCredits("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cộng tín dụng");
    }
  };

  const handleActivate = async (u: AdminUserSummary) => {
    try {
      await adminApi.toggleStatus(u.id, true);
      fetchUsers();
      toast.success("Đã kích hoạt tài khoản");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDeactivateConfirmed = async () => {
    if (!confirmDeactivate) return;
    try {
      await adminApi.toggleStatus(confirmDeactivate.id, false);
      setConfirmDeactivate(null);
      fetchUsers();
      toast.success("Đã vô hiệu hóa tài khoản");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi vô hiệu hóa");
    }
  };

  const handleDeleteTripConfirmed = async () => {
    if (!confirmDeleteTrip) return;
    try {
      await adminApi.deleteTrip(confirmDeleteTrip.id);
      setTrips((prev) => prev.filter((t) => t.id !== confirmDeleteTrip.id));
      setConfirmDeleteTrip(null);
      toast.success("Đã xóa chuyến đi");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa chuyến đi");
    }
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === "trips") fetchTrips();
    if (tab === "analytics") { fetchChartData(); fetchDashboard(); fetchPostHog(); }
    if (tab === "ai-usage") fetchAiUsage();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ctxIsAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Không có quyền truy cập</h1>
          <p className="text-muted-foreground mb-6">Tài khoản của bạn không có quyền admin</p>
          <Button onClick={() => navigate("/")}>Quay lại trang chủ</Button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      (u.fullName || "").toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredTrips = trips.filter(
    (t) => t.destination.toLowerCase().includes(searchTrip.toLowerCase())
  );

  const currentNav = NAV_ITEMS.find((n) => n.key === activeTab)!;

  return (
    <div className="admin-shell flex">
      {/* mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}
      {/* ── Left sidebar ── */}
      <aside className={`admin-aside w-64 shrink-0 flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border/70">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center shadow-warm">
              <MapPin className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="admin-title text-lg text-foreground">
              Chip<span className="admin-gradient-text">Trip</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground" aria-label="Đóng menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin badge */}
        <div className="px-5 py-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-chip-orange" />
            <span className="admin-eyebrow !text-chip-orange">Control Room</span>
          </div>
        </div>

        {/* Dashboard stats (mini) */}
        {dashboard && (
          <div className="px-5 py-3.5 border-b border-border/70 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
              <p className="admin-stat-num text-xl text-foreground">{dashboard.totalUsers.toLocaleString()}</p>
              <p className="admin-eyebrow mt-1 !text-[0.58rem]">Người dùng</p>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
              <p className="admin-stat-num text-xl text-foreground">{dashboard.totalTrips.toLocaleString()}</p>
              <p className="admin-eyebrow mt-1 !text-[0.58rem]">Chuyến đi</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto admin-scroll">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { handleTabChange(item.key); setSidebarOpen(false); }}
              data-active={activeTab === item.key}
              className="admin-nav-item"
            >
              <span className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </span>
              {item.key === "moderation" && pendingReports > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                  {pendingReports > 99 ? "99+" : pendingReports}
                </span>
              )}
            </button>
          ))}
          <AdminChatNavLink />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Trang chủ
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="h-16 bg-card/70 backdrop-blur-xl border-b border-border/70 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" aria-label="Mở menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="admin-icon-chip !w-9 !h-9 !rounded-xl" data-tone="ember"><currentNav.icon className="w-4 h-4" /></span>
              <div className="leading-tight">
                <p className="admin-eyebrow !text-[0.58rem]">Quản trị</p>
                <h1 className="admin-title text-base text-foreground">{currentNav.label}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                {(user?.fullName || user?.email || "A")[0].toUpperCase()}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* ── USERS TAB ── */}
            {activeTab === "overview" && (
              <>
                {/* Grant credits modal */}
                <AnimatePresence>
                  {editingUser && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => { setEditingUser(null); setEditCredits(""); }}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="font-semibold text-foreground mb-1">Cộng tín dụng AI</h3>
                        <p className="text-sm text-muted-foreground mb-2">{editingUser.email}</p>
                        <p className="text-sm mb-4">Hiện tại: <span className="font-bold text-foreground">{editingUser.aiCredits}</span></p>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label htmlFor="credits-input" className="text-sm font-medium text-foreground">Số tín dụng muốn cộng</label>
                            <Input
                              id="credits-input"
                              type="number"
                              placeholder="VD: 10"
                              value={editCredits}
                              onChange={(e) => setEditCredits(e.target.value)}
                              min="1"
                            />
                          </div>
                          <Button className="w-full" onClick={() => handleGrantCredits(editingUser.id)}>
                            <CreditCard className="w-4 h-4 mr-2" /> Cộng tín dụng
                          </Button>
                          <Button variant="ghost" className="w-full" onClick={() => { setEditingUser(null); setEditCredits(""); }}>
                            Huỷ
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Deactivate confirmation modal */}
                <AnimatePresence>
                  {confirmDeactivate && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setConfirmDeactivate(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                            <UserX className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Vô hiệu hóa tài khoản?</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Hành động này không thể hoàn tác tức thì</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Tài khoản sẽ bị khóa:</p>
                        <p className="text-sm font-medium text-foreground mb-1">{confirmDeactivate.fullName || "Chưa đặt tên"}</p>
                        <p className="text-xs text-muted-foreground mb-5">{confirmDeactivate.email}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 mb-4">
                          Người dùng sẽ bị đăng xuất ngay lập tức và không thể đăng nhập lại cho đến khi được kích hoạt trở lại.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => setConfirmDeactivate(null)}
                          >
                            Hủy
                          </Button>
                          <Button
                            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={handleDeactivateConfirmed}
                          >
                            <UserX className="w-4 h-4 mr-1.5" /> Vô hiệu hóa
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo tên hoặc email..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="pl-10"
                      aria-label="Tìm kiếm người dùng"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-card overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Người dùng</TableHead>
                          <TableHead className="hidden sm:table-cell">Email</TableHead>
                          <TableHead className="hidden md:table-cell">Đăng ký</TableHead>
                          <TableHead className="hidden lg:table-cell">Đăng nhập cuối</TableHead>
                          <TableHead className="text-center">AI Credits</TableHead>
                          <TableHead className="text-center">Trạng thái</TableHead>
                          <TableHead className="text-center">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u, idx) => (
                          <TableRow key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                            <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {(u.fullName || u.email)[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground text-sm">{u.fullName || "Chưa đặt tên"}</p>
                                    {u.role === "ROLE_ADMIN" && (
                                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0">Admin</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy", { locale: vi }) : "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {u.lastLoginAt ? format(new Date(u.lastLoginAt), "dd/MM/yyyy HH:mm", { locale: vi }) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => { setEditingUser(u); setEditCredits(""); }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                aria-label={`Cộng credits cho ${u.email}`}
                              >
                                <BrainCircuit className="w-3 h-3" /> {u.aiCredits}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
                                u.isActive
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                {u.isActive ? "Hoạt động" : "Vô hiệu"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => navigate(`/admin/users/${u.id}`)}
                                  aria-label={`Xem chi tiết ${u.email}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                {u.isActive ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                    onClick={() => setConfirmDeactivate(u)}
                                    aria-label={`Vô hiệu hóa tài khoản ${u.email}`}
                                  >
                                    <UserX className="w-3.5 h-3.5" /> Khóa
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 gap-1"
                                    onClick={() => handleActivate(u)}
                                    aria-label={`Kích hoạt tài khoản ${u.email}`}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" /> Kích hoạt
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => { setEditingUser(u); setEditCredits(""); }}
                                  aria-label={`Cộng tín dụng AI cho ${u.email}`}
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredUsers.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">Không tìm thấy người dùng nào</div>
                    )}
                  </motion.div>
                )}
              </>
            )}

            {/* ── TRIPS TAB ── */}
            {activeTab === "trips" && (
              <>
                {/* Delete trip confirmation modal */}
                <AnimatePresence>
                  {confirmDeleteTrip && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setConfirmDeleteTrip(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                            <Trash2 className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Xóa chuyến đi?</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Hành động này không thể hoàn tác</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Chuyến đi sẽ bị xóa vĩnh viễn:</p>
                        <p className="text-sm font-medium text-foreground">{confirmDeleteTrip.destination}</p>
                        {confirmDeleteTrip.userEmail && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Chủ chuyến: {confirmDeleteTrip.userFullName || "Chưa đặt tên"} · {confirmDeleteTrip.userEmail}
                          </p>
                        )}
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 my-4">
                          Toàn bộ ngày, hoạt động, checklist và lượt thích/bình luận của chuyến đi này sẽ bị xóa.
                        </p>
                        <div className="flex gap-2">
                          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDeleteTrip(null)}>
                            Hủy
                          </Button>
                          <Button
                            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={handleDeleteTripConfirmed}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" /> Xóa chuyến đi
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo điểm đến..."
                      value={searchTrip}
                      onChange={(e) => setSearchTrip(e.target.value)}
                      className="pl-10"
                      aria-label="Tìm kiếm chuyến đi"
                    />
                  </div>
                </div>
                {tripsLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-card overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Điểm đến</TableHead>
                          <TableHead>Chủ chuyến đi</TableHead>
                          <TableHead className="hidden sm:table-cell">Tạo lúc</TableHead>
                          <TableHead className="hidden md:table-cell">Thời gian</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Người đi</TableHead>
                          <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrips.map((t, idx) => {
                          const tripStyles = parseTripStyles(t.styles);
                          return (
                          <TableRow key={t.id}>
                            <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-medium text-foreground text-sm">{t.destination}</p>
                                  {tripStyles.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {tripStyles.slice(0, 3).map((s) => (
                                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {t.userId ? (
                                <button
                                  onClick={() => navigate(`/admin/users/${t.userId}`)}
                                  className="flex items-center gap-2 text-left group"
                                  aria-label={`Xem chủ chuyến đi ${t.userEmail}`}
                                >
                                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                                    {(t.userFullName || t.userEmail || "?")[0].toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                      {t.userFullName || "Chưa đặt tên"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{t.userEmail}</p>
                                  </div>
                                </button>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {t.createdAt ? format(new Date(t.createdAt), "dd/MM/yyyy", { locale: vi }) : "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {t.dateStart && t.dateEnd
                                ? `${format(new Date(t.dateStart), "dd/MM")} - ${format(new Date(t.dateEnd), "dd/MM")}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs">{t.peopleCount || 1}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(`/result?id=${t.id}`, "_blank")}
                                  aria-label="Xem chi tiết chuyến đi"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDeleteTrip(t)}
                                  aria-label="Xóa chuyến đi"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredTrips.length === 0 && !tripsLoading && (
                      <div className="text-center py-12 text-muted-foreground">Không có chuyến đi nào</div>
                    )}
                  </motion.div>
                )}
              </>
            )}

            {/* ── AI USAGE TAB ── */}
            {activeTab === "ai-usage" && (
              aiLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-6">
                  {aiSummary.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-1">Chi phí theo provider (90 ngày)</h3>
                      <p className="text-sm text-muted-foreground mb-6">Tổng hợp theo provider và tháng</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={aiSummary}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }}
                            formatter={(v: number) => [`$${Number(v).toFixed(4)}`, "Chi phí USD"]}
                          />
                          <Bar dataKey="totalCostUsd" name="Chi phí USD" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {aiSummary.map((s, i) => (
                          <div key={i} className="bg-muted/50 rounded-xl p-3 text-sm">
                            <p className="font-semibold text-foreground">{s.provider}</p>
                            <p className="text-muted-foreground text-xs">{s.month}</p>
                            <p className="font-bold text-primary mt-1">${Number(s.totalCostUsd).toFixed(4)}</p>
                            <p className="text-xs text-muted-foreground">{s.usageCount} lần gọi</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <h3 className="font-semibold text-foreground">Log gần nhất (50 entries)</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Người dùng</TableHead>
                          <TableHead className="hidden sm:table-cell">Provider</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Tokens In</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Tokens Out</TableHead>
                          <TableHead className="text-right">Chi phí (USD)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: vi })}
                            </TableCell>
                            <TableCell className="text-sm">
                              <p className="font-medium text-foreground">{log.userFullName || "—"}</p>
                              <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="secondary" className="text-xs">{log.provider}</Badge>
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell text-xs text-muted-foreground">
                              {log.tokensIn.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell text-xs text-muted-foreground">
                              {log.tokensOut.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm font-mono">
                              ${Number(log.costUsd).toFixed(4)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {aiLogs.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">Chưa có log AI usage</div>
                    )}
                  </motion.div>
                </div>
              )
            )}

            {/* ── MODERATION TAB ── */}
            {activeTab === "moderation" && <AdminReports />}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === "analytics" && (
              <>
                {/* Dashboard stat cards */}
                {dashboard && (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    {[
                      { label: "Tổng người dùng", value: dashboard.totalUsers.toLocaleString(), icon: Users, tone: "ember" },
                      { label: "Tổng chuyến đi", value: dashboard.totalTrips.toLocaleString(), icon: Plane, tone: "ember" },
                      { label: "AI calls tháng này", value: dashboard.aiCallsThisMonth.toLocaleString(), icon: BrainCircuit, tone: "ember" },
                      { label: "Chi phí AI (USD)", value: `$${Number(dashboard.aiCostUsdThisMonth).toFixed(2)}`, icon: DollarSign, tone: "gold" },
                      { label: "Trip public", value: (dashboard.publishedTrips ?? 0).toLocaleString(), icon: Globe, tone: "neutral" },
                      { label: "Likes", value: (dashboard.totalLikes ?? 0).toLocaleString(), icon: Heart, tone: "neutral" },
                      { label: "Comments", value: (dashboard.totalComments ?? 0).toLocaleString(), icon: MessageCircle, tone: "neutral" },
                      { label: "Reviews", value: (dashboard.totalReviews ?? 0).toLocaleString(), icon: Star, tone: "neutral" },
                      { label: "Orders", value: (dashboard.totalOrders ?? 0).toLocaleString(), icon: ShoppingCart, tone: "gold" },
                      { label: "Doanh thu VND", value: `${Number(dashboard.revenueVndThisMonth ?? 0).toLocaleString("vi-VN")} VND`, icon: CreditCard, tone: "gold" },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
                        className="admin-card admin-card-hover admin-card-keyline p-5"
                      >
                        <span className="admin-icon-chip mb-3" data-tone={stat.tone === "neutral" ? undefined : stat.tone}>
                          <stat.icon className="w-5 h-5" />
                        </span>
                        <p className="admin-stat-num text-3xl text-foreground">{stat.value}</p>
                        <p className="admin-eyebrow mt-2 !text-[0.6rem]">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
                {chartLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : chartData.length > 0 ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Đăng ký & Chuyến đi (30 ngày)</h3>
                    <p className="text-sm text-muted-foreground mb-6">Xu hướng hoạt động trong 30 ngày gần nhất</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }}
                          labelFormatter={(v) => `Ngày: ${v}`}
                        />
                        <Line type="monotone" dataKey="registrations" name="Đăng ký" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="trips" name="Chuyến đi" stroke="#22c55e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">Không có dữ liệu thống kê</div>
                )}

                {/* ── PostHog: Funnel chuyển đổi ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6 mt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Funnel chuyển đổi (30 ngày)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Số người dùng đạt mỗi bước — nguồn PostHog</p>
                  {phLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : phFunnel.some((f) => f.value > 0) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                      <ResponsiveContainer width="100%" height={320}>
                        <FunnelChart>
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                          <Funnel dataKey="value" data={phFunnel} isAnimationActive>
                            <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" className="text-[11px]" />
                            <LabelList position="left" fill="hsl(var(--muted-foreground))" stroke="none" dataKey="value" />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {phFunnel.map((f, i) => {
                          const base = phFunnel[0].value || 1;
                          const pct = Math.round((f.value / base) * 100);
                          return (
                            <div key={f.name} className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.fill }} />
                              <span className="text-sm text-foreground flex-1">{i + 1}. {f.name}</span>
                              <span className="text-sm font-semibold text-foreground">{f.value.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Chưa có dữ liệu funnel — kiểm tra backend đã cấu hình POSTHOG_PERSONAL_KEY (phx_…) và có event.
                    </div>
                  )}
                </motion.div>

                {/* ── PostHog: Pageviews + Events ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6">
                    <h3 className="text-base font-semibold text-foreground mb-1">Lượt xem trang (14 ngày)</h3>
                    <p className="text-sm text-muted-foreground mb-6">$pageview theo ngày — PostHog</p>
                    {phLoading ? (
                      <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : phPageviews.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={phPageviews}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                          <Line type="monotone" dataKey="count" name="Lượt xem" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground text-sm">Chưa có dữ liệu</div>
                    )}
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6">
                    <h3 className="text-base font-semibold text-foreground mb-1">Sự kiện theo loại (30 ngày)</h3>
                    <p className="text-sm text-muted-foreground mb-6">Tổng số lần phát sinh mỗi event — PostHog</p>
                    {phLoading ? (
                      <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : phEvents.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={phEvents} layout="vertical" margin={{ left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                          <Bar dataKey="count" name="Số lần" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground text-sm">Chưa có dữ liệu</div>
                    )}
                  </motion.div>
                </div>
              </>
            )}

          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminUsers;
