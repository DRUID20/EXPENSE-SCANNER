"use client";

import { Bell, Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";

export function Navbar() {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button className="lg:hidden w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <motion.div
          animate={{ width: searchOpen ? 240 : 40 }}
          className="relative h-10 flex items-center"
        >
          {searchOpen && (
            <motion.input
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="text"
              placeholder="Search expenses..."
              className="w-full h-full pl-10 pr-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              onBlur={() => setSearchOpen(false)}
              autoFocus
            />
          )}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="absolute left-0 w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
        </motion.button>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
