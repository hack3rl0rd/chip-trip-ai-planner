import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Plus, Trash2, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface SplitBillProps {
  tripId: string;
  memberNames: Record<string, string>; // userId -> displayName
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

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  food: { label: "Ăn uống", emoji: "🍜" },
  transport: { label: "Di chuyển", emoji: "🚗" },
  hotel: { label: "Khách sạn", emoji: "🏨" },
  ticket: { label: "Vé tham quan", emoji: "🎟️" },
  shopping: { label: "Mua sắm", emoji: "🛍️" },
  other: { label: "Khác", emoji: "📦" },
};

const SplitBill = ({ tripId, memberNames }: SplitBillProps) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "food" });

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
    if (isOpen) fetchExpenses();
  };

  const addExpense = async () => {
    if (!form.title || !form.amount || !user) return;
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }

    const memberIds = Object.keys(memberNames);
    const { error } = await supabase.from("trip_expenses").insert({
      trip_id: tripId,
      paid_by: user.id,
      title: form.title,
      amount,
      category: form.category,
      split_among: memberIds.length > 0 ? memberIds : [user.id],
    });

    if (error) {
      toast.error("Thêm chi phí thất bại");
    } else {
      toast.success("Đã thêm chi phí");
      setForm({ title: "", amount: "", category: "food" });
      setAdding(false);
      fetchExpenses();
    }
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("trip_expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success("Đã xóa");
  };

  // Calculate debts
  const calculateDebts = () => {
    const balances: Record<string, number> = {};
    const allMembers = new Set<string>();

    expenses.forEach(exp => {
      allMembers.add(exp.paid_by);
      const splitWith = exp.split_among.length > 0 ? exp.split_among : [exp.paid_by];
      splitWith.forEach(uid => allMembers.add(uid));
      const perPerson = exp.amount / splitWith.length;

      balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.amount;
      splitWith.forEach(uid => {
        balances[uid] = (balances[uid] || 0) - perPerson;
      });
    });

    // Simplify debts
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

    return settlements;
  };

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const settlements = calculateDebts();
  const getName = (uid: string) => memberNames[uid] || uid.slice(0, 6) + "...";

  const formatAmount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return `${n}`;
  };

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
          {/* Total */}
          <div className="text-center p-4 rounded-xl bg-gradient-warm border border-chip-yellow/30">
            <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
            <p className="text-3xl font-bold text-gradient">{formatAmount(totalExpense)} VNĐ</p>
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
                  <span className="ml-auto font-bold text-chip-orange">{formatAmount(s.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add expense */}
          {adding ? (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
              <Input placeholder="Tên chi phí (VD: Ăn trưa)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Số tiền (VNĐ)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <p className="text-xs text-muted-foreground">{getName(exp.paid_by)} đã trả</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatAmount(exp.amount)}</span>
                  {exp.paid_by === user?.id && (
                    <button onClick={() => deleteExpense(exp.id)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
