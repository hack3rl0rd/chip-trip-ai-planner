import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authStorage } from "@/integrations/api/client";
import { authApi } from "@/integrations/api";
import { userApi } from "@/integrations/api/modules/user";
import type { AuthResponse, UserProfile } from "@/integrations/api/types";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

interface AuthContextType {
  user: { id: number; email: string; fullName: string | null; role?: string } | null;
  session: { accessToken: string; refreshToken: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
  signOut: async () => {},
  updateProfile: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [user, setUser] = useState<{ id: number; email: string; fullName: string | null; role?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout should still clear local state when the server call fails.
    }
    authStorage.clear();
    resetAnalytics();
    setUser(null);
    setSession(null);
    setProfile(null);
    window.dispatchEvent(new Event("chiptrip-auth-change"));
    window.location.href = "/";
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fullName: "fullName" in updated ? updated.fullName ?? null : prev.fullName,
        role: updated.role ?? prev.role,
      };
    });

    const storedUser = authStorage.getUser() as AuthResponse | null;
    if (storedUser) {
      authStorage.setUser({
        ...storedUser,
        fullName: "fullName" in updated ? updated.fullName ?? null : storedUser.fullName,
        role: updated.role ?? storedUser.role,
      });
    }
  };

  // Re-read localStorage whenever storage changes (login/logout in another tab or direct localStorage manipulation)
  useEffect(() => {
    const onStorage = () => {
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();
      const storedUser = authStorage.getUser() as AuthResponse | null;

      if (accessToken && refreshToken && storedUser) {
        setSession({ accessToken, refreshToken });
        setUser({ id: storedUser.userId, email: storedUser.email, fullName: storedUser.fullName ?? null, role: storedUser.role });
        identifyUser(storedUser.userId, { email: storedUser.email, name: storedUser.fullName ?? undefined });
        setProfile({
          id: storedUser.userId,
          userId: storedUser.userId,
          email: storedUser.email,
          fullName: storedUser.fullName ?? null,
          avatarUrl: null,
          aiCredits: 0,
          createdAt: "",
          role: storedUser.role,
        });
      } else {
        authStorage.clear();
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
    };

    onStorage(); // run once on mount to pick up any existing session
    window.addEventListener("chiptrip-auth-change", onStorage);
    return () => window.removeEventListener("chiptrip-auth-change", onStorage);
  }, []);

  // Đồng bộ profile đầy đủ từ BE (avatarUrl, aiCredits, createdAt...) —
  // localStorage chỉ lưu AuthResponse nên thiếu các field này sau khi reload
  useEffect(() => {
    if (!user) return;
    userApi.getMe()
      .then(p => {
        if (p) setProfile(prev => (prev ? { ...prev, ...p } : p));
      })
      .catch(() => {
        // Keep the lightweight auth profile if /users/me is temporarily unavailable.
      });
  }, [user?.id]);

  const isAdmin = (profile?.role ?? user?.role) === "ROLE_ADMIN";

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
