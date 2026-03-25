"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, X, CheckCircle2, XCircle, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  EXPENSE_APPROVED: "bg-green-500",
  EXPENSE_REJECTED: "bg-red-500",
  EXPENSE_SUBMITTED: "bg-blue-500",
};

const typeIcons: Record<string, React.ElementType> = {
  EXPENSE_APPROVED: CheckCircle2,
  EXPENSE_REJECTED: XCircle,
  EXPENSE_SUBMITTED: FileText,
};

const toastColors: Record<string, string> = {
  EXPENSE_APPROVED: "border-green-500 bg-green-50 dark:bg-green-950/40",
  EXPENSE_REJECTED: "border-red-500 bg-red-50 dark:bg-red-950/40",
  EXPENSE_SUBMITTED: "border-blue-500 bg-blue-50 dark:bg-blue-950/40",
};

const toastIconColors: Record<string, string> = {
  EXPENSE_APPROVED: "text-green-500",
  EXPENSE_REJECTED: "text-red-500",
  EXPENSE_SUBMITTED: "text-blue-500",
};

// Play notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available
  }
}

// Request browser notification permission
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// Show browser notification (for background tabs)
function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    new Notification(title, {
      body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
    });
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(0);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auto-dismiss toasts after 5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.ok) {
        const newNotifications: Notification[] = data.notifications;
        const newUnread: number = data.unreadCount;

        // Detect genuinely new notifications (not on first load)
        if (!isFirstLoad.current && newUnread > prevUnreadRef.current) {
          const prevIds = prevIdsRef.current;
          const brandNew = newNotifications.filter(
            (n) => !n.isRead && !prevIds.has(n.id)
          );

          if (brandNew.length > 0) {
            playNotificationSound();
            // Show toast for the newest notification
            setToasts((prev) => [...prev, ...brandNew.slice(0, 3)]);
            // Browser notification for background tab
            const latest = brandNew[0];
            showBrowserNotification(latest.title, latest.message);
          }
        }

        isFirstLoad.current = false;
        prevUnreadRef.current = newUnread;
        prevIdsRef.current = new Set(newNotifications.map((n) => n.id));
        setNotifications(newNotifications);
        setUnreadCount(newUnread);
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    try {
      // Optimistically update UI
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      // Re-fetch to stay in sync with server
      fetchNotifications();
    } catch {
      // Silently fail
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      // Optimistically update UI immediately
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      prevUnreadRef.current = newCount;

      // Persist to server, then re-fetch to stay in sync
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      fetchNotifications();
    }
    if (n.linkUrl) {
      window.location.href = n.linkUrl;
    }
    setOpen(false);
  };

  return (
    <>
      {/* Toast notification bar - fixed at top of screen */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 pt-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = typeIcons[toast.type] || Bell;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg shadow-black/10 backdrop-blur-sm max-w-md w-[90vw] sm:w-auto ${toastColors[toast.type] || "border-gray-500 bg-gray-50 dark:bg-gray-900"}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${toastIconColors[toast.type] || "text-gray-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {toast.title}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bell button and dropdown */}
      <div ref={ref} className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(!open)}
          className="relative w-9 h-9 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
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
              className="absolute right-0 top-11 w-80 max-h-96 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl shadow-black/[0.12] overflow-hidden z-50"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <h4 className="font-semibold text-[var(--foreground)] text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-600 font-medium"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto max-h-72">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications</p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left p-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.isRead ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[n.type] || "bg-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.isRead ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{n.message}</p>
                          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                            {formatDate(n.createdAt)}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
