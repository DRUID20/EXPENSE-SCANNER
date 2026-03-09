"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Download,
  ChevronDown,
  Loader2,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AnalyticsData {
  summary: {
    totalAmount: number;
    avgAmount: number;
    totalCount: number;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
    approved: number;
    rejected: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  topSpenders: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    total: number;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    category: string;
    user: { firstName: string; lastName: string };
  }>;
}

const COLORS = ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1", "#84cc16"];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af",
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?period=${period}`);
        const json = await res.json();
        if (res.ok) setData(json);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [period]);

  const handleExport = async () => {
    const res = await fetch("/api/export?format=csv");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_report_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatMonth = (month: string) => {
    const [y, m] = month.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === "ADMIN"
              ? "Company-wide spending insights"
              : user?.role === "MANAGER"
              ? "Team spending insights"
              : "Your personal spending insights"}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 pl-4 pr-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
            >
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
          >
            <Download className="w-4 h-4" />
            Export Report
          </motion.button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Total Spending", value: formatCurrency(data.summary.totalAmount), icon: DollarSign, gradient: "from-orange-500 to-amber-500", shadow: "shadow-orange-500/20" },
          { title: "Average Expense", value: formatCurrency(data.summary.avgAmount), icon: TrendingUp, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/20" },
          { title: "Total Expenses", value: String(data.summary.totalCount), icon: Receipt, gradient: "from-purple-500 to-pink-500", shadow: "shadow-purple-500/20" },
        ].map((stat) => (
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
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Trend */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Trend</h3>
          </div>
          {data.monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                  labelFormatter={(label) => formatMonth(String(label))}
                />
                <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Category Breakdown - Pie Chart */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">By Category</h3>
          </div>
          {data.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="category"
                >
                  {data.categoryBreakdown.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Category Spending</h3>
          </div>
          {data.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {data.categoryBreakdown.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Status Breakdown + Top Spenders */}
        <motion.div
          variants={itemVariants}
          className="space-y-6"
        >
          {/* Status Breakdown */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              {data.statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s.status] || "#9ca3af" }}
                  />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.status}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.count}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(s.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Spenders (Admin/Manager only) */}
          {user?.role !== "EMPLOYEE" && data.topSpenders.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Spenders</h3>
              </div>
              <div className="space-y-3">
                {data.topSpenders.slice(0, 5).map((spender, i) => (
                  <div key={spender.userId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {spender.firstName} {spender.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{spender.count} expenses</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(spender.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
