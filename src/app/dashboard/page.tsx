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
  AlertTriangle,
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
    thisMonthAmount: number;
    lastMonthAmount: number;
    monthOverMonth: number;
    totalCount: number;
  };
  employeeSpending: Array<{
    id: string;
    name: string;
    amount: number;
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
      value: data ? formatCurrency(data.stats.totalAmount) : "$0.00",
      icon: DollarSign,
      gradient: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/20",
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
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin ? "Admin Dashboard" : isManager ? "Manager Dashboard" : "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin
              ? "Company-wide expense overview"
              : isManager
                ? "Team expenses and pending approvals"
                : "Overview of your expense activity"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/scan">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
            >
              <ScanLine className="w-4 h-4" />
              Scan Receipt
            </motion.button>
          </Link>
          <Link href="/dashboard/expenses/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Month-over-month insight for admin/manager */}
      {canApprove && analytics && analytics.summary.monthOverMonth !== 0 && (
        <motion.div
          variants={itemVariants}
          className={`rounded-xl p-4 flex items-center gap-3 ${
            analytics.summary.monthOverMonth > 20
              ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          }`}
        >
          {analytics.summary.monthOverMonth > 20 ? (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : (
            <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">
              {analytics.summary.monthOverMonth > 0 ? "+" : ""}
              {analytics.summary.monthOverMonth}%
            </span>{" "}
            spending this month ({formatCurrency(analytics.summary.thisMonthAmount)}) compared to last month ({formatCurrency(analytics.summary.lastMonthAmount)}).
          </p>
          <Link href="/dashboard/analytics" className="ml-auto text-sm text-orange-500 hover:text-orange-600 font-medium whitespace-nowrap">
            View details
          </Link>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <motion.div
            key={stat.title}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm ${stat.shadow}`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full -translate-y-8 translate-x-8`} />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                {"alert" in stat && stat.alert && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse" />
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
          className="rounded-2xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-500" />
              Pending Approvals
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                {data?.stats.pendingCount || pendingApprovals.length}
              </span>
            </h3>
            <Link href="/dashboard/approvals" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              Review all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingApprovals.map((expense) => (
              <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer group">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {expense.user.firstName[0]}{expense.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{expense.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {expense.user.firstName} {expense.user.lastName} &middot; {expense.category} &middot; {formatDate(expense.date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  <Eye className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Expenses */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              Recent Expenses
            </h3>
            <Link href="/dashboard/expenses" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              View all →
            </Link>
          </div>

          {!data || data.recentExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No expenses yet</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Start by scanning a receipt or adding your first expense.
              </p>
              <Link href="/dashboard/scan">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
                >
                  <ScanLine className="w-4 h-4" />
                  Scan Your First Receipt
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentExpenses.map((expense) => {
                const sc = statusConfig[expense.status] || statusConfig.DRAFT;
                const StatusIcon = sc.icon;

                return (
                  <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {expense.title}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {expense.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {expense.vendor && `${expense.vendor} · `}{expense.category} · {formatDate(expense.date)}
                          {canApprove && ` · ${expense.user.firstName} ${expense.user.lastName}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      <Eye className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0" />
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
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            By Category
          </h3>

          {!data || data.categoryTotals.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No spending data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.categoryTotals.map((cat) => {
                const CatIcon = categoryIcons[cat.category] || Package;
                const pct = maxCategoryTotal > 0 ? (cat.total / maxCategoryTotal) * 100 : 0;

                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.category}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400 mb-3">
              {isAdmin ? "Company-wide spending" : isManager ? "Team spending" : "Your personal spending"}
            </p>
            <Link href="/dashboard/analytics" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              View Analytics →
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Top Spenders for Admin/Manager */}
      {canApprove && analytics && analytics.employeeSpending.length > 1 && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Top Spenders
            </h3>
            <Link href="/dashboard/analytics" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              Full report →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.employeeSpending.slice(0, 6).map((emp, i) => (
              <div
                key={emp.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                    {emp.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  {i < 3 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[9px] font-bold text-orange-500">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{emp.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{emp.count} expenses</p>
                </div>
                <p className="text-sm font-bold text-orange-500">{formatCurrency(emp.amount)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Scan Receipt", desc: "Use AI to extract expense data from a photo", icon: ScanLine, href: "/dashboard/scan", gradient: "from-orange-500 to-amber-500" },
            { title: "Add Manually", desc: "Enter expense details by hand", icon: Plus, href: "/dashboard/expenses/new", gradient: "from-blue-500 to-cyan-500" },
            ...(canApprove
              ? [{ title: "Review Approvals", desc: "Review pending expense submissions", icon: ClipboardCheck, href: "/dashboard/approvals", gradient: "from-amber-500 to-yellow-500" }]
              : []),
            { title: "View Analytics", desc: "See spending trends and charts", icon: TrendingUp, href: "/dashboard/analytics", gradient: "from-purple-500 to-pink-500" },
            { title: "Export Data", desc: "Download expense reports as CSV", icon: Download, href: "/dashboard/analytics", gradient: "from-green-500 to-emerald-500" },
          ].slice(0, 3).map((action) => (
            <Link key={action.title} href={action.href}>
              <motion.div
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg mb-4`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
                  {action.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{action.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
