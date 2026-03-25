import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Plus, Trash2, ArrowRight, ChevronDown, ChevronUp, Pencil, Check, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface SplitBillProps {
  tripId: string;
  memberNames: Record<string, string>;
  travelerCount?: number;
}

interface Expense {
  id: string;
  paid_by: string;
  title: string;
  amount: number;
  category: string;
  split_among: string[];
  created_at: string;
}

interface Member {
  id: string;
  name: string;
}

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  food: { label: "Ăn uống", emoji: "🍜" },
  transport: { label: "Di chuyển", emoji: "🚗" },
  hotel: { label: "Khách sạn", emoji: "🏨" },
  ticket: { label: "Vé tham quan", emoji: "🎟️" },
  shopping: { label: "Mua sắm", emoji: "🛍️" },
  other: { label: "Khác", emoji: "📦" },
};

const formatAmount = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
};

const SplitBill = ({ tripId, memberNames, travelerCount = 2 }: SplitBillProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  // Initialize members: default "Người 1", "Người 2", etc.
  const [members, setMembers] = useState<Member[]>(() => {
    const count = Math.max(travelerCount, Object.keys(memberNames).length, 2);
    const initial: Member[] = [];
    // Add real members first
    Object.entries(memberNames).forEach(([uid, name], i) => {
      initial.push({ id: uid, name: name || `Người ${i + 1}` });
    });
    // Fill up to traveler count
    for (let i = initial.length; i < count; i++) {
      initial.push({ id: `person-${i + 1}`, name: `Người ${i + 1}` });
    }
    return initial;
  });

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "food",
    paid_by: "",
    split_among: [] as string[],
  });

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("trip_expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    if (data) setExpenses(data as Expense[]);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchExpenses();
      setForm(f => ({
        ...f,
        paid_by: members[0]?.id || "",
        split_among: members.map(m => m.id),
      }));
    }
  };

  const toggleSplitMember = (uid: string) => {
    setForm(f => ({
      ...f,
      split_among: f.split_among.includes(uid)
        ? f.split_among.filter(id => id !== uid)
        : [...f.split_among, uid],
    }));
  };

  const selectAllMembers = () => {
    setForm(f => ({ ...f, split_among: members.map(m => m.id) }));
  };

  const addMember = () => {
    const newId = `person-${Date.now()}`;
    const newName = `Người ${members.length + 1}`;
    setMembers(prev => [...prev, { id: newId, name: newName }]);
    setForm(f => ({ ...f, split_among: [...f.split_among, newId] }));
  };

  const removeMember = (id: string) => {
    if (members.length <= 2) {
      toast.error("Cần ít nhất 2 người");
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({
      ...f,
      paid_by: f.paid_by === id ? members[0]?.id || "" : f.paid_by,
      split_among: f.split_among.filter(uid => uid !== id),
    }));
  };

  const startRename = (member: Member) => {
    setEditingMemberId(member.id);
    setEditingName(member.name);
  };

  const confirmRename = () => {
    if (!editingMemberId || !editingName.trim()) return;
    setMembers(prev => prev.map(m => m.id === editingMemberId ? { ...m, name: editingName.trim() } : m));
    setEditingMemberId(null);
    setEditingName("");
  };

  const addExpense = async () => {
    if (!form.title || !form.amount || !user) return;
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    if (form.split_among.length === 0) {
      toast.error("Chọn ít nhất 1 người để chia");
      return;
    }

    const paidBy = form.paid_by || members[0]?.id || user.id;

    const { error } = await supabase.from("trip_expenses").insert({
      trip_id: tripId,
      paid_by: paidBy,
      title: form.title,
      amount,
      category: form.category,
      split_among: form.split_among,
    });

    if (error) {
      toast.error("Thêm chi phí thất bại");
    } else {
      toast.success("Đã thêm chi phí");
      setForm({ title: "", amount: "", category: "food", paid_by: members[0]?.id || "", split_among: members.map(m => m.id) });
      setAdding(false);
      fetchExpenses();
    }
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("trip_expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success("Đã xóa");
  };

  const getName = (uid: string) => {
    const member = members.find(m => m.id === uid);
    if (member) return member.name;
    return memberNames[uid] || uid.slice(0, 6) + "...";
  };

  // Calculate balances & settlements
  const calculateDebts = () => {
    const balances: Record<string, number> = {};
    expenses.forEach(exp => {
      const splitWith = exp.split_among.length > 0 ? exp.split_among : [exp.paid_by];
      const perPerson = exp.amount / splitWith.length;
      balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.amount;
      splitWith.forEach(uid => {
        balances[uid] = (balances[uid] || 0) - perPerson;
      });
    });

    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];
    Object.entries(balances).forEach(([id, balance]) => {
      if (balance < -0.01) debtors.push({ id, amount: -balance });
      else if (balance > 0.01) creditors.push({ id, amount: balance });
    });

    const settlements: { from: string; to: string; amount: number }[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amt = Math.min(debtors[di].amount, creditors[ci].amount);
      settlements.push({ from: debtors[di].id, to: creditors[ci].id, amount: Math.round(amt) });
      debtors[di].amount -= amt;
      creditors[ci].amount -= amt;
      if (debtors[di].amount < 0.01) di++;
      if (creditors[ci].amount < 0.01) ci++;
    }
    return { settlements, balances };
  };

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const { settlements } = calculateDebts();
  const perPersonAvg = members.length > 0 ? Math.round(totalExpense / members.length) : 0;

  // Per-person totals
  const perPersonPaid: Record<string, number> = {};
  const perPersonOwes: Record<string, number> = {};
  expenses.forEach(exp => {
    perPersonPaid[exp.paid_by] = (perPersonPaid[exp.paid_by] || 0) + exp.amount;
    const splitWith = exp.split_among.length > 0 ? exp.split_among : [exp.paid_by];
    const perPerson = exp.amount / splitWith.length;
    splitWith.forEach(uid => {
      perPersonOwes[uid] = (perPersonOwes[uid] || 0) + perPerson;
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="soft" size="sm">
          <Receipt className="w-4 h-4" /> Chia tiền
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-chip-orange" /> Chia tiền nhóm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total + per person */}
          <div className="text-center p-4 rounded-xl bg-gradient-warm border border-chip-yellow/30">
            <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
            <p className="text-3xl font-bold text-gradient">{formatAmount(totalExpense)} VNĐ</p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} khoản · {members.length} người
              {perPersonAvg > 0 && <> · ~<span className="font-semibold text-foreground">{formatAmount(perPersonAvg)} ₫</span>/người</>}
            </p>
          </div>

          {/* Members management */}
          <div className="space-y-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span>👥 Thành viên ({members.length})</span>
              {showMembers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMembers && (
              <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    {editingMemberId === member.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                          className="h-8 text-sm flex-1"
                          autoFocus
                        />
                        <button onClick={confirmRename} className="p-1.5 rounded-lg hover:bg-chip-orange/10 text-chip-orange">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingMemberId(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-foreground">{member.name}</span>
                        <button onClick={() => startRename(member)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeMember(member.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <button
                  onClick={addMember}
                  className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-chip-orange hover:border-chip-orange/40 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Thêm người
                </button>
              </div>
            )}
          </div>

          {/* Settlements */}
          {settlements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">💸 Ai nợ ai</p>
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-sm">
                  <span className="font-medium text-foreground">{getName(s.from)}</span>
                  <ArrowRight className="w-4 h-4 text-chip-orange" />
                  <span className="font-medium text-foreground">{getName(s.to)}</span>
                  <span className="ml-auto font-bold text-chip-orange">{formatAmount(s.amount)} ₫</span>
                </div>
              ))}
            </div>
          )}

          {/* Detailed summary */}
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <span>📊 Chi tiết từng người</span>
            {showSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSummary && (
            <div className="space-y-2">
              {members.map(member => {
                const paid = perPersonPaid[member.id] || 0;
                const owes = Math.round(perPersonOwes[member.id] || 0);
                const balance = Math.round(paid - owes);
                return (
                  <div key={member.id} className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Đã trả: <span className="text-foreground font-medium">{formatAmount(paid)} ₫</span></span>
                      <span>Phải chịu: <span className="text-foreground font-medium">{formatAmount(owes)} ₫</span></span>
                    </div>
                    <p className={`text-xs font-semibold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {balance > 0 ? `+${formatAmount(balance)} ₫ (được nhận lại)` : balance < 0 ? `${formatAmount(balance)} ₫ (cần trả thêm)` : 'Đã cân bằng ✓'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add expense */}
          {adding ? (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
              <Input
                placeholder="Tên chi phí (VD: Ăn trưa)"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
              <Input
                placeholder="Số tiền (VNĐ)"
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Payer selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">👤 Người trả tiền</label>
                <Select value={form.paid_by} onValueChange={v => setForm({ ...form, paid_by: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn người trả" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Split among */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">👥 Chia cho ai</label>
                  <button type="button" onClick={selectAllMembers} className="text-xs text-chip-orange hover:underline">
                    Chọn tất cả
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {members.map(m => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                      <Checkbox
                        checked={form.split_among.includes(m.id)}
                        onCheckedChange={() => toggleSplitMember(m.id)}
                      />
                      <span className="text-foreground">{m.name}</span>
                      {form.split_among.includes(m.id) && form.amount && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          ~{formatAmount(Math.round(parseFloat(form.amount) / form.split_among.length))} ₫
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {form.split_among.length > 0 && form.amount && (
                  <p className="text-xs text-muted-foreground">
                    Mỗi người: <span className="font-medium text-foreground">{formatAmount(Math.round(parseFloat(form.amount) / form.split_among.length))} ₫</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="hero" className="flex-1" onClick={addExpense}>Thêm</Button>
                <Button variant="ghost" onClick={() => setAdding(false)}>Hủy</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" /> Thêm chi phí
            </Button>
          )}

          {/* Expense list */}
          <div className="space-y-2">
            {expenses.map(exp => {
              const cat = categoryLabels[exp.category] || categoryLabels.other;
              return (
                <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <span className="text-lg">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getName(exp.paid_by)} đã trả · chia {exp.split_among.length} người
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatAmount(exp.amount)} ₫</span>
                  <button onClick={() => deleteExpense(exp.id)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitBill;
