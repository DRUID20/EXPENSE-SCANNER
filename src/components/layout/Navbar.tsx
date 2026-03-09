"use client";

import { Search, Menu } from "lucide-react";

import { NotificationBell } from "@/components/ui/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-14 lg:h-16 bg-white/80 dark:bg-[#072419]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-500 active:scale-95 transition-transform"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <motion.div
          animate={{ width: searchOpen ? 220 : 36 }}
          className="relative h-9 flex items-center"
        >
          {searchOpen && (
            <motion.input
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="text"
              placeholder="Search expenses..."
              className="w-full h-full pl-9 pr-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              onBlur={() => setSearchOpen(false)}
              autoFocus
            />
          )}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="absolute left-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </motion.div>

        <NotificationBell />
      </div>
    </header>
  );
}
