import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Category, type Expense } from "../backend.d";
import { useAddExpense, useUpdateExpense } from "../hooks/useQueries";

const CATEGORIES = [
  { value: Category.food, label: "Food" },
  { value: Category.transport, label: "Transport" },
  { value: Category.housing, label: "Housing" },
  { value: Category.entertainment, label: "Entertainment" },
  { value: Category.health, label: "Health" },
  { value: Category.shopping, label: "Shopping" },
  { value: Category.other, label: "Other" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

interface FormProps {
  expense?: Expense | null;
  onClose: () => void;
}

function ExpenseForm({ expense, onClose }: FormProps) {
  const isEdit = !!expense;
  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();

  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState<Category>(
    expense?.category ?? Category.food,
  );
  const [date, setDate] = useState(expense?.date ?? todayStr());
  const [notes, setNotes] = useState(expense?.notes ?? "");

  const isPending = addExpense.isPending || updateExpense.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number.parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0)
      return;

    const data: Expense = {
      id: expense?.id ?? BigInt(0),
      title: title.trim(),
      amount: parsedAmount,
      category,
      date,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEdit) {
        await updateExpense.mutateAsync(data);
        toast.success("Expense updated");
      } else {
        await addExpense.mutateAsync(data);
        toast.success("Expense added");
      }
      onClose();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Grocery run"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          data-ocid="expense.input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              ₹
            </span>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="pl-7"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              data-ocid="expense.amount_input"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            data-ocid="expense.date_input"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as Category)}
        >
          <SelectTrigger data-ocid="expense.category_select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-ocid="expense.textarea"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          data-ocid="expense.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          data-ocid="expense.submit_button"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Saving..." : isEdit ? "Update" : "Add Expense"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

export function ExpenseModal({ open, onClose, expense }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="expense.modal">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <ExpenseForm expense={expense} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
