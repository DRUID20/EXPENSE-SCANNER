"use client";

import { motion } from "framer-motion";
import { ClipboardCheck } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Approvals</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Review and approve expense submissions from your team
      </p>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <ClipboardCheck className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No pending approvals
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            There are no expenses waiting for your review right now.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
