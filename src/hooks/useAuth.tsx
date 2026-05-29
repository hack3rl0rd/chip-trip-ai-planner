import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authStorage } from "@/integrations/api/client";
import { authApi } from "@/integrations/api";
import type { AuthResponse, UserProfile } from "@/integrations/api/types";

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
    }
    authStorage.clear();
    setUser(null);
    setSession(null);
    setProfile(null);
    window.location.href = "/";
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
    if (updated.fullName) {
      setUser((prev) => (prev ? { ...prev, fullName: updated.fullName ?? null } : null));
    }
  };

  useEffect(() => {
    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();
    const storedUser = authStorage.getUser() as AuthResponse | null;

    if (accessToken && refreshToken && storedUser) {
      setSession({ accessToken, refreshToken });
      setUser({ id: storedUser.userId, email: storedUser.email, fullName: storedUser.fullName ?? null, role: storedUser.role });
      setProfile({
        userId: storedUser.userId,
        email: storedUser.email,
        fullName: storedUser.fullName ?? null,
        avatarUrl: null,
        aiCredits: 0,
        createdAt: "",
        role: storedUser.role,
      });
    }
    setLoading(false);
  }, []);

  const isAdmin = user?.role === "ADMIN";

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
