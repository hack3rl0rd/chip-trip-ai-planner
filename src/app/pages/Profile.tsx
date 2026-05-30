import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Heart, Save, Loader2, ArrowLeft, Camera } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { useMyProfile, useUpdateProfile } from "@/hooks/useApi";

const travelPrefs = [
  { id: "healing", label: "Chữa lành", emoji: "🧘" },
  { id: "food", label: "Ăn sập phố", emoji: "🍜" },
  { id: "photo", label: "Sống ảo", emoji: "📸" },
  { id: "adventure", label: "Mạo hiểm", emoji: "🏔️" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile: ctxProfile, loading: authLoading, updateProfile } = useAuth();
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const updateMutation = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const effectiveProfile = profileData || ctxProfile;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/profile" } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (effectiveProfile) {
      setDisplayName(effectiveProfile.fullName || "");
      setAvatarUrl(effectiveProfile.avatarUrl || "");
      setAvatarPreviewUrl(null);
    }
  }, [effectiveProfile]);

  const togglePref = (id: string) => {
    setPreferences(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      setAvatarPreviewUrl(URL.createObjectURL(file));
      toast.success("Đã cập nhật ảnh đại diện! 🎉");
    } catch (err: any) {
      toast.error("Upload thất bại: " + (err.message || "Lỗi không xác định"));
    }
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        fullName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      updateProfile({ fullName: displayName.trim() || null, avatarUrl: avatarUrl.trim() || null });
      toast.success("Đã cập nhật profile! 🎉");
    } catch (err: any) {
      toast.error("Lưu thất bại: " + (err.response?.data?.message || "Có lỗi xảy ra"));
    }
    setSaving(false);
  };

  if (authLoading || profileLoading) return null;

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-xl">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border shadow-card p-8 space-y-8">
            {/* Avatar & stats */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {avatarPreviewUrl ? (
                  <img
                    src="/placeholder.svg"
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 cursor-pointer"
                    onClick={() => setShowAvatarPreview(true)}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-accent flex items-center justify-center text-3xl font-bold text-accent-foreground">
                    {initials}
                  </div>
                )}
                {/* Upload overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                {/* Small camera badge */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">{displayName || "Chưa đặt tên"}</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-gradient">{profileData?.userId ? 0 : 0}</p>
                  <p className="text-xs text-muted-foreground">Chuyến đi</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">{preferences.length}</p>
                  <p className="text-xs text-muted-foreground">Sở thích</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <div>
                <Label className="text-foreground font-medium mb-1.5 block">Tên hiển thị</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tên của bạn" className="pl-10 h-12 rounded-xl" maxLength={100} />
                </div>
              </div>

              <div>
                <Label className="text-foreground font-medium mb-1.5 block">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={user?.email || ""} disabled className="pl-10 h-12 rounded-xl opacity-60" />
                </div>
              </div>

              <div>
                  <Label className="text-foreground font-medium mb-2 block flex items-center gap-2">
                    <Heart className="w-4 h-4 text-chip-orange" /> Sở thích du lịch
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {travelPrefs.map(p => (
                      <button
                        key={p.id}
                        onClick={() => togglePref(p.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          preferences.includes(p.id)
                            ? "border-chip-orange bg-chip-orange/10 text-chip-orange"
                            : "border-border bg-background text-muted-foreground hover:border-chip-orange/40"
                        }`}
                      >
                        <span>{p.emoji}</span> {p.label}
                      </button>
                    ))}
                  </div>
                </div>
            </div>

            <Button variant="hero" className="w-full h-12 rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu thay đổi
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Avatar preview modal */}
      <AnimatePresence>
        {showAvatarPreview && avatarPreviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAvatarPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-3xl border border-border shadow-xl p-6 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <img src="/placeholder.svg" alt="Avatar" className="w-48 h-48 rounded-full object-cover mx-auto border-4 border-primary/20 mb-4" />
              <p className="text-lg font-semibold text-foreground">{displayName || "Avatar"}</p>
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setShowAvatarPreview(false)}>
                Đóng
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
