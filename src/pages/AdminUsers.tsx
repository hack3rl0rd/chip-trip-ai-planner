import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Mail, Calendar, MapPin, Shield, ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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
  travel_preferences: string[] | null;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
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
    fetchUsers();
  }, [user]);

  if (authLoading) return null;

  const todayCount = users.filter(u => {
    const d = new Date(u.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const thisWeekCount = users.filter(u => {
    const d = new Date(u.created_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  const totalTrips = users.reduce((sum, u) => sum + u.trip_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-chip-orange" /> Thống kê người dùng
            </h1>
            <p className="text-muted-foreground mb-8">Quản lý và theo dõi tài khoản người dùng ChipTrip AI</p>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Tổng người dùng", value: total, icon: Users, color: "text-chip-orange" },
                { label: "Hôm nay", value: todayCount, icon: Calendar, color: "text-green-500" },
                { label: "Tuần này", value: thisWeekCount, icon: TrendingUp, color: "text-blue-500" },
                { label: "Tổng chuyến đi", value: totalTrips, icon: MapPin, color: "text-purple-500" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-5 shadow-card"
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Users table */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-chip-orange" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-destructive">{error}</div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
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
                    {users.map((u, idx) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chip-orange to-chip-yellow flex items-center justify-center text-xs font-bold text-white">
                                {(u.display_name || u.email || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground text-sm">{u.display_name || "Chưa đặt tên"}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">{u.email || "—"}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(u.created_at), "dd/MM/yyyy", { locale: vi })}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {u.last_sign_in ? format(new Date(u.last_sign_in), "dd/MM/yyyy HH:mm", { locale: vi }) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.trip_count > 0 ? "default" : "secondary"} className="text-xs">
                            {u.trip_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">{u.provider}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
