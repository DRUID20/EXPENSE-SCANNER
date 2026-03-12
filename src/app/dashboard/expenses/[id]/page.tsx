"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Tag,
  Store,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileEdit,
  Send,
  Trash2,
  Receipt,
  User,
  StickyNote,
  Download,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

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
  receiptData: string | null;
  receiptPath: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  approvedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  DRAFT: { label: "Draft", color: "text-[var(--muted)]", bgColor: "bg-gray-100 dark:bg-gray-800", icon: FileEdit },
  PENDING: { label: "Pending Approval", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-950", icon: Clock },
  APPROVED: { label: "Approved", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-950", icon: XCircle },
};

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    async function fetchExpense() {
      try {
        const res = await fetch(`/api/expenses/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setExpense(data.expense);
        } else {
          router.push("/dashboard/expenses");
        }
      } catch {
        router.push("/dashboard/expenses");
      } finally {
        setLoading(false);
      }
    }
    fetchExpense();
  }, [params.id, router]);

  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === "REJECTED" && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }

      const res = await fetch(`/api/expenses/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setExpense(data.expense);
        setShowRejectForm(false);
        setRejectionReason("");
      }
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/expenses/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/expenses");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!expense) return null;

  const status = statusConfig[expense.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;
  const isOwner = user?.id === expense.user.id;
  const canApprove = user?.role === "ADMIN" && expense.status === "PENDING";
  const canEdit = isOwner && expense.status === "DRAFT";
  const canSubmit = isOwner && expense.status === "DRAFT";
  const canDelete = isOwner && expense.status === "DRAFT";

  let parsedReceiptData = null;
  if (expense.receiptData) {
    try {
      parsedReceiptData = JSON.parse(expense.receiptData);
    } catch { /* ignore */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/expenses">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--foreground)] tracking-tight">{expense.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
              <span className="text-sm text-[var(--muted)]">
                Created {formatDate(expense.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/dashboard/expenses/${expense.id}/edit`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-[var(--muted)] text-sm font-medium hover:border-emerald-300 transition-colors"
              >
                <FileEdit className="w-4 h-4" />
                Edit
              </motion.button>
            </Link>
          )}
          {canSubmit && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStatusUpdate("PENDING")}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 btn-primary text-sm disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </motion.button>
          )}
          {canDelete && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-red-200/50 dark:border-red-800/30 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense details card */}
          <div className="premium-card p-4 lg:p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Expense Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-gray-400"><DollarSign className="w-4 h-4" /></span>
                  <span className="text-xs text-[var(--muted)] font-medium">Amount</span>
                </div>
                <p className="text-lg font-semibold text-emerald-500">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
                {expense.currency !== "UGX" && expense.amountUGX && (
                  <div className="mt-1">
                    <p className="text-sm text-[var(--foreground)] font-medium">
                      {formatCurrency(expense.amountUGX)}
                    </p>
                    {expense.exchangeRate && (
                      <p className="text-[11px] text-[var(--muted)]">
                        Rate: 1 {expense.currency} = {expense.exchangeRate.toLocaleString()} UGX
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DetailField icon={<Calendar className="w-4 h-4" />} label="Date" value={formatDate(expense.date)} />
              <DetailField icon={<Tag className="w-4 h-4" />} label="Category" value={expense.category} />
              <DetailField icon={<Store className="w-4 h-4" />} label="Vendor" value={expense.vendor} />
            </div>

            {expense.description && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-[var(--muted)] mb-1">Description</p>
                <p className="text-sm text-[var(--foreground)]">{expense.description}</p>
              </div>
            )}

            {expense.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-[var(--muted)] mb-1 flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5" /> Notes
                </p>
                <p className="text-sm text-[var(--foreground)]">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Line Items from AI scan */}
          {parsedReceiptData?.lineItems && parsedReceiptData.lineItems.length > 0 && (
            <div className="premium-card p-4 lg:p-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">
                Line Items (AI Extracted)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 text-[var(--muted)] font-medium">Item</th>
                    <th className="text-right py-2 text-[var(--muted)] font-medium">Qty</th>
                    <th className="text-right py-2 text-[var(--muted)] font-medium">Price</th>
                    <th className="text-right py-2 text-[var(--muted)] font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedReceiptData.lineItems.map((item: { description: string; quantity: number; unitPrice: number; total: number }, i: number) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="py-2.5 text-[var(--foreground)]">{item.description}</td>
                      <td className="py-2.5 text-right text-[var(--muted)]">{item.quantity}</td>
                      <td className="py-2.5 text-right text-[var(--muted)]">
                        {formatCurrency(item.unitPrice, expense.currency)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-[var(--foreground)]">
                        {formatCurrency(item.total, expense.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rejection reason */}
          {expense.status === "REJECTED" && expense.rejectionReason && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-6">
              <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Rejection Reason
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">{expense.rejectionReason}</p>
              {expense.approvedBy && (
                <p className="text-xs text-red-400 mt-2">
                  Rejected by {expense.approvedBy.firstName} {expense.approvedBy.lastName}
                  {expense.approvedAt && ` on ${formatDate(expense.approvedAt)}`}
                </p>
              )}
            </div>
          )}

          {/* Approval actions for managers/admins */}
          {canApprove && (
            <div className="premium-card p-4 lg:p-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">Review Decision</h3>

              {showRejectForm ? (
                <div className="space-y-3">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl input-premium text-[var(--foreground)] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStatusUpdate("REJECTED")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Confirm Rejection
                    </motion.button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStatusUpdate("APPROVED")}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-green-500 text-white font-semibold text-sm shadow-lg shadow-green-500/25 disabled:opacity-60"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-white dark:bg-white/[0.04] border border-red-200 dark:border-red-500/20 text-red-500 font-medium text-sm disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {/* Approval info */}
          {expense.status === "APPROVED" && expense.approvedBy && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-6">
              <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Approved
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                by {expense.approvedBy.firstName} {expense.approvedBy.lastName}
                {expense.approvedAt && ` on ${formatDate(expense.approvedAt)}`}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Receipt Image */}
          {(expense.receiptPath || expense.receiptUrl) && (
            <div className="premium-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Receipt
                </h4>
                <a
                  href={expense.receiptPath || expense.receiptUrl || ""}
                  download={`receipt-${expense.id}.jpg`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
              <img
                src={expense.receiptPath || expense.receiptUrl || ""}
                alt="Receipt"
                className="w-full rounded-xl shadow-sm cursor-pointer"
                onClick={() => window.open(expense.receiptPath || expense.receiptUrl || "", "_blank")}
              />
            </div>
          )}

          {/* Submitted by */}
          <div className="premium-card p-4">
            <h4 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              Submitted By
            </h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {expense.user.firstName[0]}{expense.user.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {expense.user.firstName} {expense.user.lastName}
                </p>
                <p className="text-xs text-[var(--muted)]">{expense.user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailField({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs text-[var(--muted)] font-medium">{label}</span>
      </div>
      <p
        className={`text-sm font-semibold ${
          highlight ? "text-emerald-500 text-lg" : value ? "text-[var(--foreground)]" : "text-gray-400 italic"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
