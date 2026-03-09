"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  ScanLine,
  ClipboardCheck,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { cn, getInitials } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { name: "Scan Receipt", href: "/dashboard/scan", icon: ScanLine, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { name: "My Expenses", href: "/dashboard/expenses", icon: Receipt, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { name: "Approvals", href: "/dashboard/approvals", icon: ClipboardCheck, roles: ["ADMIN", "MANAGER"] },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp, roles: ["ADMIN", "MANAGER"] },
  { name: "Team", href: "/dashboard/team", icon: Users, roles: ["ADMIN"] },
  { name: "Audit Log", href: "/dashboard/audit", icon: Shield, roles: ["ADMIN"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        <Logo collapsed={collapsed} />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-white")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
            {user ? getInitials(user.firstName, user.lastName) : "??"}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role === "ADMIN" ? "Administrator" : user?.role === "MANAGER" ? "Manager" : "Employee"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={logout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
