"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Square,
  CheckSquare,
  MinusSquare,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  vendor: string | null;
  date: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ApprovalsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Rejection modal
  const [rejectTarget, setRejectTarget] = useState<{ type: "single"; id: string } | { type: "bulk" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      if (search) params.set("search", search);
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
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [expenses]);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", reason?: string) => {
    setActionLoading(id);
    try {
      const body: Record<string, string> = { status };
      if (status === "REJECTED" && reason) {
        body.rejectionReason = reason;
      }

      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget) return;

    if (rejectTarget.type === "single") {
      handleAction(rejectTarget.id, "REJECTED", rejectionReason);
    } else {
      handleBulkAction("reject", rejectionReason);
    }
    setRejectTarget(null);
    setRejectionReason("");
  };

  // Bulk operations
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

  const handleBulkAction = async (action: string, reason?: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkLoading(true);
    try {
      const body: Record<string, unknown> = { action, ids };
      if (reason) body.rejectionReason = reason;

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

  const pendingSelected = expenses.filter(
    (e) => selectedIds.has(e.id) && e.status === "PENDING"
  );
  const isAllSelected = expenses.length > 0 && selectedIds.size === expenses.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < expenses.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Approvals</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Review and approve expense submissions ({total} total)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-premium h-10 pl-9 pr-4 w-48"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-premium h-10 pl-4 pr-8 appearance-none cursor-pointer"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && pendingSelected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {pendingSelected.length} pending selected
              </span>
              <div className="h-4 w-px bg-emerald-200 dark:bg-emerald-800" />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleBulkAction("approve")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve All
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setRejectTarget({ type: "bulk" })}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject All
              </motion.button>

              {bulkLoading && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin ml-2" />}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-emerald-500 hover:text-emerald-700 font-medium"
              >
                Clear
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="premium-card p-10 lg:p-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <ClipboardCheck className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {filter.toLowerCase()} expenses
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {filter === "PENDING"
                ? "There are no expenses waiting for your review right now."
                : "No expenses match this filter."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Select All Header (for pending filter) */}
          {filter === "PENDING" && expenses.length > 0 && (
            <div className="flex items-center gap-3 px-5 py-2 mb-2">
              <button onClick={toggleSelectAll} className="text-gray-400 hover:text-emerald-500 transition-colors">
                {isAllSelected ? (
                  <CheckSquare className="w-4.5 h-4.5" />
                ) : isSomeSelected ? (
                  <MinusSquare className="w-4.5 h-4.5" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Select all
              </span>
            </div>
          )}

          <div className="space-y-3">
            <AnimatePresence>
              {expenses.map((expense, i) => {
                const isSelected = selectedIds.has(expense.id);

                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: i * 0.03 }}
                    className={`premium-card p-3 lg:p-5 transition-colors ${
                      isSelected
                        ? "!border-emerald-300 dark:!border-emerald-700 !bg-emerald-50/50 dark:!bg-emerald-950/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      {/* Checkbox for pending items */}
                      {expense.status === "PENDING" && (
                        <button
                          onClick={() => toggleSelect(expense.id)}
                          className="text-gray-400 hover:text-emerald-500 transition-colors flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </button>
                      )}

                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-950 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-6 h-6 text-emerald-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {expense.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {expense.user.firstName[0]}{expense.user.lastName[0]}
                            </span>
                            {expense.user.firstName} {expense.user.lastName}
                          </span>
                          <span>{expense.category}</span>
                          <span>{formatDate(expense.date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white flex-shrink-0">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>

                      {expense.status === "PENDING" ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAction(expense.id, "APPROVED")}
                            disabled={actionLoading === expense.id}
                            className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            {actionLoading === expense.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setRejectTarget({ type: "single", id: expense.id })}
                            disabled={actionLoading === expense.id}
                            className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </motion.button>
                          <Link href={`/dashboard/expenses/${expense.id}`}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-emerald-500 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {expense.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {expense.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                          <Link href={`/dashboard/expenses/${expense.id}`}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-emerald-500 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                          </Link>
                        </div>
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
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-lg premium-card flex items-center justify-center text-gray-500 hover:text-emerald-500 transition-colors disabled:opacity-40"
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
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                          : "premium-card text-gray-600 dark:text-gray-400 hover:text-emerald-500"
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
                  className="w-9 h-9 rounded-lg premium-card flex items-center justify-center text-gray-500 hover:text-emerald-500 transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setRejectTarget(null); setRejectionReason(""); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md premium-card p-5 lg:p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Reject {rejectTarget.type === "bulk" ? `${selectedIds.size} Expense(s)` : "Expense"}
                </h3>
                <button
                  onClick={() => { setRejectTarget(null); setRejectionReason(""); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Provide a reason for rejection (optional but recommended):
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Missing receipt, exceeds budget, incorrect category..."
                rows={3}
                autoFocus
                className="input-premium w-full px-4 py-3 resize-none mb-4 focus:!ring-red-500"
              />

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRejectConfirm}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 h-11 !bg-red-500 hover:!bg-red-600"
                >
                  <XCircle className="w-4 h-4" />
                  Confirm Rejection
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setRejectTarget(null); setRejectionReason(""); }}
                  className="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-[#072419] border border-black/[0.06] dark:border-white/[0.06] text-gray-600 dark:text-gray-400 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
