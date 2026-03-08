"use client";

import { motion } from "framer-motion";
import { Receipt, Plus, Filter, Search } from "lucide-react";

export default function ExpensesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage all your expense submissions
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-4 h-4" />
          New Expense
        </motion.button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 hover:border-orange-300 transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Empty State */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No expenses found
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            You haven&apos;t submitted any expenses yet. Click &quot;New Expense&quot; or scan a receipt to get started.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
