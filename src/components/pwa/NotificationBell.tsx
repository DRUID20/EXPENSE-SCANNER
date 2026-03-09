"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  X,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestNotificationPermission } from "@/lib/pwa";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: "approved" | "rejected" | "pending" | "submitted";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  expenseId?: string;
}

const typeConfig = {
  approved: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100 dark:bg-green-950" },
  rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-950" },
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950" },
  submitted: { icon: Send, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950" },
};

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const panelRef = useRef<HTMLDivElement>(null);
  const lastCheckRef = useRef<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Check for expense status changes and generate notifications
  const checkForUpdates = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch("/api/expenses?limit=10&sortBy=updatedAt&sortOrder=desc");
      if (!res.ok) return;
      const data = await res.json();

      const newNotifications: Notification[] = [];
      const stored = JSON.parse(localStorage.getItem("expense-notifications") || "[]");
      const seenIds = new Set(stored.map((n: Notification) => n.id));

      for (const expense of data.expenses) {
        const notifId = `${expense.id}-${expense.status}-${expense.updatedAt}`;
        if (seenIds.has(notifId)) continue;

        // For employees: notify about their approved/rejected expenses
        if (expense.userId === user.id && expense.status === "APPROVED") {
          newNotifications.push({
            id: notifId,
            type: "approved",
            title: "Expense Approved",
            message: `"${expense.title}" has been approved.`,
            timestamp: expense.updatedAt,
            read: false,
            expenseId: expense.id,
          });
        }

        if (expense.userId === user.id && expense.status === "REJECTED") {
          newNotifications.push({
            id: notifId,
            type: "rejected",
            title: "Expense Rejected",
            message: `"${expense.title}" was rejected.`,
            timestamp: expense.updatedAt,
            read: false,
            expenseId: expense.id,
          });
        }

        // For managers/admins: notify about new pending expenses
        if (
          (user.role === "ADMIN" || user.role === "MANAGER") &&
          expense.userId !== user.id &&
          expense.status === "PENDING"
        ) {
          newNotifications.push({
            id: notifId,
            type: "pending",
            title: "New Pending Approval",
            message: `"${expense.title}" by ${expense.user?.firstName || "someone"} needs review.`,
            timestamp: expense.updatedAt,
            read: false,
            expenseId: expense.id,
          });
        }
      }

      if (newNotifications.length > 0) {
        const merged = [...newNotifications, ...stored].slice(0, 50);
        localStorage.setItem("expense-notifications", JSON.stringify(merged));
        setNotifications(merged);

        // Show push notification for the first new one
        if (permissionStatus === "granted" && newNotifications[0]) {
          const n = newNotifications[0];
          navigator.serviceWorker?.ready.then((reg) => {
            reg.showNotification(n.title, {
              body: n.message,
              icon: "/icons/icon-192.svg",
              badge: "/icons/icon-96.svg",
              tag: n.id,
              data: { url: `/dashboard/expenses/${n.expenseId}` },
            });
          });
        }
      }
    } catch {
      // Offline or error
    }
  }, [user, permissionStatus]);

  useEffect(() => {
    // Load stored notifications
    const stored = JSON.parse(localStorage.getItem("expense-notifications") || "[]");
    setNotifications(stored);

    // Check permission status
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }

    // Poll for updates every 30 seconds
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("expense-notifications", JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem("expense-notifications", "[]");
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setPermissionStatus(permission);
  };

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-orange-500" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 max-h-[480px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h4>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Enable notifications prompt */}
            {permissionStatus === "default" && (
              <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900">
                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      Enable push notifications?
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Get notified about approvals and updates.
                    </p>
                    <button
                      onClick={enableNotifications}
                      className="mt-1.5 text-xs text-orange-500 hover:text-orange-600 font-semibold"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[360px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You&apos;ll see updates here when expenses are approved or rejected.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const config = typeConfig[notif.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${
                        !notif.read ? "bg-orange-50/50 dark:bg-orange-950/10" : ""
                      }`}
                      onClick={() => {
                        if (notif.expenseId) {
                          window.location.href = `/dashboard/expenses/${notif.expenseId}`;
                        }
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">
                          {notif.title}
                          {!notif.read && (
                            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatDate(notif.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
