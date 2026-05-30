import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Sparkles, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { authApi, authStorage } from "@/integrations/api";
import { useAuth } from "@/features/auth/useAuth";

type AuthStep =
  | "login"
  | "register"
  | "verify-email-otp"
  | "forgot-password-email"
  | "forgot-password-otp"
  | "forgot-password-set-password";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<AuthStep>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
    newPassword: "",
  });

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const getOtpInputProps = (index: number) => ({
    key: index,
    type: "text" as const,
    inputMode: "numeric" as const,
    maxLength: 1,
    className:
      "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border bg-background focus:border-chip-orange focus:ring-2 focus:ring-chip-orange/20 outline-none transition-all",
    value: form.otp[index] || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, "").slice(-1);
      const newOtp = form.otp.split("") as string[];
      newOtp[index] = val;
      const updated = newOtp.join("");
      setForm(prev => ({ ...prev, otp: updated }));

      if (val && index < 5) {
        const next = document.getElementById(`otp-${index + 1}`);
        next?.focus();
      }

      if (updated.length === 6 && !updated.includes("")) {
        handleVerifyOtpSubmit(updated);
      }
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !form.otp[index] && index > 0) {
        const prev = document.getElementById(`otp-${index - 1}`);
        prev?.focus();
      }
    },
  });

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      const authResponse = await authApi.login({ email: form.email, password: form.password });
      authStorage.setAccessToken(authResponse.accessToken);
      authStorage.setRefreshToken(authResponse.refreshToken);
      authStorage.setUser(authResponse);
      window.dispatchEvent(new Event("chiptrip-auth-change"));
      toast.success("Đăng nhập thành công!");
      navigate("/", { replace: true });
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Có lỗi xảy ra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ email: form.email, password: form.password, fullName: form.name });
      toast.success("Đăng ký thành công! Mã xác nhận đã được gửi đến email.", {
        description: "Bạn có thể đăng nhập ngay hoặc xác nhận email sau.",
      });
      setForm(prev => ({ ...prev, name: "", password: "", confirmPassword: "" }));
      setStep("login");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Có lỗi xảy ra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (email: string, purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET") => {
    if (!email) {
      toast.error("Vui lòng nhập email");
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp({ email, purpose });
      toast.success("Mã xác nhận đã được gửi đến email!");
      startCountdown();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Có lỗi xảy ra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (otpOverride?: string) => {
    const otp = otpOverride || form.otp;
    if (otp.length !== 6) {
      toast.error("Vui lòng nhập đầy đủ 6 chữ số");
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp({ email: form.email, otp, purpose: "EMAIL_VERIFICATION" });
      toast.success("Xác nhận email thành công!");
      setForm(prev => ({ ...prev, otp: "" }));
      setStep("login");
      toast.success("Bây giờ bạn có thể đăng nhập!");
    } catch (error: any) {
      setForm(prev => ({ ...prev, otp: "" }));
      document.getElementById("otp-0")?.focus();
      const msg = error.response?.data?.message || error.message || "Mã không đúng";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordEmail = () => {
    if (!form.email) {
      toast.error("Vui lòng nhập email");
      return;
    }
    setLoading(true);
    handleSendOtp(form.email, "PASSWORD_RESET")
      .then(() => setStep("forgot-password-otp"))
      .finally(() => setLoading(false));
  };

  const handleResetPasswordWithOtp = async () => {
    if (form.otp.length !== 6) {
      toast.error("Vui lòng nhập đầy đủ 6 chữ số");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPasswordWithOtp({
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      toast.success("Đặt lại mật khẩu thành công!");
      setForm(prev => ({ ...prev, otp: "", newPassword: "" }));
      setStep("login");
      toast.success("Bây giờ bạn có thể đăng nhập với mật khẩu mới!");
    } catch (error: any) {
      setForm(prev => ({ ...prev, otp: "" }));
      document.getElementById("otp-0")?.focus();
      const msg = error.response?.data?.message || error.message || "Mã không đúng";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "email profile openid",
        callback: async (response: any) => {
          if (response.error) {
            toast.error("Đăng nhập Google thất bại");
            setLoading(false);
            return;
          }
          const authResponse = await authApi.googleLogin(response.access_token);
          authStorage.setAccessToken(authResponse.accessToken);
          authStorage.setRefreshToken(authResponse.refreshToken);
          authStorage.setUser(authResponse);
          window.dispatchEvent(new Event("chiptrip-auth-change"));
          toast.success("Đăng nhập thành công!");
          navigate("/", { replace: true });
        },
      });
      client.requestAccessToken();
    } catch {
      toast.error("Đăng nhập Google thất bại");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", confirmPassword: "", otp: "", newPassword: "" });
    setStep("login");
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  };

  const pageTitle = () => {
    switch (step) {
      case "register": return "Tạo tài khoản mới";
      case "verify-email-otp": return "Xác nhận email";
      case "forgot-password-email": return "Quên mật khẩu";
      case "forgot-password-otp": return "Nhập mã xác nhận";
      case "forgot-password-set-password": return "Đặt mật khẩu mới";
      default: return "Chào mừng trở lại!";
    }
  };

  const pageSubtitle = () => {
    switch (step) {
      case "register": return "Đăng ký miễn phí để lưu và chia sẻ lịch trình";
      case "verify-email-otp": return "Nhập mã 6 chữ số đã gửi đến email của bạn";
      case "forgot-password-email": return "Nhập email để nhận mã đặt lại mật khẩu";
      case "forgot-password-otp": return `Mã xác nhận đã gửi đến ${form.email}`;
      case "forgot-password-set-password": return "Nhập mật khẩu mới của bạn";
      default: return "Đăng nhập để xem lại lịch trình đã lưu";
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-accent relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-accent-foreground/20"
              style={{ width: 80 + i * 60, height: 80 + i * 60, top: `${10 + i * 15}%`, left: `${5 + i * 12}%` }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center text-accent-foreground max-w-md"
        >
          <div className="w-20 h-20 rounded-3xl bg-accent-foreground/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-8">
            <MapPin className="w-10 h-10 text-accent-foreground" />
          </div>
          <h2 className="text-4xl font-display font-bold mb-4">Chip<span className="opacity-80">Trip</span></h2>
          <p className="text-accent-foreground/80 text-lg leading-relaxed">
            Lên lịch trình du lịch siêu tốc với AI. Khám phá Việt Nam theo cách riêng của bạn!
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-accent-foreground/70">
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /><span>AI-powered</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>500+ địa điểm</span></div>
          </div>
        </motion.div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <button onClick={resetForm} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </button>

          <div className="flex items-center gap-2 mb-2 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Chip<span className="text-gradient">Trip</span>
            </span>
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{pageTitle()}</h1>
          <p className="text-muted-foreground mb-8">{pageSubtitle()}</p>

          <AnimatePresence mode="wait">
            {/* ── LOGIN ── */}
            {step === "login" && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-foreground font-medium mb-1.5 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="hello@chiptrip.vn" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="pl-10 h-12 rounded-xl" maxLength={255} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-foreground font-medium mb-1.5 block">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} className="pl-10 pr-10 h-12 rounded-xl" maxLength={128} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <button type="button" onClick={() => setStep("forgot-password-email")} className="text-sm text-chip-orange hover:underline">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-bold" variant="hero">
                    {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" /> : "Đăng nhập"}
                  </Button>
                </form>

                <div className="flex bg-muted rounded-xl p-1 mt-6">
                  <button className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-background text-foreground shadow-sm">Đăng nhập</button>
                  <button onClick={() => { setStep("register"); setForm(prev => ({ ...prev, password: "" })); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Đăng ký</button>
                </div>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">hoặc tiếp tục với</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button variant="outline" className="w-full h-12 rounded-xl" type="button" onClick={handleGoogleLogin}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Đăng nhập với Google
                </Button>
              </motion.div>
            )}

            {/* ── REGISTER ── */}
            {step === "register" && (
              <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-5">
                  <div>
                    <Label htmlFor="reg-name" className="text-foreground font-medium mb-1.5 block">Tên của bạn</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-name" placeholder="Nguyễn Văn A" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="pl-10 h-12 rounded-xl" maxLength={100} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-email" className="text-foreground font-medium mb-1.5 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-email" type="email" placeholder="hello@chiptrip.vn" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="pl-10 h-12 rounded-xl" maxLength={255} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-password" className="text-foreground font-medium mb-1.5 block">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Ít nhất 8 ký tự" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} className="pl-10 pr-10 h-12 rounded-xl" maxLength={128} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-confirm" className="text-foreground font-medium mb-1.5 block">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-confirm" type={showConfirmPassword ? "text" : "password"} placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))} className="pl-10 pr-10 h-12 rounded-xl" maxLength={128} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-bold" variant="hero">
                    {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" /> : "Tạo tài khoản"}
                  </Button>
                </form>

                <div className="flex bg-muted rounded-xl p-1 mt-6">
                  <button onClick={() => { setStep("login"); setForm(prev => ({ ...prev, name: "", confirmPassword: "" })); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Đăng nhập</button>
                  <button className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-background text-foreground shadow-sm">Đăng ký</button>
                </div>
              </motion.div>
            )}

            {/* ── VERIFY EMAIL OTP ── */}
            {step === "verify-email-otp" && (
              <motion.div key="verify-email-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-chip-orange/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-chip-orange" />
                  </div>
                  <p className="text-muted-foreground text-sm">Mã xác nhận 6 chữ số đã được gửi đến</p>
                  <p className="font-semibold text-foreground">{form.email}</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtpSubmit(); }} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {[...Array(6)].map((_, i) => (
                      <Input key={i} id={`otp-${i}`} {...getOtpInputProps(i)} />
                    ))}
                  </div>

                  <Button type="submit" disabled={loading || form.otp.length !== 6} className="w-full h-12 rounded-xl text-base font-bold" variant="hero">
                    {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" /> : "Xác nhận"}
                  </Button>
                </form>

                <div className="mt-6 text-center space-y-2">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Gửi lại mã sau <span className="font-semibold text-chip-orange">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => handleSendOtp(form.email, "EMAIL_VERIFICATION")}
                      disabled={loading}
                      className="text-sm text-chip-orange hover:underline disabled:opacity-50"
                    >
                      Gửi lại mã xác nhận
                    </button>
                  )}
                  <div>
                    <button onClick={() => { setStep("register"); setForm(prev => ({ ...prev, otp: "" })); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Dùng email khác?
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── FORGOT PASSWORD EMAIL ── */}
            {step === "forgot-password-email" && (
              <motion.div key="forgot-password-email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={(e) => { e.preventDefault(); handleForgotPasswordEmail(); }} className="space-y-5">
                  <div>
                    <Label htmlFor="fp-email" className="text-foreground font-medium mb-1.5 block">Email của bạn</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fp-email" type="email" placeholder="Nhập email đã đăng ký" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="pl-10 h-12 rounded-xl" maxLength={255} />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-bold" variant="hero">
                    {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" /> : "Gửi mã xác nhận"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => setStep("login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Quay lại đăng nhập
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── FORGOT PASSWORD OTP ── */}
            {step === "forgot-password-otp" && (
              <motion.div key="forgot-password-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-chip-orange/10 flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-chip-orange" />
                  </div>
                  <p className="text-muted-foreground text-sm">Nhập mã đã gửi đến</p>
                  <p className="font-semibold text-foreground">{form.email}</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleResetPasswordWithOtp(); }} className="space-y-5">
                  <div className="flex justify-center gap-2">
                    {[...Array(6)].map((_, i) => (
                      <Input key={i} id={`otp-${i}`} {...getOtpInputProps(i)} />
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="fp-new-password" className="text-foreground font-medium mb-1.5 block">Mật khẩu mới</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fp-new-password" type={showPassword ? "text" : "password"} placeholder="Ít nhất 8 ký tự" value={form.newPassword} onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))} className="pl-10 pr-10 h-12 rounded-xl" maxLength={128} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading || form.otp.length !== 6 || !form.newPassword} className="w-full h-12 rounded-xl text-base font-bold" variant="hero">
                    {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" /> : "Đặt lại mật khẩu"}
                  </Button>
                </form>

                <div className="mt-6 text-center space-y-2">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Gửi lại mã sau <span className="font-semibold text-chip-orange">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => handleSendOtp(form.email, "PASSWORD_RESET")}
                      disabled={loading}
                      className="text-sm text-chip-orange hover:underline disabled:opacity-50"
                    >
                      Gửi lại mã xác nhận
                    </button>
                  )}
                  <div>
                    <button onClick={() => { setStep("forgot-password-email"); setForm(prev => ({ ...prev, otp: "" })); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Dùng email khác?
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Only show terms for login/register */}
          {(step === "login" || step === "register") && (
            <p className="text-center text-xs text-muted-foreground mt-8">
              Bằng việc tiếp tục, bạn đồng ý với{" "}
              <a href="#" className="text-chip-orange hover:underline">Điều khoản</a>{" "}
              và{" "}
              <a href="#" className="text-chip-orange hover:underline">Chính sách bảo mật</a>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
