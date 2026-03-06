import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Calendar, MapPin, Shield, ArrowLeft, Loader2, TrendingUp,
  Trash2, BarChart3, Plane, Search, Eye, FileText, Clock, Plus, Save, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

interface UserInfo {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  last_sign_in: string | null;
  provider: string;
  email_confirmed: boolean;
  trip_count: number;
}

interface TripInfo {
  id: string;
  destination: string;
  user_id: string;
  user_name: string;
  created_at: string;
  travelers: number | null;
  budget_level: number | null;
  styles: string[] | null;
  start_date: string | null;
  end_date: string | null;
}

interface AnalyticsData {
  chartData: { date: string; registrations: number; trips: number }[];
  topDestinations: { name: string; count: number }[];
  totalUsers: number;
  totalTrips: number;
}

interface ActivityLog {
  id: string;
  admin_user_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface SiteContent {
  id: string;
  content_key: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#f97316", "#14b8a6", "#eab308", "#6366f1"
];

const ACTION_LABELS: Record<string, string> = {
  view_users: "Xem danh sách người dùng",
  delete_trip: "Xóa chuyến đi",
  create_content: "Tạo nội dung",
  update_content: "Cập nhật nội dung",
  delete_content: "Xóa nội dung",
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [trips, setTrips] = useState<TripInfo[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [content, setContent] = useState<SiteContent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchTrip, setSearchTrip] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Content editor state
  const [editingContent, setEditingContent] = useState<Partial<SiteContent> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    const { data, error } = await supabase.functions.invoke("admin-users?action=check-role");
    if (error || !data?.isAdmin) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users");
    if (error) {
      setError("Không thể tải dữ liệu người dùng");
    } else {
      setUsers(data.users || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  };

  const fetchTrips = async () => {
    if (trips.length > 0) return;
    setTripsLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users?action=list-trips");
    if (!error && data) setTrips(data.trips || []);
    setTripsLoading(false);
  };

  const fetchAnalytics = async () => {
    if (analytics) return;
    setAnalyticsLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users?action=analytics");
    if (!error && data) setAnalytics(data);
    setAnalyticsLoading(false);
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users?action=logs");
    if (!error && data) setLogs(data.logs || []);
    setLogsLoading(false);
  };

  const fetchContent = async () => {
    setContentLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users?action=list-content");
    if (!error && data) setContent(data.content || []);
    setContentLoading(false);
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa chuyến đi này?")) return;
    const { error } = await supabase.functions.invoke("admin-users?action=delete-trip", {
      body: { trip_id: tripId },
    });
    if (error) {
      toast.error("Không thể xóa chuyến đi");
    } else {
      setTrips(prev => prev.filter(t => t.id !== tripId));
      toast.success("Đã xóa chuyến đi");
    }
  };

  const handleSaveContent = async () => {
    if (!editingContent?.content_key) {
      toast.error("Vui lòng nhập content key");
      return;
    }
    const { error } = await supabase.functions.invoke("admin-users?action=save-content", {
      body: {
        id: editingContent.id || undefined,
        content_key: editingContent.content_key,
        title: editingContent.title,
        body: editingContent.body,
        image_url: editingContent.image_url,
        is_active: editingContent.is_active ?? true,
        metadata: editingContent.metadata || {},
      },
    });
    if (error) {
      toast.error("Không thể lưu nội dung");
    } else {
      toast.success("Đã lưu nội dung");
      setEditingContent(null);
      fetchContent();
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm("Xóa nội dung này?")) return;
    const { error } = await supabase.functions.invoke("admin-users?action=delete-content", {
      body: { content_id: id },
    });
    if (error) {
      toast.error("Không thể xóa");
    } else {
      setContent(prev => prev.filter(c => c.id !== id));
      toast.success("Đã xóa");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "trips") fetchTrips();
    if (tab === "analytics") fetchAnalytics();
    if (tab === "logs") fetchLogs();
    if (tab === "content") fetchContent();
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
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

  const todayCount = users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length;
  const thisWeekCount = users.filter(u => new Date(u.created_at) >= new Date(Date.now() - 7 * 86400000)).length;
  const totalTrips = users.reduce((sum, u) => sum + u.trip_count, 0);

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredTrips = trips.filter(t =>
    t.destination.toLowerCase().includes(searchTrip.toLowerCase()) ||
    t.user_name.toLowerCase().includes(searchTrip.toLowerCase())
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Tổng người dùng", value: total, icon: Users, color: "text-primary" },
                { label: "Hôm nay", value: todayCount, icon: Calendar, color: "text-green-500" },
                { label: "Tuần này", value: thisWeekCount, icon: TrendingUp, color: "text-blue-500" },
                { label: "Tổng chuyến đi", value: totalTrips, icon: MapPin, color: "text-purple-500" },
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-6 flex-wrap h-auto gap-1">
                <TabsTrigger value="overview" className="gap-2"><Users className="w-4 h-4" /> Người dùng</TabsTrigger>
                <TabsTrigger value="trips" className="gap-2"><Plane className="w-4 h-4" /> Chuyến đi</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" /> Thống kê</TabsTrigger>
                <TabsTrigger value="content" className="gap-2"><FileText className="w-4 h-4" /> Nội dung</TabsTrigger>
                <TabsTrigger value="logs" className="gap-2"><Clock className="w-4 h-4" /> Nhật ký</TabsTrigger>
              </TabsList>

              {/* USERS TAB */}
              <TabsContent value="overview">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm theo tên hoặc email..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-10" />
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : error ? (
                  <div className="text-center py-20 text-destructive">{error}</div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Người dùng</TableHead>
                          <TableHead className="hidden sm:table-cell">Email</TableHead>
                          <TableHead className="hidden md:table-cell">Đăng ký</TableHead>
                          <TableHead className="hidden md:table-cell">Đăng nhập cuối</TableHead>
                          <TableHead className="text-center">Chuyến đi</TableHead>
                          <TableHead className="hidden sm:table-cell">Provider</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u, idx) => (
                          <TableRow key={u.user_id}>
                            <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                    {(u.display_name || u.email || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-foreground text-sm">{u.display_name || "Chưa đặt tên"}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {format(new Date(u.created_at), "dd/MM/yyyy", { locale: vi })}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {u.last_sign_in ? format(new Date(u.last_sign_in), "dd/MM/yyyy HH:mm", { locale: vi }) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={u.trip_count > 0 ? "default" : "secondary"} className="text-xs">{u.trip_count}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs capitalize">{u.provider}</Badge>
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
                    <Input placeholder="Tìm theo điểm đến hoặc người tạo..." value={searchTrip} onChange={e => setSearchTrip(e.target.value)} className="pl-10" />
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
                          <TableHead className="hidden sm:table-cell">Người tạo</TableHead>
                          <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
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
                                  {t.styles && t.styles.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {t.styles.slice(0, 2).map(s => (
                                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{t.user_name}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {format(new Date(t.created_at), "dd/MM/yyyy", { locale: vi })}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {t.start_date && t.end_date
                                ? `${format(new Date(t.start_date), "dd/MM")} - ${format(new Date(t.end_date), "dd/MM")}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs">{t.travelers || 1}</Badge>
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
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : analytics ? (
                  <div className="space-y-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-1">Đăng ký & Chuyến đi (30 ngày)</h3>
                      <p className="text-sm text-muted-foreground mb-6">Xu hướng hoạt động trong 30 ngày gần nhất</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} labelFormatter={v => `Ngày: ${v}`} />
                          <Line type="monotone" dataKey="registrations" name="Đăng ký" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="trips" name="Chuyến đi" stroke="#22c55e" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-1">Top địa điểm</h3>
                        <p className="text-sm text-muted-foreground mb-6">10 điểm đến được tạo nhiều nhất</p>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.topDestinations} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                            <Bar dataKey="count" name="Số lượng" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-1">Phân bố điểm đến</h3>
                        <p className="text-sm text-muted-foreground mb-6">Tỷ lệ chuyến đi theo địa điểm</p>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={analytics.topDestinations} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={11}>
                              {analytics.topDestinations.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </div>
                  </div>
                ) : null}
              </TabsContent>

              {/* CONTENT TAB */}
              <TabsContent value="content">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Quản lý nội dung</h3>
                  <Button size="sm" onClick={() => setEditingContent({ content_key: "", title: "", body: "", image_url: "", is_active: true })}>
                    <Plus className="w-4 h-4 mr-1" /> Thêm nội dung
                  </Button>
                </div>

                {/* Content editor */}
                {editingContent && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-foreground">{editingContent.id ? "Chỉnh sửa" : "Thêm mới"}</h4>
                      <Button variant="ghost" size="icon" onClick={() => setEditingContent(null)}><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Content Key</label>
                        <Input
                          placeholder="vd: homepage_banner, featured_destination"
                          value={editingContent.content_key || ""}
                          onChange={e => setEditingContent(prev => ({ ...prev!, content_key: e.target.value }))}
                          disabled={!!editingContent.id}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Tiêu đề</label>
                        <Input
                          placeholder="Tiêu đề nội dung"
                          value={editingContent.title || ""}
                          onChange={e => setEditingContent(prev => ({ ...prev!, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium text-foreground">Nội dung</label>
                        <Textarea
                          placeholder="Nội dung chi tiết..."
                          value={editingContent.body || ""}
                          onChange={e => setEditingContent(prev => ({ ...prev!, body: e.target.value }))}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">URL hình ảnh</label>
                        <Input
                          placeholder="https://..."
                          value={editingContent.image_url || ""}
                          onChange={e => setEditingContent(prev => ({ ...prev!, image_url: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editingContent.is_active ?? true}
                          onCheckedChange={v => setEditingContent(prev => ({ ...prev!, is_active: v }))}
                        />
                        <span className="text-sm text-foreground">Kích hoạt</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={handleSaveContent}><Save className="w-4 h-4 mr-1" /> Lưu</Button>
                    </div>
                  </motion.div>
                )}

                {contentLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Tiêu đề</TableHead>
                          <TableHead className="hidden sm:table-cell">Trạng thái</TableHead>
                          <TableHead className="hidden md:table-cell">Cập nhật</TableHead>
                          <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {content.map(c => (
                          <TableRow key={c.id}>
                            <TableCell><Badge variant="outline" className="text-xs font-mono">{c.content_key}</Badge></TableCell>
                            <TableCell className="text-sm text-foreground">{c.title || "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant={c.is_active ? "default" : "secondary"} className="text-xs">
                                {c.is_active ? "Bật" : "Tắt"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {format(new Date(c.updated_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setEditingContent(c)}>Sửa</Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteContent(c.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {content.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có nội dung nào</div>}
                  </motion.div>
                )}
              </TabsContent>

              {/* LOGS TAB */}
              <TabsContent value="logs">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Hành động</TableHead>
                          <TableHead className="hidden sm:table-cell">Đối tượng</TableHead>
                          <TableHead className="hidden md:table-cell">ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(l.created_at), "dd/MM HH:mm", { locale: vi })}
                            </TableCell>
                            <TableCell className="text-sm text-foreground">{l.admin_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {ACTION_LABELS[l.action] || l.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">{l.target_type}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                              {l.target_id ? l.target_id.slice(0, 8) + "..." : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {logs.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có nhật ký hoạt động</div>}
                  </motion.div>
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
