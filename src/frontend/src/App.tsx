import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  ArrowUpDown,
  ChevronDown,
  LogOut,
  Pencil,
  PlusCircle,
  ReceiptText,
  Trash2,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Category, type Expense } from "./backend.d";
import { CategoryBadge, getCategoryConfig } from "./components/CategoryBadge";
import { ExpenseModal } from "./components/ExpenseModal";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useDeleteExpense,
  useGetExpenses,
  useGetSpendingSummary,
} from "./hooks/useQueries";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: Category.food, label: "Food" },
  { value: Category.transport, label: "Transport" },
  { value: Category.housing, label: "Housing" },
  { value: Category.entertainment, label: "Entertainment" },
  { value: Category.health, label: "Health" },
  { value: Category.shopping, label: "Shopping" },
  { value: Category.other, label: "Other" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "amount_desc", label: "Highest Amount" },
  { value: "amount_asc", label: "Lowest Amount" },
];

const PLACEHOLDER_KEYS = ["ph-0", "ph-1", "ph-2"];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
}

function formatDate(str: string) {
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function App() {
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: expenses, isLoading: expensesLoading } = useGetExpenses();
  const { data: summary, isLoading: summaryLoading } = useGetSpendingSummary();
  const deleteExpense = useDeleteExpense();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    let list = [...expenses];
    if (filterCategory !== "all") {
      list = list.filter((e) => e.category === filterCategory);
    }
    switch (sortBy) {
      case "date_asc":
        list.sort((a, b) => a.date.localeCompare(b.date));
        break;
      case "date_desc":
        list.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case "amount_asc":
        list.sort((a, b) => a.amount - b.amount);
        break;
      case "amount_desc":
        list.sort((a, b) => b.amount - a.amount);
        break;
    }
    return list;
  }, [expenses, filterCategory, sortBy]);

  const topCategories = useMemo(() => {
    if (!summary) return [];
    const cats: { category: Category; amount: number }[] = [
      { category: Category.food, amount: summary.food },
      { category: Category.transport, amount: summary.transport },
      { category: Category.housing, amount: summary.housing },
      { category: Category.entertainment, amount: summary.entertainment },
      { category: Category.health, amount: summary.health },
      { category: Category.shopping, amount: summary.shopping },
      { category: Category.other, amount: summary.other },
    ];
    return cats
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [summary]);

  async function handleDelete() {
    if (deleteTarget === null) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget);
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setDeleteTarget(null);
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="w-64 h-10 rounded-lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Toaster />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Card className="shadow-card border">
            <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Expense Tracker
              </h1>
              <p className="text-muted-foreground text-sm mb-8">
                Track, manage, and analyze your spending all in one place.
              </p>
              <Button
                className="w-full"
                onClick={login}
                disabled={loginStatus === "logging-in"}
                data-ocid="auth.primary_button"
              >
                {loginStatus === "logging-in" ? "Connecting..." : "Sign In"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : "";

  const placeholderCount = Math.max(0, 3 - topCategories.length);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Expense Tracker
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setEditingExpense(null);
                setModalOpen(true);
              }}
              className="hidden sm:flex gap-2"
              data-ocid="expense.open_modal_button"
            >
              <PlusCircle className="w-4 h-4" />
              Add Expense
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-ocid="user.dropdown_menu"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs text-muted-foreground">
                    {shortPrincipal}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={clear}
                  data-ocid="user.logout_button"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total */}
            <Card className="shadow-card border sm:col-span-2 lg:col-span-1">
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Spending
                  </span>
                </div>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className="text-3xl font-display font-bold text-foreground">
                    {formatCurrency(summary?.total ?? 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top categories */}
            {summaryLoading
              ? [1, 2, 3].map((i) => (
                  <Card
                    key={i}
                    className="shadow-card border"
                    data-ocid="summary.loading_state"
                  >
                    <CardContent className="pt-5 pb-5 px-5">
                      <Skeleton className="h-4 w-20 mb-3" />
                      <Skeleton className="h-7 w-24" />
                    </CardContent>
                  </Card>
                ))
              : topCategories.map((cat) => {
                  const config = getCategoryConfig(cat.category);
                  return (
                    <Card key={cat.category} className="shadow-card border">
                      <CardContent className="pt-5 pb-5 px-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${
                              config.className
                            }`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <p className="text-2xl font-display font-bold text-foreground">
                          {formatCurrency(cat.amount)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}

            {/* Fill placeholders if fewer than 3 top categories */}
            {!summaryLoading &&
              PLACEHOLDER_KEYS.slice(0, placeholderCount).map((k) => (
                <Card key={k} className="shadow-card border hidden lg:block" />
              ))}
          </div>
        </section>

        {/* Expense List */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="font-display font-semibold text-foreground flex-1">
              Expenses
              {expenses && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {filteredExpenses.length}
                </Badge>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger
                  className="w-44 h-9"
                  data-ocid="expense.category_filter_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger
                  className="w-40 h-9"
                  data-ocid="expense.sort_select"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="shadow-card border overflow-hidden">
            {expensesLoading ? (
              <div className="divide-y" data-ocid="expense.loading_state">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <div className="ml-auto flex items-center gap-3">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 text-center"
                data-ocid="expense.empty_state"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <ReceiptText className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">
                  {filterCategory === "all"
                    ? "No expenses yet"
                    : "No expenses in this category"}
                </p>
                <p className="text-sm text-muted-foreground mb-5">
                  {filterCategory === "all"
                    ? "Start tracking your spending by adding your first expense."
                    : "Try selecting a different category."}
                </p>
                {filterCategory === "all" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingExpense(null);
                      setModalOpen(true);
                    }}
                    data-ocid="expense.empty_add_button"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add First Expense
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y" data-ocid="expense.list">
                <AnimatePresence initial={false}>
                  {filteredExpenses.map((expense, idx) => (
                    <motion.div
                      key={String(expense.id)}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                      data-ocid={`expense.item.${idx + 1}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {expense.title}
                        </p>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {expense.notes}
                          </p>
                        )}
                      </div>
                      <CategoryBadge category={expense.category} />
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(expense.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingExpense(expense);
                            setModalOpen(true);
                          }}
                          data-ocid={`expense.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(expense.id)}
                          data-ocid={`expense.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </section>
      </main>

      {/* Floating Add button (mobile) */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg sm:hidden"
        onClick={() => {
          setEditingExpense(null);
          setModalOpen(true);
        }}
        data-ocid="expense.mobile_open_modal_button"
      >
        <PlusCircle className="w-6 h-6" />
      </Button>

      {/* Footer */}
      <footer className="border-t bg-card py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with{" "}
        <span className="text-destructive">♥</span> using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>

      <ExpenseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="expense.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="expense.delete_cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="expense.delete_confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
