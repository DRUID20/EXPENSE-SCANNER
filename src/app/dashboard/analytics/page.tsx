"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analytics</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Spending trends, insights, and reports
      </p>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <TrendingUp className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analytics coming soon
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Beautiful charts and spending insights will be available in Phase 4.
          </p>
          <span className="mt-4 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-semibold">
            Phase 4
          </span>
        </div>
      </div>
    </motion.div>
  );
}
