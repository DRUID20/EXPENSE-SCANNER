"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, CloudOff } from "lucide-react";
import { getSyncQueueCount } from "@/lib/pwa";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      setShowBanner(true);
      setTimeout(() => {
        setShowBanner(false);
        setJustReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      setOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check sync queue
    const checkQueue = async () => {
      const count = await getSyncQueueCount();
      setQueueCount(count);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Show persistent offline bar
  if (!online) {
    return (
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white"
      >
        <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>You&apos;re offline. Changes will sync when reconnected.</span>
          {queueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {queueCount} pending
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {showBanner && justReconnected && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <Wifi className="w-4 h-4" />
            <span>Back online! Syncing your data...</span>
          </div>
        </motion.div>
      )}

      {queueCount > 0 && !showBanner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-20 right-6 z-50"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium shadow-lg">
            <CloudOff className="w-3.5 h-3.5" />
            {queueCount} pending sync
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
