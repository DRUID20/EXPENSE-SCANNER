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
    <header
      className="h-14 lg:h-16 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30"
      style={{ background: "var(--glass-bg)", borderBottom: "1px solid var(--card-border)" }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "var(--accent-soft)", color: "var(--muted)" }}
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-[15px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>
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
              className="w-full h-full pl-9 pr-3 rounded-xl border-none text-sm focus:outline-none"
              style={{ background: "var(--subtle)", color: "var(--foreground)", boxShadow: `0 0 0 2px var(--accent-soft)` }}
              onBlur={() => setSearchOpen(false)}
              autoFocus
            />
          )}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="absolute left-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <Search className="w-4 h-4" />
          </button>
        </motion.div>

        <NotificationBell />
      </div>
    </header>
  );
}
