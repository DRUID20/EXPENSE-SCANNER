"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Calculator,
  Calendar,
  Download,
  Loader2,
  Users,
  Store,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
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
  Area,
  AreaChart,
  Legend,
} from "recharts";

interface AnalyticsData {
  summary: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    thisMonthAmount: number;
    lastMonthAmount: number;
    monthOverMonth: number;
  };
  monthlySpending: Array<{
    month: string;
    amount: number;
    count: number;
    approved: number;
    pending: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    amount: number;
    count: number;
  }>;
  topVendors: Array<{
    vendor: string;
    amount: number;
    count: number;
  }>;
  employeeSpending: Array<{
    id: string;
    name: string;
    email: string;
    amount: number;
    count: number;
  }>;
}

const CATEGORY_COLORS = [
  "#f97316", "#f59e0b", "#84cc16", "#06b6d4", "#8b5cf6",
  "#ec4899", "#ef4444", "#14b8a6", "#6366f1", "#a855f7",
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af",
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportCategory, setExportCategory] = useState("ALL");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics?months=12");
        const json = await res.json();
        if (res.ok) setData(json);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (exportStatus && exportStatus !== "ALL") params.set("status", exportStatus);
      if (exportCategory && exportCategory !== "ALL") params.set("category", exportCategory);

      const res = await fetch(`/api/expenses/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-500">Failed to load analytics data.</div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const canSeeEmployees = isAdmin || isManager;

  const totalCategoryAmount = data.categoryBreakdown.reduce((s, c) => s + c.amount, 0);

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
            {isAdmin ? "Company Analytics" : isManager ? "Team Analytics" : "My Analytics"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin
              ? "Company-wide spending insights and trends"
              : isManager
                ? "Team expense overview and approval metrics"
                : "Personal spending trends and summaries"}
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: "Total Spending",
            value: formatCurrency(data.summary.totalAmount),
            icon: DollarSign,
            gradient: "from-orange-500 to-amber-500",
            shadow: "shadow-orange-500/20",
          },
          {
            title: "This Month",
            value: formatCurrency(data.summary.thisMonthAmount),
            subtitle: data.summary.monthOverMonth !== 0
              ? `${data.summary.monthOverMonth > 0 ? "+" : ""}${data.summary.monthOverMonth}% vs last month`
              : "No change vs last month",
            subtitleColor: data.summary.monthOverMonth > 0 ? "text-red-500" : data.summary.monthOverMonth < 0 ? "text-green-500" : "text-gray-400",
            icon: data.summary.monthOverMonth > 0 ? TrendingUp : TrendingDown,
            gradient: "from-blue-500 to-cyan-500",
            shadow: "shadow-blue-500/20",
          },
          {
            title: "Total Expenses",
            value: String(data.summary.totalCount),
            icon: Receipt,
            gradient: "from-purple-500 to-pink-500",
            shadow: "shadow-purple-500/20",
          },
          {
            title: "Avg. Expense",
            value: formatCurrency(data.summary.averageAmount),
            icon: Calculator,
            gradient: "from-green-500 to-emerald-500",
            shadow: "shadow-green-500/20",
          },
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                {stat.subtitle && (
                  <p className={`text-xs mt-1 font-medium ${stat.subtitleColor}`}>{stat.subtitle}</p>
                )}
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Monthly Spending Chart */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Monthly Spending
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-orange-500" /> Approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-300" /> Pending
            </span>
          </div>
        </div>

        {data.monthlySpending.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.monthlySpending}>
              <defs>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fcd34d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fcd34d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}${v >= 1000 ? "k" : ""}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="approved"
                name="Approved"
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorApproved)"
              />
              <Area
                type="monotone"
                dataKey="pending"
                name="Pending"
                stroke="#fcd34d"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPending)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">No spending data available</div>
        )}
      </motion.div>

      {/* Category + Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-orange-500" />
            Spending by Category
          </h3>

          {data.categoryBreakdown.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="category"
                    >
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: "var(--tooltip-bg, #fff)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5 max-h-48 overflow-y-auto">
                {data.categoryBreakdown.map((cat, i) => (
                  <div key={cat.category} className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                      {cat.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(cat.amount)}
                    </span>
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {totalCategoryAmount > 0
                        ? `${Math.round((cat.amount / totalCategoryAmount) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">No category data</div>
          )}
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-orange-500" />
            Status Distribution
          </h3>

          {data.statusBreakdown.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="status"
                      >
                        {data.statusBreakdown.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#9ca3af"} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) =>
                          value.charAt(0) + value.slice(1).toLowerCase()
                        }
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} expenses`,
                          String(name).charAt(0) + String(name).slice(1).toLowerCase(),
                        ]}
                        contentStyle={{
                          backgroundColor: "var(--tooltip-bg, #fff)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          fontSize: "13px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-3">
                {data.statusBreakdown.map((s) => {
                  const totalCount = data.statusBreakdown.reduce((sum, x) => sum + x.count, 0);
                  const pct = totalCount > 0 ? (s.count / totalCount) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[s.status] || "#9ca3af" }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-500">
                        {s.count}
                      </span>
                      <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[s.status] || "#9ca3af" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">No status data</div>
          )}
        </motion.div>
      </div>

      {/* Top Vendors */}
      {data.topVendors.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <Store className="w-5 h-5 text-orange-500" />
            Top Vendors
          </h3>

          <ResponsiveContainer width="100%" height={Math.max(200, data.topVendors.length * 40)}>
            <BarChart data={data.topVendors} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <YAxis
                type="category"
                dataKey="vendor"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="amount"
                name="Total Spent"
                fill="#f97316"
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Employee Spending (Admin/Manager only) */}
      {canSeeEmployees && data.employeeSpending.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-orange-500" />
            Spending by Employee
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Employee</th>
                  <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Expenses</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium w-40">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.employeeSpending.map((emp) => {
                  const maxAmount = Math.max(...data.employeeSpending.map((e) => e.amount));
                  const pct = maxAmount > 0 ? (emp.amount / maxAmount) * 100 : 0;
                  return (
                    <tr key={emp.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                            {emp.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{emp.email}</td>
                      <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400">{emp.count}</td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(emp.amount)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Export Section */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-orange-500" />
          Export Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Download expense data for reporting, accounting, or record-keeping.
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Status Filter</label>
            <div className="relative">
              <select
                value={exportStatus || "ALL"}
                onChange={(e) => setExportStatus(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Category Filter</label>
            <div className="relative">
              <select
                value={exportCategory}
                onChange={(e) => setExportCategory(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {data.categoryBreakdown.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport("csv")}
            disabled={exporting}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export CSV
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport("json")}
            disabled={exporting}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-orange-300 transition-colors disabled:opacity-60"
          >
            Export JSON
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
