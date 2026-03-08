"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ScanLine,
  Plus,
  Fuel,
  Wrench,
  Plane,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const stats = [
  {
    title: "Total Expenses",
    value: "$0.00",
    change: "+0%",
    trend: "up",
    icon: DollarSign,
    gradient: "from-orange-500 to-amber-500",
    shadow: "shadow-orange-500/20",
  },
  {
    title: "Pending Approval",
    value: "0",
    change: "0 new",
    trend: "neutral",
    icon: Clock,
    gradient: "from-blue-500 to-cyan-500",
    shadow: "shadow-blue-500/20",
  },
  {
    title: "Approved",
    value: "0",
    change: "+0%",
    trend: "up",
    icon: CheckCircle2,
    gradient: "from-green-500 to-emerald-500",
    shadow: "shadow-green-500/20",
  },
  {
    title: "Rejected",
    value: "0",
    change: "0%",
    trend: "down",
    icon: XCircle,
    gradient: "from-red-500 to-rose-500",
    shadow: "shadow-red-500/20",
  },
];

const categories = [
  { name: "Fuel & Gas", icon: Fuel, amount: "$0", color: "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400" },
  { name: "Equipment", icon: Wrench, amount: "$0", color: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" },
  { name: "Travel", icon: Plane, amount: "$0", color: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400" },
  { name: "Supplies", icon: ShoppingCart, amount: "$0", color: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of your expense activity
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
          <Link href="/dashboard/expenses">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <motion.div
            key={stat.title}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm ${stat.shadow}`}
          >
            {/* Background gradient accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full -translate-y-8 translate-x-8`} />

            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stat.value}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                  ) : stat.trend === "down" ? (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  ) : null}
                  <span
                    className={`text-xs font-medium ${
                      stat.trend === "up"
                        ? "text-green-500"
                        : stat.trend === "down"
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-400">vs last month</span>
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
            <Link
              href="/dashboard/expenses"
              className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No expenses yet
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
              Start by scanning a receipt or manually adding your first expense to see it here.
            </p>
            <Link href="/dashboard/scan">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
              >
                <ScanLine className="w-4 h-4" />
                Scan Your First Receipt
              </motion.button>
            </Link>
          </div>
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

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {cat.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {cat.amount}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick action */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-3">
                {user?.role === "ADMIN"
                  ? "Company-wide spending overview"
                  : "Your personal spending breakdown"}
              </p>
              <Link
                href="/dashboard/analytics"
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                View Analytics →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Scan Receipt",
              desc: "Use AI to extract expense data from a photo",
              icon: ScanLine,
              href: "/dashboard/scan",
              gradient: "from-orange-500 to-amber-500",
            },
            {
              title: "Add Manually",
              desc: "Enter expense details by hand",
              icon: Plus,
              href: "/dashboard/expenses",
              gradient: "from-blue-500 to-cyan-500",
            },
            {
              title: "View Reports",
              desc: "See spending trends and analytics",
              icon: TrendingUp,
              href: "/dashboard/analytics",
              gradient: "from-purple-500 to-pink-500",
            },
          ].map((action) => (
            <Link key={action.title} href={action.href}>
              <motion.div
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg mb-4`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
                  {action.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {action.desc}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
