import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, User, Zap, Moon, Sun } from "lucide-react";
import { getCredits } from "@/lib/trip-data";
import { useEffect, useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const credits = getCredits();
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

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
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-chip-yellow-light border border-chip-yellow/30">
            <Zap className="w-3.5 h-3.5 text-chip-orange" />
            <span className="text-xs font-bold text-foreground">{credits}</span>
            <span className="text-xs text-muted-foreground">lượt AI</span>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link to="/saved">
            <Button variant="ghost" size="sm" className={`hidden sm:inline-flex ${location.pathname === "/saved" ? "bg-chip-yellow-light" : ""}`}>
              Chuyến đi của tôi
            </Button>
          </Link>
          <Button variant="soft" size="sm">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
