"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Team Management</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Manage team members, roles, and departments
      </p>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Team management coming soon
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Invite members, assign roles, and manage departments in Phase 6.
          </p>
          <span className="mt-4 px-4 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
            Phase 6
          </span>
        </div>
      </div>
    </motion.div>
  );
}
