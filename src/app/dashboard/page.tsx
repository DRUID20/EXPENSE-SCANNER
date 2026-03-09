"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Plane,
  ShoppingCart,
  Coffee,
  Car,
  Zap,
  Briefcase,
  Package,
  HelpCircle,
  Eye,
  FileEdit,
  Users,
  ClipboardCheck,
  Download,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
  Travel: Plane,
  Supplies: ShoppingCart,
  Meals: Coffee,
  Transportation: Car,
  Utilities: Zap,
  Maintenance: Wrench,
  Office: Briefcase,
  Other: Package,
};

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  DRAFT: { color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", icon: FileEdit },
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<DashboardData["recentExpenses"]>([]);

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const canApprove = isAdmin || isManager;

  useEffect(() => {
    async function fetchAll() {
      try {
        const [dashRes, analyticsRes] = await Promise.all([
          fetch("/api/dashboard"),
          canApprove ? fetch("/api/analytics?months=2") : Promise.resolve(null),
        ]);

        const dashData = await dashRes.json();
        if (dashRes.ok) setData(dashData);

        if (analyticsRes && analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setAnalytics(aData);
        }

        // Fetch pending approvals for managers/admins
        if (canApprove) {
          const pendingRes = await fetch("/api/expenses?status=PENDING&limit=5");
          const pendingData = await pendingRes.json();
          if (pendingRes.ok) setPendingApprovals(pendingData.expenses);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    fetchAll();
  }, [canApprove]);

  const stats = [
    {
      title: isAdmin ? "Company Spending" : "Total Expenses",
      value: data ? formatCurrency(data.stats.totalAmount) : "UGX 0",
      icon: DollarSign,
      gradient: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/20",
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
      gradient: "from-green-500 to-emerald-500",
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
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isAdmin ? "Admin Dashboard" : isManager ? "Manager Dashboard" : "Dashboard"}
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {isAdmin
              ? "Company-wide expense overview"
              : isManager
                ? "Team expenses and pending approvals"
                : "Overview of your expense activity"}
          </p>
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
              className="flex items-center gap-2 px-4 lg:px-5 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors"
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
                <p className="text-[11px] lg:text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.title}</p>
                <p className="text-xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1.5 tracking-tight">{stat.value}</p>
              </div>
              <div className="relative">
                <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                  <stat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                {"alert" in stat && stat.alert && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-[#072419] animate-pulse" />
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
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-500" />
              Pending Approvals
              <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                {data?.stats.pendingCount || pendingApprovals.length}
              </span>
            </h3>
            <Link href="/dashboard/approvals" className="text-[13px] text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-1">
              Review all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-1">
            {pendingApprovals.map((expense) => (
              <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {expense.user.firstName[0]}{expense.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{expense.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {expense.user.firstName} {expense.user.lastName} · {expense.category} · {formatDate(expense.date)}
                    </p>
                  </div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 hidden sm:block" />
                </div>
              </Link>
            ))}
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
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" />
              Recent Expenses
            </h3>
            <Link href="/dashboard/expenses" className="text-[13px] text-emerald-500 hover:text-emerald-600 font-medium">
              View all
            </Link>
          </div>

          {!data || data.recentExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center mb-3">
                <Receipt className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">No expenses yet</h4>
              <p className="text-[13px] text-gray-400 max-w-xs mb-4">
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
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                            {expense.title}
                          </p>
                          <span className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${sc.color}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {expense.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                          {expense.vendor && `${expense.vendor} · `}{expense.category} · {formatDate(expense.date)}
                          {canApprove && ` · ${expense.user.firstName} ${expense.user.lastName}`}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0">
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
          <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            By Category
          </h3>

          {!data || data.categoryTotals.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-[13px] text-gray-400">No spending data yet</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.categoryTotals.map((cat) => {
                const CatIcon = categoryIcons[cat.category] || Package;
                const pct = maxCategoryTotal > 0 ? (cat.total / maxCategoryTotal) * 100 : 0;

                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-white">{cat.category}</span>
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04] text-center">
            <p className="text-[11px] text-gray-400 mb-2">
              {isAdmin ? "Company-wide spending" : isManager ? "Team spending" : "Your personal spending"}
            </p>
            <Link href="/dashboard/analytics" className="text-[13px] text-emerald-500 hover:text-emerald-600 font-medium">
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
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Top Spenders
            </h3>
            <Link href="/dashboard/analytics" className="text-[13px] text-emerald-500 hover:text-emerald-600 font-medium">
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
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  {i < 3 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-[#072419] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center text-[9px] font-bold text-emerald-500">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[11px] text-gray-400">{emp.count} expenses</p>
                </div>
                <p className="text-[13px] font-bold text-emerald-500">{formatCurrency(emp.total)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { title: "Scan Receipt", desc: "AI-powered receipt extraction", icon: ScanLine, href: "/dashboard/scan", gradient: "from-emerald-500 to-emerald-600" },
            { title: "Add Manually", desc: "Enter expense details", icon: Plus, href: "/dashboard/expenses/new", gradient: "from-blue-500 to-cyan-500" },
            ...(canApprove
              ? [{ title: "Review Approvals", desc: "Pending expense submissions", icon: ClipboardCheck, href: "/dashboard/approvals", gradient: "from-amber-500 to-yellow-500" }]
              : []),
            { title: "View Analytics", desc: "Spending trends & charts", icon: TrendingUp, href: "/dashboard/analytics", gradient: "from-purple-500 to-pink-500" },
            { title: "Export Data", desc: "Download reports as CSV", icon: Download, href: "/dashboard/analytics", gradient: "from-green-500 to-emerald-500" },
          ].slice(0, 3).map((action) => (
            <Link key={action.title} href={action.href}>
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                className="group premium-card p-4 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {action.title}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">{action.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
