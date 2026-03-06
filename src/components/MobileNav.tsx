import { Link, useLocation } from "react-router-dom";
import { Home, Map, Bookmark, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const MobileNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const links = [
    { path: "/", label: "Trang chủ", icon: Home },
    { path: "/planning", label: "Tạo mới", icon: Map },
    { path: "/saved", label: "Đã lưu", icon: Bookmark },
  ];

  // Hide on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t border-border/50 sm:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {links.map(link => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? "text-chip-orange" : "text-muted-foreground"
              }`}
            >
              <link.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
        <Link
          to={user ? "/profile" : "/auth"}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
            location.pathname === "/profile" || location.pathname === "/auth"
              ? "text-chip-orange"
              : "text-muted-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">{user ? "Cá nhân" : "Đăng nhập"}</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileNav;
