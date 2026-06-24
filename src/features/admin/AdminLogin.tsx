import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, Loader2, Eye, EyeOff, ArrowLeft, Plane, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, authStorage } from "@/integrations/api";
import { toast } from "sonner";
import "./admin-theme.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      const authResponse = await authApi.login({ email, password });

      if (authResponse.role !== "ADMIN") {
        authStorage.clear();
        toast.error("Tài khoản này không có quyền admin");
        setLoading(false);
        return;
      }

      authStorage.setAccessToken(authResponse.accessToken);
      authStorage.setRefreshToken(authResponse.refreshToken);
      authStorage.setUser(authResponse);
      toast.success("Đăng nhập admin thành công!");
      navigate("/admin/users");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Email hoặc mật khẩu không đúng";
      toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="admin-shell grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel (editorial side) ── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16">
        {/* layered ember glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(80% 60% at 20% 15%, hsl(var(--chip-orange) / 0.22), transparent 60%), radial-gradient(70% 60% at 90% 95%, hsl(var(--chip-yellow) / 0.16), transparent 55%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="bg-gradient-accent w-9 h-9 rounded-xl flex items-center justify-center shadow-warm">
            <MapPin className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="admin-title text-xl text-foreground">
            Chip<span className="admin-gradient-text">Trip</span>
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="admin-eyebrow mb-5">Bảng điều khiển quản trị</p>
          <h1 className="admin-title text-4xl xl:text-5xl text-foreground leading-[1.08]">
            Điều hành mọi
            <br />
            <span className="admin-gradient-text">hành trình</span> từ một nơi.
          </h1>
          <p className="font-body text-muted-foreground mt-6 text-[15px] leading-relaxed">
            Người dùng, chuyến đi, kiểm duyệt nội dung và chi phí AI — gói gọn trong
            một trung tâm vận hành duy nhất.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-muted-foreground">
          <span className="flex items-center gap-2 text-sm">
            <Plane className="w-4 h-4 text-chip-orange" /> Vận hành chuyến đi
          </span>
          <span className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-chip-orange" /> Kiểm duyệt an toàn
          </span>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* mobile brand mark */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="bg-gradient-accent w-9 h-9 rounded-xl flex items-center justify-center shadow-warm">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="admin-title text-xl text-foreground">
              Chip<span className="admin-gradient-text">Trip</span>
            </span>
          </div>

          <div className="admin-card admin-card-keyline p-8 sm:p-10">
            <div className="admin-icon-chip" data-tone="ember">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="admin-title text-2xl text-foreground mt-5">Đăng nhập Admin</h2>
            <p className="font-body text-sm text-muted-foreground mt-1.5">
              Dành riêng cho tài khoản có quyền quản trị.
            </p>

            <form onSubmit={handleLogin} className="space-y-4 mt-8">
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@chiptrip.ai"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-sm font-medium text-foreground">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 mt-2" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Đăng nhập Admin
              </Button>
            </form>

            <button
              onClick={() => navigate("/")}
              className="mt-7 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại trang chủ
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLogin;
