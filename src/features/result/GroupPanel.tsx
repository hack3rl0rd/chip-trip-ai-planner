import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Trash2, Crown, Loader2, Link2, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { useTripMembers, useAddMember, useRemoveMember } from "@/hooks/useApi";
import { useAuth } from "@/features/auth/useAuth";
import { userApi } from "@/integrations/api/modules/user";
import { membersApi } from "@/integrations/api/modules/members";
import type { UserProfile } from "@/integrations/api/types";

interface GroupPanelProps {
  tripId: number;
  isOwner: boolean;
}

const GroupPanel = ({ tripId, isOwner }: GroupPanelProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data: members = [], isLoading } = useTripMembers(open ? tripId : null);
  const addMemberMutation = useAddMember(tripId);
  const removeMemberMutation = useRemoveMember(tripId);

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const token = await membersApi.createInvite(tripId);
      const link = `${window.location.origin}/trips/join/${token}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
      toast.success("Đã sao chép link mời!", { description: "Gửi link cho bạn bè để họ tham gia nhóm" });
    } catch {
      toast.error("Không tạo được link mời");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvite = async () => {
    setInviteLoading(true);
    try {
      await membersApi.revokeInvite(tripId);
      setInviteLink(null);
      toast.success("Đã thu hồi link mời", { description: "Link cũ không còn dùng được nữa" });
    } catch {
      toast.error("Không thu hồi được link mời");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddUser = async (userId: number) => {
    try {
      await addMemberMutation.mutateAsync({ userId });
      setAddInput("");
      setSearchResults([]);
      toast.success("Đã thêm thành viên");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      toast.error(msg ?? "Không thể thêm thành viên");
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      await removeMemberMutation.mutateAsync(memberId);
      toast.success("Đã xóa thành viên");
    } catch {
      toast.error("Không thể xóa thành viên");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-1" /> Nhóm
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-chip-orange" /> Thành viên nhóm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mời qua link (owner only) — cho bạn bè chưa có account */}
          {isOwner && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-chip-orange" /> Mời qua link
              </p>
              {inviteLink ? (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-muted-foreground truncate focus:outline-none"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Đã sao chép!"); }}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Sao chép link mời"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRevokeInvite}
                    disabled={inviteLoading}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    aria-label="Thu hồi link mời"
                    title="Thu hồi link"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button variant="soft" size="sm" className="w-full gap-1.5" onClick={handleCreateInvite} disabled={inviteLoading}>
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Tạo link mời & sao chép
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">
                Ai có link đều tham gia được (kể cả người chưa có tài khoản — họ sẽ đăng ký rồi tự vào nhóm).
              </p>
            </div>
          )}

          {/* Add member (owner only) */}
          {isOwner && (
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  placeholder="Tìm kiếm người dùng qua tên hoặc email..."
                  value={addInput}
                  onChange={e => {
                    setAddInput(e.target.value);
                    if (e.target.value.trim().length > 1) {
                      userApi.searchUsers(e.target.value).then(setSearchResults).catch(() => setSearchResults([]));
                    } else {
                      setSearchResults([]);
                    }
                  }}
                />
              </div>
              {searchResults.length > 0 && addInput.trim().length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleAddUser(u.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                          {(u.fullName || u.email || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có thành viên nào.
              </p>
            ) : (
              members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.displayName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chip-orange to-chip-yellow flex items-center justify-center text-xs font-bold text-white">
                        {m.displayName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.displayName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {m.role === "OWNER" && <Crown className="w-3 h-3 text-chip-orange" />}
                        {m.role === "OWNER" ? "Trưởng nhóm" : "Thành viên"}
                      </p>
                    </div>
                  </div>
                  {isOwner && m.role !== "OWNER" && m.userId !== user?.id && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={removeMemberMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50"
                    >
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
