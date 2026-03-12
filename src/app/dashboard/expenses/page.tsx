"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  ScanLine,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
  Loader2,
  Download,
  SquareCheck,
  Square,
  Send,
  ArrowUpDown,
  Calendar,
  X,
  FileArchive,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  amountUGX: number | null;
  exchangeRate: number | null;
  category: string;
  vendor: string | null;
  date: string;
  status: string;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED"];
const CATEGORY_FILTERS = [
  "ALL", "Fuel & Gas", "Equipment", "Travel", "Supplies", "Meals",
  "Transportation", "Utilities", "Maintenance", "Office", "Other",
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 dark:bg-gray-800 text-[var(--muted)]", icon: FileEdit },
  PENDING: { label: "Pending", color: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400", icon: XCircle },
};

type SortField = "createdAt" | "amount" | "date" | "title";

function ExpenseSkeleton() {
  return (
    <div className="premium-card p-3.5 lg:p-5">
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="w-5 h-5 rounded bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shimmer" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-32 rounded shimmer" />
            <div className="h-5 w-16 rounded-full shimmer" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 rounded shimmer" />
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-3 w-24 rounded shimmer hidden sm:block" />
          </div>
        </div>
        <div className="h-5 w-24 rounded shimmer" />
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", String(page));

      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses);
        setTotal(data.pagination.total);
        setPages(data.pagination.pages);
      } else {
        toast.error(data.error || "Failed to load expenses");
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      toast.error("Network error loading expenses");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, categoryFilter, dateFrom, dateTo, sortBy, sortOrder, page, toast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    setSelected(new Set());
  }, [expenses]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setTotal((prev) => prev - 1);
        toast.success("Expense deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete expense");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error("Network error deleting expense");
    } finally {
      setDeleting(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === expenses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(expenses.map((e) => e.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return;
    const confirmMsg = action === "delete"
      ? `Delete ${selected.size} expense(s)?`
      : `${action.charAt(0).toUpperCase() + action.slice(1)} ${selected.size} expense(s)?`;
    if (!confirm(confirmMsg)) return;

    setBulkLoading(true);
    try {
      const res = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} completed for ${selected.size} expense(s)`);
        fetchExpenses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Bulk action failed");
      }
    } catch (err) {
      console.error("Bulk action failed:", err);
      toast.error("Network error performing bulk action");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set("format", "csv");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);

      const res = await fetch(`/api/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
      } else {
        toast.error("Failed to export CSV");
      }
    } catch {
      toast.error("Network error exporting CSV");
    }
  };

  const handleDownloadReceipts = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      toast.info("Preparing receipt download...");

      const res = await fetch(`/api/receipts/download?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const label = categoryFilter !== "ALL" ? categoryFilter.toLowerCase().replace(/\s+/g, "-") : "all";
        a.download = `receipts-${label}-${new Date().toISOString().split("T")[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Receipts downloaded as ZIP");
      } else {
        const data = await res.json();
        toast.error(data.error || "No receipts found");
      }
    } catch {
      toast.error("Failed to download receipts");
    }
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasDateFilter = dateFrom || dateTo;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--foreground)] tracking-tight">My Expenses</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {total} expense{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadReceipts}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl premium-card text-sm text-[var(--muted)] font-medium hover:border-emerald-300 transition-colors"
            title="Download all receipts as ZIP"
          >
            <FileArchive className="w-4 h-4" />
            <span className="hidden sm:inline">Receipts ZIP</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl premium-card text-sm text-[var(--muted)] font-medium hover:border-emerald-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </motion.button>
          <Link href="/dashboard/scan">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl premium-card text-sm text-[var(--muted)] font-medium hover:border-emerald-300 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Receipt</span>
            </motion.button>
          </Link>
          <Link href="/dashboard/expenses/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Expense</span>
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 lg:p-6 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search expenses..."
              className="input-premium w-full h-10 pl-10 pr-4"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-premium h-10 pl-4 pr-8 appearance-none cursor-pointer"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="input-premium h-10 pl-4 pr-8 appearance-none cursor-pointer"
            >
              {CATEGORY_FILTERS.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Categories" : c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium">Date range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input-premium h-8 px-2.5 text-xs rounded-lg"
            placeholder="From"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input-premium h-8 px-2.5 text-xs rounded-lg"
            placeholder="To"
          />
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-xs text-gray-400 font-medium">Sort by:</span>
        {([
          ["date", "Date"],
          ["amount", "Amount"],
          ["title", "Title"],
          ["createdAt", "Created"],
        ] as [SortField, string][]).map(([field, label]) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${sortBy === field ? "text-emerald-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            {label}
            <SortIcon field={field} />
          </button>
        ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 sm:gap-3 mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-black/[0.06] dark:border-white/[0.06] shadow-sm"
        >
          <span className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          {bulkLoading ? (
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
          ) : (
            <>
              <button
                onClick={() => handleBulkAction("submit")}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                title="Submit"
              >
                <Send className="w-3 h-3" /> <span className="hidden sm:inline">Submit</span>
              </button>
              {user?.role !== "EMPLOYEE" && (
                <>
                  <button
                    onClick={() => handleBulkAction("approve")}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
                    title="Approve"
                  >
                    <CheckCircle2 className="w-3 h-3" /> <span className="hidden sm:inline">Approve</span>
                  </button>
                  <button
                    onClick={() => handleBulkAction("reject")}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                    title="Reject"
                  >
                    <XCircle className="w-3 h-3" /> <span className="hidden sm:inline">Reject</span>
                  </button>
                </>
              )}
              <button
                onClick={() => handleBulkAction("delete")}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" /> <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExpenseSkeleton key={i} />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="premium-card p-10 lg:p-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h4 className="text-lg font-semibold text-[var(--foreground)] mb-2">No expenses found</h4>
            <p className="text-sm text-[var(--muted)] max-w-sm mb-6">
              {search || statusFilter !== "ALL" || categoryFilter !== "ALL" || hasDateFilter
                ? "Try adjusting your filters to find what you're looking for."
                : "Start by scanning a receipt or adding a new expense manually."}
            </p>
            {!search && statusFilter === "ALL" && !hasDateFilter && (
              <div className="flex gap-3">
                <Link href="/dashboard/scan">
                  <motion.button whileHover={{ scale: 1.02 }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-sm">
                    <ScanLine className="w-4 h-4" /> Scan Receipt
                  </motion.button>
                </Link>
                <Link href="/dashboard/expenses/new">
                  <motion.button whileHover={{ scale: 1.02 }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl premium-card text-sm text-[var(--muted)] font-medium">
                    <Plus className="w-4 h-4" /> Add Manually
                  </motion.button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 mb-2 px-2">
            <button onClick={toggleSelectAll} className="text-gray-400 hover:text-emerald-500 transition-colors">
              {selected.size === expenses.length ? <SquareCheck className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            <span className="text-xs text-gray-400">Select all</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {expenses.map((expense, i) => {
                const status = statusConfig[expense.status] || statusConfig.DRAFT;
                const StatusIcon = status.icon;
                const isOwner = user?.id === expense.user.id;
                const isSelected = selected.has(expense.id);

                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    className={`group premium-card p-3.5 lg:p-5 transition-colors ${isSelected ? "!border-emerald-300 dark:!border-emerald-700 !bg-emerald-50/50 dark:!bg-emerald-950/20" : "hover:border-emerald-200 dark:hover:border-emerald-800"}`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-4">
                      <button onClick={() => toggleSelect(expense.id)} className="text-gray-400 hover:text-emerald-500 transition-colors flex-shrink-0">
                        {isSelected ? <SquareCheck className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                      </button>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-950 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[var(--foreground)] truncate">{expense.title}</h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-[var(--muted)]">
                          {expense.vendor && <span className="truncate max-w-[120px] sm:max-w-none">{expense.vendor}</span>}
                          <span>{expense.category}</span>
                          <span className="hidden sm:inline">{formatDate(expense.date)}</span>
                          {!isOwner && (
                            <span className="text-xs hidden lg:inline">by {expense.user.firstName} {expense.user.lastName}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        {expense.currency !== "UGX" && expense.amountUGX && (
                          <p className="text-[11px] text-[var(--muted)]">
                            {formatCurrency(expense.amountUGX)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/expenses/${expense.id}`}>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </motion.button>
                        </Link>
                        {isOwner && expense.status === "DRAFT" && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleting === expense.id}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting === expense.id ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg premium-card text-xs sm:text-sm text-[var(--muted)] disabled:opacity-30 hover:border-emerald-300 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs sm:text-sm text-[var(--muted)]">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg premium-card text-xs sm:text-sm text-[var(--muted)] disabled:opacity-30 hover:border-emerald-300 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
