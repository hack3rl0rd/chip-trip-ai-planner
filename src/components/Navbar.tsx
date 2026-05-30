import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, User, Zap, Moon, Sun, Crown, LogOut, Settings, UserCircle } from "lucide-react";
import { getCredits } from "@/features/planning/trip-data";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const location = useLocation();
  const credits = getCredits();
  const { user, profile, signOut, isAdmin } = useAuth();
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const saved = localStorage.getItem("chiptrip_theme");
    if (saved === "dark") {
      setDark(true);
    }
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    toast.success("Đã đăng xuất");
  };

  const displayName = profile?.fullName || user?.fullName || user?.email?.split("@")[0] || "";
  const avatarUrl = profile?.avatarUrl;
  const initial = (displayName || "U")[0].toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center">
            <MapPin className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Chip<span className="text-gradient">Trip</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Credits badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-chip-yellow-light border border-chip-yellow/30">
              <Zap className="w-3.5 h-3.5 text-chip-orange" />
              <span className="text-xs font-bold text-foreground">{credits}</span>
              <span className="text-xs text-muted-foreground">lượt AI</span>
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {!isAdmin && (
            <Link to="/premium">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5 text-chip-orange hover:text-chip-orange">
                <Crown className="w-4 h-4" /> Premium
              </Button>
            </Link>
          )}
          {isAdmin ? (
            <Link to="/admin/users">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5">
                <Settings className="w-4 h-4" /> Quản trị
              </Button>
            </Link>
          ) : (
            <Link to="/saved">
              <Button variant="ghost" size="sm" className={`hidden sm:inline-flex ${location.pathname === "/saved" ? "bg-chip-yellow-light" : ""}`}>
                Chuyến đi của tôi
              </Button>
            </Link>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Menu tài khoản"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                    {initial}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-card rounded-2xl border border-border shadow-lg overflow-hidden z-50"
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-base font-bold text-primary">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 text-muted-foreground" />
                        Trang cá nhân
                      </Link>
                      <Link
                        to="/saved"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors sm:hidden"
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Chuyến đi của tôi
                      </Link>
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-border py-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="soft" size="sm">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
