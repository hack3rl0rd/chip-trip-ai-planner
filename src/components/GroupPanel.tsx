import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, X, Trash2, Crown, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface GroupPanelProps {
  tripId: string;
  isOwner: boolean;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
}

const GroupPanel = ({ tripId, isOwner }: GroupPanelProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("trip_members")
      .select("id, user_id, role")
      .eq("trip_id", tripId);

    if (data) {
      const membersWithNames = await Promise.all(
        data.map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", m.user_id)
            .single();
          return {
            ...m,
            display_name: profile?.display_name || null,
            email: null,
          };
        })
      );
      setMembers(membersWithNames);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) fetchMembers();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);

    // Look up user by email - we'll use a simple approach
    // For now, copy invite link instead
    toast.info("Tính năng mời qua email sẽ được cập nhật. Hãy chia sẻ link mời!");
    setLoading(false);
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join-trip/${tripId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Đã sao chép link mời!");
    setTimeout(() => setCopied(false), 2000);
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("trip_members").delete().eq("id", memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success("Đã xóa thành viên");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="soft" size="sm">
          <Users className="w-4 h-4" /> Nhóm
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-chip-orange" /> Thành viên nhóm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invite link */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyInviteLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Đã sao chép" : "Sao chép link mời"}
            </Button>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có thành viên nào. Mời bạn bè tham gia!
              </p>
            ) : (
              members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                      {(m.display_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.display_name || "Chưa đặt tên"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {m.role === "owner" && <Crown className="w-3 h-3 text-chip-orange" />}
                        {m.role === "owner" ? "Trưởng nhóm" : "Thành viên"}
                      </p>
                    </div>
                  </div>
                  {isOwner && m.user_id !== user?.id && (
                    <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupPanel;
