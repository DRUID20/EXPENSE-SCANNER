"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  ScanLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Send,
  Square,
  CheckSquare,
  MinusSquare,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
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
  "ALL",
  "Fuel & Gas",
  "Equipment",
  "Travel",
  "Supplies",
  "Meals",
  "Transportation",
  "Utilities",
  "Maintenance",
  "Office",
  "Other",
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", icon: FileEdit },
  PENDING: { label: "Pending", color: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400", icon: XCircle },
};

type SortField = "title" | "amount" | "date" | "status" | "category" | "createdAt";

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [expenses]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(null);
    }
  };

  // Bulk selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  };

  const handleBulkAction = async (action: string, rejectionReason?: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const actionLabels: Record<string, string> = {
      approve: "approve",
      reject: "reject",
      submit: "submit for approval",
      delete: "delete",
    };

    if (!confirm(`Are you sure you want to ${actionLabels[action] || action} ${ids.length} expense(s)?`)) return;

    setBulkLoading(true);
    try {
      const body: Record<string, unknown> = { action, ids };
      if (rejectionReason) body.rejectionReason = rejectionReason;

      const res = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSelectedIds(new Set());
        fetchExpenses();
      }
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />;
    return sortOrder === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-orange-500" />;
  };

  // Determine which bulk actions are available based on selected items
  const selectedExpenses = expenses.filter((e) => selectedIds.has(e.id));
  const hasDrafts = selectedExpenses.some((e) => e.status === "DRAFT" && e.user.id === user?.id);
  const hasPending = selectedExpenses.some((e) => e.status === "PENDING");
  const canBulkApprove = hasPending && (user?.role === "MANAGER" || user?.role === "ADMIN");
  const canBulkDelete = hasDrafts || user?.role === "ADMIN";

  const isAllSelected = expenses.length > 0 && selectedIds.size === expenses.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < expenses.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} expense{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/scan">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 font-medium hover:border-orange-300 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              Scan Receipt
            </motion.button>
          </Link>
          <Link href="/dashboard/expenses/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
            >
              <Plus className="w-4 h-4" />
              New Expense
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 pl-4 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
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
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 pl-4 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
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

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                {selectedIds.size} selected
              </span>
              <div className="h-4 w-px bg-orange-200 dark:bg-orange-800" />

              {hasDrafts && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleBulkAction("submit")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  Submit
                </motion.button>
              )}

              {canBulkApprove && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBulkAction("approve")}
                    disabled={bulkLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBulkAction("reject")}
                    disabled={bulkLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </motion.button>
                </>
              )}

              {canBulkDelete && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleBulkAction("delete")}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-500 text-xs font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </motion.button>
              )}

              {bulkLoading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin ml-2" />}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-orange-500 hover:text-orange-700 font-medium"
              >
                Clear selection
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No expenses found
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
              {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
                ? "Try adjusting your filters to find what you're looking for."
                : "Start by scanning a receipt or adding a new expense manually."}
            </p>
            {!search && statusFilter === "ALL" && (
              <div className="flex gap-3">
                <Link href="/dashboard/scan">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
                  >
                    <ScanLine className="w-4 h-4" />
                    Scan Receipt
                  </motion.button>
                </Link>
                <Link href="/dashboard/expenses/new">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Manually
                  </motion.button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="hidden md:flex items-center gap-4 px-5 py-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="w-8 flex-shrink-0">
              <button onClick={toggleSelectAll} className="text-gray-400 hover:text-orange-500 transition-colors">
                {isAllSelected ? (
                  <CheckSquare className="w-4.5 h-4.5" />
                ) : isSomeSelected ? (
                  <MinusSquare className="w-4.5 h-4.5" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
              </button>
            </div>
            <div className="w-10 flex-shrink-0" />
            <button onClick={() => handleSort("title")} className="flex items-center gap-1 flex-1 min-w-0 hover:text-orange-500 transition-colors">
              Title <SortIcon field="title" />
            </button>
            <button onClick={() => handleSort("category")} className="flex items-center gap-1 w-28 hover:text-orange-500 transition-colors">
              Category <SortIcon field="category" />
            </button>
            <button onClick={() => handleSort("date")} className="flex items-center gap-1 w-28 hover:text-orange-500 transition-colors">
              Date <SortIcon field="date" />
            </button>
            <button onClick={() => handleSort("status")} className="flex items-center gap-1 w-24 hover:text-orange-500 transition-colors">
              Status <SortIcon field="status" />
            </button>
            <button onClick={() => handleSort("amount")} className="flex items-center gap-1 justify-end w-28 hover:text-orange-500 transition-colors">
              Amount <SortIcon field="amount" />
            </button>
            <div className="w-20 flex-shrink-0" />
          </div>

          {/* Expense Rows */}
          <div className="space-y-2">
            <AnimatePresence>
              {expenses.map((expense, i) => {
                const status = statusConfig[expense.status] || statusConfig.DRAFT;
                const StatusIcon = status.icon;
                const isOwner = user?.id === expense.user.id;
                const isSelected = selectedIds.has(expense.id);

                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className={`group rounded-2xl bg-white dark:bg-gray-900 border p-4 md:p-5 transition-colors cursor-pointer ${
                      isSelected
                        ? "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(expense.id); }}
                        className="w-8 flex-shrink-0 text-gray-400 hover:text-orange-500 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-orange-500" />
                        ) : (
                          <Square className="w-4.5 h-4.5" />
                        )}
                      </button>

                      {/* Category icon */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950 dark:to-amber-950 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {expense.title}
                          </h4>
                          <span className={`md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          {expense.vendor && <span className="truncate">{expense.vendor}</span>}
                          <span className="md:hidden">{expense.category}</span>
                          <span className="md:hidden">{formatDate(expense.date)}</span>
                          {!isOwner && (
                            <span className="text-xs">
                              by {expense.user.firstName} {expense.user.lastName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Desktop columns */}
                      <div className="hidden md:block w-28 text-sm text-gray-600 dark:text-gray-400 truncate">
                        {expense.category}
                      </div>
                      <div className="hidden md:block w-28 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(expense.date)}
                      </div>
                      <div className="hidden md:block w-24">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="text-right w-28 flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 w-20 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/expenses/${expense.id}`}>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                        </Link>
                        {isOwner && expense.status === "DRAFT" && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleting === expense.id}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting === expense.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-colors disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <motion.button
                      key={pageNum}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:border-orange-300"
                      }`}
                    >
                      {pageNum}
                    </motion.button>
                  );
                })}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-colors disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
