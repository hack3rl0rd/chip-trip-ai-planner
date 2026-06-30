import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

/** Khung chung cho các trang pháp lý tĩnh (Điều khoản, Quyền riêng tư). */
const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => (
  <div className="min-h-screen bg-background">
    <div className="border-b border-border">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
            <MapPin className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            Chip<span className="text-gradient">Trip</span>
          </span>
        </Link>
      </div>
    </div>

    <article className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-foreground mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8">Cập nhật lần cuối: {lastUpdated}</p>

      <div className="space-y-6 text-[15px] leading-relaxed text-foreground/90 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-chip-orange [&_a]:hover:underline">
        {children}
      </div>

      <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
        <Link to="/terms" className="text-chip-orange hover:underline">Điều khoản sử dụng</Link>
        <Link to="/privacy" className="text-chip-orange hover:underline">Chính sách quyền riêng tư</Link>
      </div>
    </article>
  </div>
);

export default LegalLayout;
