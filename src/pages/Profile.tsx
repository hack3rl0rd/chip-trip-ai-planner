import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Heart, Save, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const travelPrefs = [
  { id: "healing", label: "Chữa lành", emoji: "🧘" },
  { id: "food", label: "Ăn sập phố", emoji: "🍜" },
  { id: "photo", label: "Sống ảo", emoji: "📸" },
  { id: "adventure", label: "Mạo hiểm", emoji: "🏔️" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/profile" } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      // Fetch preferences
      supabase
        .from("profiles")
        .select("travel_preferences")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.travel_preferences) {
            setPreferences(data.travel_preferences as string[]);
          }
        });
      // Fetch trip count
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .then(({ count }) => setTripCount(count || 0));
    }
  }, [user]);

  const togglePref = (id: string) => {
    setPreferences(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
        travel_preferences: preferences as any,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Lưu thất bại");
    } else {
      toast.success("Đã cập nhật profile! 🎉");
    }
  };

  if (authLoading) return null;

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
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-chip-orange/20" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-accent flex items-center justify-center text-3xl font-bold text-accent-foreground">
                  {initials}
                </div>
              )}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">{displayName || "Chưa đặt tên"}</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-gradient">{tripCount}</p>
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
                <Label className="text-foreground font-medium mb-1.5 block">URL Avatar</Label>
                <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="h-12 rounded-xl" />
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
    </div>
  );
};

export default Profile;
