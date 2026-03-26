"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { usePolling } from "@/hooks/usePolling";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ScanLine,
  Plus,
  Fuel,
  Wrench,
  ShoppingCart,
  Coffee,
  Car,
  Zap,
  Package,
  HelpCircle,
  Cog,
  Eye,
  FileEdit,
  Users,
  ClipboardCheck,
  Download,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalAmount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
  };
  recentExpenses: Array<{
    id: string;
    title: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    status: string;
    vendor: string | null;
    user: { firstName: string; lastName: string };
  }>;
  categoryTotals: Array<{
    category: string;
    total: number;
  }>;
}

interface AnalyticsSummary {
  summary: {
    totalAmount: number;
    avgAmount: number;
    totalCount: number;
  };
  topSpenders: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    total: number;
    count: number;
  }>;
}

const categoryIcons: Record<string, React.ElementType> = {
  "Fuel & Gas": Fuel,
  Equipment: Wrench,
  "Office Supplies": ShoppingCart,
  Meals: Coffee,
  "Transport & Accommodation": Car,
  Utilities: Zap,
  "Repair & Maintenance": Wrench,
  "Vehicle Repairs & Maintenance": Car,
  "Generator Expenses": Cog,
  Other: Package,
};

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  DRAFT: { color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-[var(--muted)]", icon: FileEdit },
  PENDING: { color: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400", icon: Clock },
  APPROVED: { color: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400", icon: CheckCircle2 },
  REJECTED: { color: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400", icon: XCircle },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function DashboardSkeleton() {
  return (
    <div className="space-y-5 lg:space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="h-7 w-48 rounded shimmer" />
          <div className="h-4 w-64 rounded shimmer mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 rounded-xl shimmer" />
          <div className="h-10 w-32 rounded-xl shimmer" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="premium-card p-4 lg:p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-3 w-20 rounded shimmer" />
                <div className="h-8 w-28 rounded shimmer mt-2" />
              </div>
              <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl shimmer" />
            </div>
          </div>
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2 premium-card p-4 lg:p-6">
          <div className="h-5 w-36 rounded shimmer mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5">
                <div className="w-9 h-9 rounded-lg shimmer" />
                <div className="flex-1">
                  <div className="h-4 w-40 rounded shimmer mb-1.5" />
                  <div className="h-3 w-56 rounded shimmer" />
                </div>
                <div className="h-4 w-24 rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
        <div className="premium-card p-4 lg:p-6">
          <div className="h-5 w-28 rounded shimmer mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg shimmer" />
                <div className="flex-1">
                  <div className="h-3 w-full rounded shimmer mb-2" />
                  <div className="h-1 w-full rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCachedDashboard(period: string) {
  try {
    const raw = sessionStorage.getItem(`dashboard_cache_${period}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState("all");
  const cached = typeof window !== "undefined" ? getCachedDashboard("all") : null;
  const [data, setData] = useState<DashboardData | null>(cached?.data ?? null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(cached?.analytics ?? null);
  const [pendingApprovals, setPendingApprovals] = useState<DashboardData["recentExpenses"]>(cached?.pending ?? []);
  const [loading, setLoading] = useState(!cached);
  const [budgets, setBudgets] = useState<Array<{
    id: string; name: string; amount: number; spent: number; percentage: number;
    period: string; branchName: string | null; category: string | null;
  }>>([]);

  const isAdmin = user?.role === "ADMIN";
  const canApprove = isAdmin;

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      const periodCache = typeof window !== "undefined" ? getCachedDashboard(period) : null;
      if (periodCache) {
        setData(periodCache.data);
        setAnalytics(periodCache.analytics);
        setPendingApprovals(periodCache.pending ?? []);
        setLoading(false);
        return;
      }
      setData(null);
      setLoading(true);
    }

    try {
      const [dashRes, analyticsRes, pendingRes, budgetRes] = await Promise.all([
        fetch(`/api/dashboard?period=${period}`),
        canApprove ? fetch("/api/analytics?months=2") : Promise.resolve(null),
        canApprove ? fetch("/api/expenses?status=PENDING&limit=5") : Promise.resolve(null),
        canApprove ? fetch("/api/budgets") : Promise.resolve(null),
      ]);

      const dashData = await dashRes.json();
      if (dashRes.ok) {
        setData(dashData);
      } else if (!silent) {
        toast.error("Failed to load dashboard data");
      }

      let aData = null;
      if (analyticsRes && analyticsRes.ok) {
        aData = await analyticsRes.json();
        setAnalytics(aData);
      }

      let pendingData: DashboardData["recentExpenses"] = [];
      if (pendingRes && pendingRes.ok) {
        const pData = await pendingRes.json();
        pendingData = pData.expenses;
        setPendingApprovals(pendingData);
      }

      if (budgetRes && budgetRes.ok) {
        const bData = await budgetRes.json();
        setBudgets(bData.budgets || []);
      }

      // Cache for instant load on return
      try {
        sessionStorage.setItem(`dashboard_cache_${period}`, JSON.stringify({
          ts: Date.now(),
          data: dashRes.ok ? dashData : null,
          analytics: aData,
          pending: pendingData,
        }));
      } catch { /* quota exceeded is fine */ }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (!silent) toast.error("Network error loading dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canApprove, toast, period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Poll every 15s for real-time sync across devices
  usePolling(() => fetchDashboard(true), 15000);

  const stats = [
    {
      title: isAdmin ? "Company Spending" : "Total Expenses",
      value: data ? formatCurrency(data.stats.totalAmount) : "UGX 0",
      icon: DollarSign,
      gradient: "from-[var(--gradient-from)] to-[var(--gradient-to)]",
      shadow: "shadow-sm",
    },
    {
      title: canApprove ? "Awaiting Approval" : "Pending Approval",
      value: data ? String(data.stats.pendingCount) : "0",
      icon: Clock,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/20",
      alert: canApprove && data && data.stats.pendingCount > 0,
    },
    {
      title: "Approved",
      value: data ? String(data.stats.approvedCount) : "0",
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      shadow: "shadow-green-500/20",
    },
    {
      title: "Rejected",
      value: data ? String(data.stats.rejectedCount) : "0",
      icon: XCircle,
      gradient: "from-red-500 to-rose-500",
      shadow: "shadow-red-500/20",
    },
  ];

  const maxCategoryTotal = data?.categoryTotals?.length
    ? Math.max(...data.categoryTotals.map((c) => c.total))
    : 0;

  if (loading) return <DashboardSkeleton />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 lg:space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--foreground)] tracking-tight">
            {isAdmin ? "Admin Dashboard" : "Dashboard"}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {isAdmin
              ? "Company-wide expense overview"
              : "Overview of your expense activity"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
          {[
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
            { id: "quarter", label: "Quarter" },
            { id: "year", label: "Year" },
            { id: "all", label: "All" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.id
                  ? "bg-white dark:bg-white/10 shadow-sm text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/scan">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary flex items-center gap-2 px-4 lg:px-5 py-2.5 text-sm"
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Receipt</span>
              <span className="sm:hidden">Scan</span>
            </motion.button>
          </Link>
          <Link href="/dashboard/expenses/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 lg:px-5 py-2.5 rounded-xl border font-medium text-sm transition-colors"
              style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>


      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.title}
            variants={itemVariants}
            className="premium-card relative overflow-hidden p-4 lg:p-5"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-[0.04] rounded-full -translate-y-8 translate-x-8`} />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-[11px] lg:text-xs text-[var(--muted)] font-medium uppercase tracking-wider">{stat.title}</p>
                <p className="text-xl lg:text-3xl font-bold text-[var(--foreground)] mt-1.5 tracking-tight">{stat.value}</p>
              </div>
              <div className="relative">
                <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                  <stat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                {"alert" in stat && stat.alert && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white border-[var(--background)] animate-pulse" />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pending Approvals Banner for Managers/Admins */}
      {canApprove && pendingApprovals.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="premium-card p-4 lg:p-6 border-amber-200/50 dark:border-amber-500/10"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm lg:text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-500" />
              Pending Approvals
              <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                {data?.stats.pendingCount || pendingApprovals.length}
              </span>
            </h3>
            <Link href="/dashboard/approvals" className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium flex items-center gap-1">
              Review all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-1">
            {pendingApprovals.map((expense) => (
              <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {expense.user.firstName[0]}{expense.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{expense.title}</p>
                    <p className="text-[11px] text-[var(--muted)] truncate">
                      {expense.user.firstName} {expense.user.lastName} · {expense.category} · {formatDate(expense.date)}
                    </p>
                  </div>
                  <p className="text-[13px] font-bold text-[var(--foreground)] flex-shrink-0">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--accent)] transition-colors flex-shrink-0 hidden sm:block" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Budget Tracking */}
      {canApprove && budgets.length > 0 && (
        <motion.div variants={itemVariants} className="premium-card p-4 lg:p-6">
          <h3 className="text-sm lg:text-base font-semibold text-[var(--foreground)] flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            Budget Tracking
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b) => {
              const isOver = b.percentage >= 100;
              const isWarning = b.percentage >= 80 && b.percentage < 100;
              const barColor = isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={b.id} className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">{b.name}</p>
                    <span className={`text-xs font-bold ${isOver ? "text-red-500" : isWarning ? "text-amber-500" : "text-emerald-500"}`}>
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mb-2">
                    {b.branchName && <span>{b.branchName}</span>}
                    {b.category && <span>{b.category}</span>}
                    <span>{b.period.charAt(0) + b.period.slice(1).toLowerCase()}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, b.percentage)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${barColor}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--muted)]">
                      {formatCurrency(b.spent)} spent
                    </span>
                    <span className="text-[var(--muted)]">
                      of {formatCurrency(b.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Recent Expenses */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 premium-card p-4 lg:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--accent)]" />
              Recent Expenses
            </h3>
            <Link href="/dashboard/expenses" className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
              View all
            </Link>
          </div>

          {!data || data.recentExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center mb-3">
                <Receipt className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] text-sm mb-1.5">No expenses yet</h4>
              <p className="text-[13px] text-[var(--muted)] max-w-xs mb-4">
                Start by scanning a receipt or adding your first expense.
              </p>
              <Link href="/dashboard/scan">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <ScanLine className="w-4 h-4" />
                  Scan Your First Receipt
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {data.recentExpenses.map((expense) => {
                const sc = statusConfig[expense.status] || statusConfig.DRAFT;
                const StatusIcon = sc.icon;

                return (
                  <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                            {expense.title}
                          </p>
                          <span className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${sc.color}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {expense.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] truncate">
                          {expense.vendor && `${expense.vendor} · `}{expense.category} · {formatDate(expense.date)}
                          {canApprove && ` · ${expense.user.firstName} ${expense.user.lastName}`}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-[var(--foreground)] flex-shrink-0">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Spending by Category */}
        <motion.div
          variants={itemVariants}
          className="premium-card p-4 lg:p-6"
        >
          <h3 className="text-sm lg:text-base font-semibold text-[var(--foreground)] flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            By Category
          </h3>

          {!data || data.categoryTotals.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-[13px] text-[var(--muted)]">No spending data yet</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.categoryTotals.map((cat) => {
                const CatIcon = categoryIcons[cat.category] || Package;
                const pct = maxCategoryTotal > 0 ? (cat.total / maxCategoryTotal) * 100 : 0;

                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{cat.category}</span>
                        <span className="text-[13px] font-semibold text-[var(--foreground)]">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full bg-[var(--accent)] rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04] text-center">
            <p className="text-[11px] text-[var(--muted)] mb-2">
              {isAdmin ? "Company-wide spending" : "Your personal spending"}
            </p>
            <Link href="/dashboard/analytics" className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
              View Analytics
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Top Spenders for Admin/Manager */}
      {canApprove && analytics && analytics.topSpenders && analytics.topSpenders.length > 1 && (
        <motion.div
          variants={itemVariants}
          className="premium-card p-4 lg:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              Top Spenders
            </h3>
            <Link href="/dashboard/analytics" className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
              Full report
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.topSpenders.slice(0, 6).map((emp, i) => (
              <div
                key={emp.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center text-white text-xs font-bold">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  {i < 3 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--card-bg)] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center text-[9px] font-bold text-[var(--accent)]">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[11px] text-[var(--muted)]">{emp.count} expenses</p>
                </div>
                <p className="text-[13px] font-bold text-[var(--accent)]">{formatCurrency(emp.total)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm lg:text-base font-semibold text-[var(--foreground)] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { title: "Scan Receipt", desc: "AI-powered receipt extraction", icon: ScanLine, href: "/dashboard/scan", gradient: "from-[var(--gradient-from)] to-[var(--gradient-to)]" },
            { title: "Add Manually", desc: "Enter expense details", icon: Plus, href: "/dashboard/expenses/new", gradient: "from-blue-500 to-cyan-500" },
            ...(canApprove
              ? [{ title: "Review Approvals", desc: "Pending expense submissions", icon: ClipboardCheck, href: "/dashboard/approvals", gradient: "from-amber-500 to-yellow-500" }]
              : []),
            { title: "View Analytics", desc: "Spending trends & charts", icon: TrendingUp, href: "/dashboard/analytics", gradient: "from-purple-500 to-pink-500" },
            { title: "Export Data", desc: "Download reports as CSV", icon: Download, href: "/dashboard/analytics", gradient: "from-green-500 to-green-600" },
          ].slice(0, 3).map((action) => (
            <Link key={action.title} href={action.href}>
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                className="group premium-card p-4 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-[13px] font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  {action.title}
                </h4>
                <p className="text-[11px] text-[var(--muted)] mt-0.5 hidden sm:block">{action.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
