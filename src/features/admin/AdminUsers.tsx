import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Calendar, MapPin, Shield, ArrowLeft, Loader2, TrendingUp,
  Trash2, BarChart3, Plane, Search, Eye, FileText, Clock, Plus, Save, X,
  DollarSign, BrainCircuit, CreditCard
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi, type AdminUserSummary, type AdminTripSummary, type AdminDashboard } from "@/integrations/api/modules/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { toast } from "sonner";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, isAdmin: ctxIsAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [trips, setTrips] = useState<AdminTripSummary[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; registrations: number; trips: number }[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [searchTrip, setSearchTrip] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [editCredits, setEditCredits] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && ctxIsAdmin) {
      fetchDashboard();
      fetchUsers();
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

  const handleGrantCredits = async (userId: number) => {
    const credits = parseInt(editCredits);
    if (isNaN(credits) || credits <= 0) {
      toast.error("Số lượng tín dụng không hợp lệ");
      return;
    }
    try {
      await adminApi.grantCredits(userId, { credits });
      toast.success("Đã cộng tín dụng AI");
      setEditingUser(null);
      setEditCredits("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cộng tín dụng");
    }
  };

  const handleToggleUserActive = async (u: AdminUserSummary) => {
    try {
      if (u.isActive) {
        await adminApi.deactivateUser(u.userId);
      } else {
        await adminApi.activateUser(u.userId);
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDeleteTrip = async (tripId: number) => {
    if (!confirm("Bạn chắc chắn muốn xóa chuyến đi này?")) return;
    try {
      await adminApi.deleteTrip(tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      toast.success("Đã xóa chuyến đi");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa chuyến đi");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "trips") fetchTrips();
    if (tab === "analytics") { fetchChartData(); fetchDashboard(); }
  };

  if (authLoading || (!ctxIsAdmin && user)) {
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
    (t) =>
      t.destination.toLowerCase().includes(searchTrip.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" /> Trang quản trị Admin
            </h1>
            <p className="text-muted-foreground mb-8">Quản lý toàn diện hệ thống ChipTrip AI</p>

            {/* Stats cards */}
            {dashboard && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Tổng người dùng", value: dashboard.totalUsers.toLocaleString(), icon: Users, color: "text-primary" },
                  { label: "Tổng chuyến đi", value: dashboard.totalTrips.toLocaleString(), icon: Plane, color: "text-green-500" },
                  { label: "AI calls tháng này", value: dashboard.aiCallsThisMonth.toLocaleString(), icon: BrainCircuit, color: "text-blue-500" },
                  { label: "Chi phí AI (USD)", value: `$${Number(dashboard.aiCostUsdThisMonth).toFixed(2)}`, icon: DollarSign, color: "text-purple-500" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-card rounded-2xl border border-border p-5 shadow-sm"
                  >
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-6 flex-wrap h-auto gap-1">
                <TabsTrigger value="overview" className="gap-2"><Users className="w-4 h-4" /> Người dùng</TabsTrigger>
                <TabsTrigger value="trips" className="gap-2"><Plane className="w-4 h-4" /> Chuyến đi</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" /> Thống kê</TabsTrigger>
              </TabsList>

              {/* USERS TAB */}
              <TabsContent value="overview">
                {/* Edit user modal */}
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
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-foreground">Cộng tín dụng AI</h3>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(null); setEditCredits(""); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{editingUser.email}</p>
                        <p className="text-sm mb-4">Tín dụng hiện tại: <span className="font-bold text-foreground">{editingUser.aiCredits}</span></p>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Số tín dụng muốn cộng</label>
                            <Input
                              type="number"
                              placeholder="VD: 10"
                              value={editCredits}
                              onChange={(e) => setEditCredits(e.target.value)}
                              min="1"
                            />
                          </div>
                          <Button className="w-full" onClick={() => handleGrantCredits(editingUser.userId)}>
                            <CreditCard className="w-4 h-4 mr-2" /> Cộng tín dụng
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm theo tên hoặc email..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} className="pl-10" />
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
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
                          <TableRow key={u.userId}>
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
                                    {u.role === "ADMIN" && (
                                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0">
                                        Admin
                                      </Badge>
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
                              >
                                <BrainCircuit className="w-3 h-3" /> {u.aiCredits}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => handleToggleUserActive(u)}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                                  u.isActive
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                {u.isActive ? "Hoạt động" : "Vô hiệu"}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => { setEditingUser(u); setEditCredits(""); }}
                                  title="Cộng tín dụng AI"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredUsers.length === 0 && <div className="text-center py-12 text-muted-foreground">Không tìm thấy người dùng nào</div>}
                  </motion.div>
                )}
              </TabsContent>

              {/* TRIPS TAB */}
              <TabsContent value="trips">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm theo điểm đến..." value={searchTrip} onChange={(e) => setSearchTrip(e.target.value)} className="pl-10" />
                  </div>
                </div>
                {tripsLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Điểm đến</TableHead>
                          <TableHead className="hidden sm:table-cell">Ngày tạo</TableHead>
                          <TableHead className="hidden md:table-cell">Thời gian</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Người đi</TableHead>
                          <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrips.map((t, idx) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-medium text-foreground text-sm">{t.destination}</p>
                                  {t.styles && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {(t.styles || "").split(",").slice(0, 2).map((s) => (
                                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s.trim()}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/result?id=${t.id}`, "_blank")}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTrip(t.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredTrips.length === 0 && !tripsLoading && <div className="text-center py-12 text-muted-foreground">Không có chuyến đi nào</div>}
                  </motion.div>
                )}
              </TabsContent>

              {/* ANALYTICS TAB */}
              <TabsContent value="analytics">
                {chartLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : chartData.length > 0 ? (
                  <div className="space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-1">Đăng ký & Chuyến đi (30 ngày)</h3>
                      <p className="text-sm text-muted-foreground mb-6">Xu hướng hoạt động trong 30 ngày gần nhất</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} labelFormatter={(v) => `Ngày: ${v}`} />
                          <Line type="monotone" dataKey="registrations" name="Đăng ký" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="trips" name="Chuyến đi" stroke="#22c55e" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">Không có dữ liệu thống kê</div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
