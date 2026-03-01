import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, User } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center">
            <MapPin className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Chip<span className="text-gradient">Trip</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/saved">
            <Button variant="ghost" size="sm" className={location.pathname === "/saved" ? "bg-chip-yellow-light" : ""}>
              Chuyến đi của tôi
            </Button>
          </Link>
          <Button variant="soft" size="sm">
            <User className="w-4 h-4" />
            Đăng nhập
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
