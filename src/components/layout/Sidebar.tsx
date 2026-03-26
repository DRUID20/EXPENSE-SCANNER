"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { cn, getInitials } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "EMPLOYEE"] },
  { name: "Scan Receipt", href: "/dashboard/scan", icon: ScanLine, roles: ["ADMIN", "EMPLOYEE"] },
  { name: "My Expenses", href: "/dashboard/expenses", icon: Receipt, roles: ["ADMIN", "EMPLOYEE"] },
  { name: "Approvals", href: "/dashboard/approvals", icon: ClipboardCheck, roles: ["ADMIN"] },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp, roles: ["ADMIN"] },
  { name: "Team", href: "/dashboard/team", icon: Users, roles: ["ADMIN"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "EMPLOYEE"] },
];

// Bottom navigation for mobile (max 5 items)
const mobileNav = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "EMPLOYEE"] },
  { name: "Expenses", href: "/dashboard/expenses", icon: Receipt, roles: ["ADMIN", "EMPLOYEE"] },
  { name: "Scan", href: "/dashboard/scan", icon: ScanLine, roles: ["ADMIN", "EMPLOYEE"], primary: true },
  { name: "Approvals", href: "/dashboard/approvals", icon: ClipboardCheck, roles: ["ADMIN"] },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp, roles: ["ADMIN"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "EMPLOYEE"] },
];

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const filteredMobileNav = mobileNav
    .filter((item) => user && item.roles.includes(user.role))
    .slice(0, 5);

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="hidden lg:flex fixed left-0 top-0 h-screen backdrop-blur-xl z-40 flex-col"
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4">
          <Logo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-[var(--accent)] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative",
                    isActive
                      ? "text-white shadow-md"
                      : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                  )}
                  style={isActive ? { background: "var(--accent)", boxShadow: `0 4px 6px -1px var(--nav-active-shadow)` } : undefined}
                >
                  <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300")} />
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
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-white/[0.06] p-3">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="relative flex-shrink-0">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-hover))` }}>
                  {user ? getInitials(user.firstName, user.lastName) : "??"}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--sidebar-bg)]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {user?.role === "ADMIN" ? "Administrator" : "Employee"}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-950/50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-[280px] z-50 flex flex-col shadow-2xl"
              style={{ background: "var(--sidebar-bg)" }}
            >
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4">
                <Logo collapsed={false} />
                <button
                  onClick={onMobileClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Links */}
              <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
                {filteredNav.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link key={item.name} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                          isActive
                            ? "text-white shadow-md"
                            : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                        )}
                        style={isActive ? { background: "var(--accent)", boxShadow: `0 4px 6px -1px var(--nav-active-shadow)` } : undefined}
                      >
                        <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-gray-400")} />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* User Profile */}
              <div className="border-t border-white/[0.06] p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-hover))` }}>
                        {user ? getInitials(user.firstName, user.lastName) : "??"}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--sidebar-bg)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-950/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl pb-safe" style={{ background: "var(--mobile-bar-bg)", borderTop: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-around px-2 h-16">
          {filteredMobileNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const isPrimary = item.primary;

            if (isPrimary) {
              return (
                <Link key={item.name} href={item.href} className="flex flex-col items-center -mt-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-hover))`, boxShadow: `0 10px 15px -3px var(--nav-active-shadow)` }}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--accent)" }}>{item.name}</span>
                </Link>
              );
            }

            return (
              <Link key={item.name} href={item.href} className="flex flex-col items-center gap-0.5 py-1.5 min-w-[3.5rem]">
                <item.icon className={cn("w-5 h-5 transition-colors", !isActive && "text-[var(--muted)]")} style={isActive ? { color: "var(--accent)" } : undefined} />
                <span className={cn("text-[10px] font-medium transition-colors", !isActive && "text-[var(--muted)]")} style={isActive ? { color: "var(--accent)" } : undefined}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 h-0.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
