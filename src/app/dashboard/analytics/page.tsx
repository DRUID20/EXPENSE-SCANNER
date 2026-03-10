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
  ScrollText,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  FileEdit,
  Eye,
  Store,
  MapPin,
} from "lucide-react";
import Link from "next/link";
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

interface VendorItem {
  vendor: string;
  total: number;
  count: number;
  avgAmount: number;
}

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
  vendorBreakdown: VendorItem[];
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

const COLORS = ["#03D47C", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1", "#84cc16"];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af",
  PENDING: "#00C271",
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

interface AuditExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  vendor: string | null;
  date: string;
  status: string;
  receiptPath: string | null;
  receiptUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  user: { firstName: string; lastName: string; email: string };
  approvedBy: { firstName: string; lastName: string } | null;
}

type ViewTab = "charts" | "vendors" | "audit";

const statusIcons: Record<string, React.ElementType> = {
  DRAFT: FileEdit,
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const statusBadgeColors: Record<string, string> = {
  DRAFT: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  PENDING: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400",
  REJECTED: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");
  const [viewTab, setViewTab] = useState<ViewTab>("charts");
  const [auditExpenses, setAuditExpenses] = useState<AuditExpense[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditStatus, setAuditStatus] = useState("ALL");
  const [auditBranch, setAuditBranch] = useState("ALL");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Fetch branches for filter
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch("/api/branches/public");
        const json = await res.json();
        if (res.ok) setBranches(json.branches || []);
      } catch {
        // ignore
      }
    }
    fetchBranches();
  }, []);

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

  useEffect(() => {
    if (viewTab !== "audit") return;
    async function fetchAuditExpenses() {
      setAuditLoading(true);
      try {
        const params = new URLSearchParams({ page: String(auditPage), limit: "20" });
        if (auditStatus !== "ALL") params.set("status", auditStatus);
        if (auditBranch !== "ALL") params.set("branchId", auditBranch);
        if (auditDateFrom) params.set("dateFrom", auditDateFrom);
        if (auditDateTo) params.set("dateTo", auditDateTo);
        const res = await fetch(`/api/expenses?${params}`);
        const json = await res.json();
        if (res.ok) {
          setAuditExpenses(json.expenses);
          setAuditTotal(json.pagination.total);
        }
      } catch (err) {
        console.error("Audit fetch error:", err);
      } finally {
        setAuditLoading(false);
      }
    }
    fetchAuditExpenses();
  }, [viewTab, auditStatus, auditBranch, auditDateFrom, auditDateTo, auditPage]);

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
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
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
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Analytics & Reports</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {user?.role === "ADMIN"
              ? "Company-wide spending insights"
              : user?.role === "MANAGER"
              ? "Team spending insights"
              : "Your personal spending insights"}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {(viewTab === "charts" || viewTab === "vendors") && (
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-10 pl-4 pr-8 rounded-xl input-premium text-gray-600 dark:text-gray-400 appearance-none cursor-pointer"
              >
                <option value="1month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}
          {viewTab === "audit" && (
            <>
              <div className="relative">
                <select
                  value={auditStatus}
                  onChange={(e) => { setAuditStatus(e.target.value); setAuditPage(1); }}
                  className="h-10 pl-4 pr-8 rounded-xl input-premium text-gray-600 dark:text-gray-400 appearance-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              {branches.length > 0 && (
                <div className="relative">
                  <select
                    value={auditBranch}
                    onChange={(e) => { setAuditBranch(e.target.value); setAuditPage(1); }}
                    className="h-10 pl-4 pr-8 rounded-xl input-premium text-gray-600 dark:text-gray-400 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={auditDateFrom}
                    onChange={(e) => { setAuditDateFrom(e.target.value); setAuditPage(1); }}
                    className="h-10 pl-9 pr-3 rounded-xl input-premium text-gray-600 dark:text-gray-400 cursor-pointer"
                    placeholder="From"
                    title="From date"
                  />
                </div>
                <span className="text-gray-400 text-sm">to</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={auditDateTo}
                    onChange={(e) => { setAuditDateTo(e.target.value); setAuditPage(1); }}
                    className="h-10 pl-9 pr-3 rounded-xl input-premium text-gray-600 dark:text-gray-400 cursor-pointer"
                    placeholder="To"
                    title="To date"
                  />
                </div>
                {(auditDateFrom || auditDateTo) && (
                  <button
                    onClick={() => { setAuditDateFrom(""); setAuditDateTo(""); setAuditPage(1); }}
                    className="h-10 px-3 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Clear dates"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 btn-primary text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
        </div>
      </motion.div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit overflow-x-auto">
        {([
          { id: "charts" as ViewTab, label: "Charts", icon: BarChart3 },
          { id: "vendors" as ViewTab, label: "Vendors", icon: Store },
          { id: "audit" as ViewTab, label: "Audit Report", icon: ScrollText },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setViewTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewTab === t.id ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {viewTab === "charts" && (<>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        {[
          { title: "Total Spending", value: formatCurrency(data.summary.totalAmount), icon: DollarSign, gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-500/20" },
          { title: "Average Expense", value: formatCurrency(data.summary.avgAmount), icon: TrendingUp, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/20" },
          { title: "Total Expenses", value: String(data.summary.totalCount), icon: Receipt, gradient: "from-purple-500 to-pink-500", shadow: "shadow-purple-500/20" },
        ].map((stat) => (
          <motion.div
            key={stat.title}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden premium-card p-4 lg:p-5 shadow-sm ${stat.shadow}`}
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
          className="premium-card p-4 lg:p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Trend</h3>
          </div>
          {data.monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#03D47C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#03D47C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                  labelFormatter={(label) => formatMonth(String(label))}
                />
                <Area type="monotone" dataKey="amount" stroke="#03D47C" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Category Breakdown - Pie Chart */}
        <motion.div
          variants={itemVariants}
          className="premium-card p-4 lg:p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-emerald-500" />
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
          className="premium-card p-4 lg:p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Category Spending</h3>
          </div>
          {data.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => formatCurrency(v)} />
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
          <div className="premium-card p-4 lg:p-6">
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
            <div className="premium-card p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Spenders</h3>
              </div>
              <div className="space-y-3">
                {data.topSpenders.slice(0, 5).map((spender, i) => (
                  <div key={spender.userId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
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
      </>)}

      {/* Vendor Spending Report */}
      {viewTab === "vendors" && (
        <div className="space-y-6">
          {/* Vendor Summary Cards */}
          {data.vendorBreakdown && data.vendorBreakdown.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              <motion.div variants={itemVariants} className="premium-card p-4 lg:p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data.vendorBreakdown.length}</p>
              </motion.div>
              <motion.div variants={itemVariants} className="premium-card p-4 lg:p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Top Vendor Spend</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(data.vendorBreakdown[0]?.total || 0)}</p>
                <p className="text-xs text-gray-400 mt-1">{data.vendorBreakdown[0]?.vendor}</p>
              </motion.div>
              <motion.div variants={itemVariants} className="premium-card p-4 lg:p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Vendor Transactions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.vendorBreakdown.reduce((sum, v) => sum + v.count, 0)}
                </p>
              </motion.div>
            </div>
          )}

          {/* Vendor Bar Chart - Top 10 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="premium-card p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-6">
                <Store className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Vendors by Spend</h3>
              </div>
              {(!data.vendorBreakdown || data.vendorBreakdown.length === 0) ? (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No vendor data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(280, Math.min(data.vendorBreakdown.length, 10) * 40)}>
                  <BarChart data={data.vendorBreakdown.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis dataKey="vendor" type="category" width={120} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                      formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                      {data.vendorBreakdown.slice(0, 10).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Vendor Frequency Pie */}
            <motion.div variants={itemVariants} className="premium-card p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Vendor Share</h3>
              </div>
              {(!data.vendorBreakdown || data.vendorBreakdown.length === 0) ? (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No vendor data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.vendorBreakdown.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="vendor"
                    >
                      {data.vendorBreakdown.slice(0, 8).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                      formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Full Vendor Table */}
          <motion.div variants={itemVariants} className="premium-card p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-6">
              <Store className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Vendors</h3>
            </div>
            {(!data.vendorBreakdown || data.vendorBreakdown.length === 0) ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No vendor data for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">#</th>
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Vendor</th>
                      <th className="text-right py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Total Spent</th>
                      <th className="text-right py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Transactions</th>
                      <th className="text-right py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Avg. Amount</th>
                      <th className="text-right py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendorBreakdown.map((v, i) => {
                      const totalVendorSpend = data.vendorBreakdown.reduce((sum, vv) => sum + vv.total, 0);
                      const pct = totalVendorSpend > 0 ? ((v.total / totalVendorSpend) * 100).toFixed(1) : "0";
                      return (
                        <tr key={v.vendor} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="py-3 px-3 text-gray-400">{i + 1}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                {v.vendor.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{v.vendor}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(v.total)}</td>
                          <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">{v.count}</td>
                          <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(v.avgAmount)}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Audit Report View */}
      {viewTab === "audit" && (
        <div className="space-y-4">
          {auditLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : auditExpenses.length === 0 ? (
            <div className="premium-card p-16 text-center">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No expenses found</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">{auditTotal} expenses found</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Expense</th>
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Submitted By</th>
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Category</th>
                      <th className="text-right py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Reviewed By</th>
                      <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">Receipt</th>
                      <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditExpenses.map((exp) => {
                      const StatusIcon = statusIcons[exp.status] || FileEdit;
                      return (
                        <tr key={exp.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-900 dark:text-white">{exp.title}</p>
                            {exp.vendor && <p className="text-xs text-gray-400">{exp.vendor}</p>}
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{exp.user.firstName} {exp.user.lastName}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{exp.category}</td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(exp.amount, exp.currency)}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColors[exp.status] || ""}`}>
                              <StatusIcon className="w-3 h-3" />
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                            {exp.approvedBy ? `${exp.approvedBy.firstName} ${exp.approvedBy.lastName}` : "\u2014"}
                            {exp.rejectionReason && (
                              <p className="text-xs text-red-400 truncate max-w-[150px]" title={exp.rejectionReason}>{exp.rejectionReason}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {(exp.receiptPath || exp.receiptUrl) ? (
                              <span className="inline-flex items-center gap-1 text-green-500 text-xs"><Receipt className="w-3.5 h-3.5" /> Yes</span>
                            ) : (
                              <span className="text-gray-400 text-xs">No</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Link href={`/dashboard/expenses/${exp.id}`}>
                              <button className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {auditTotal > 20 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">Page {auditPage} of {Math.ceil(auditTotal / 20)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
                      disabled={auditPage === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAuditPage(auditPage + 1)}
                      disabled={auditPage >= Math.ceil(auditTotal / 20)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
